const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(__dirname+'/../src/worker.js','utf8').replace("import { DurableObject } from 'cloudflare:workers';",'').replace('export class GameRoom','class GameRoom').replace('export default {','const workerDefault = {');
class FakeSocket {
 constructor(){this.messages=[];this.attachment={};this.closed=false}
 serializeAttachment(v){this.attachment=v}
 deserializeAttachment(){return this.attachment}
 send(text){this.messages.push(JSON.parse(text))}
 close(){this.closed=true}
}
class FakePair {constructor(){this[0]=new FakeSocket();this[1]=new FakeSocket()}}
class FakeResponse {constructor(body,opts={}){this.body=body;this.status=opts.status||200;this.webSocket=opts.webSocket;this.headers=opts.headers||{}}}
class FakeDurableObject{constructor(ctx,env){this.ctx=ctx;this.env=env}}
const ctx={ss:[],getWebSockets(){return this.ss.filter(x=>!x.closed)},acceptWebSocket(ws){this.ss.push(ws)}};
const mock={DurableObject:FakeDurableObject,WebSocketPair:FakePair,Response:FakeResponse,console,crypto,URL,JSON};
vm.createContext(mock);vm.runInContext(source+';globalThis.GameRoom=GameRoom;globalThis.workerDefault=workerDefault;',mock);
function req(role){return {headers:{get(k){return k==='Upgrade'?'websocket':null}},url:'https://quiz.example/api/room/ABCDEF?role='+role}}
(async()=>{
 const room=new mock.GameRoom(ctx,{});
 assert.equal((await room.fetch(req('player'))).status,404,'Cannot join without host');
 assert.equal((await room.fetch(req('host'))).status,101);
 assert.equal((await room.fetch(req('host'))).status,409,'Host cannot be overwritten');
 assert.equal((await room.fetch(req('player'))).status,101);
 assert.equal((await room.fetch(req('player'))).status,101);
 assert.equal((await room.fetch(req('player'))).status,409,'Third player rejected');
 const host=ctx.ss.find(x=>x.attachment.role==='host'),players=ctx.ss.filter(x=>x.attachment.role==='player');
 await room.webSocketMessage(players[0],JSON.stringify({type:'relay-data',data:{type:'join',name:'Test 1'}}));
 assert(host.messages.some(x=>x.relay==='new-player'));
 assert(host.messages.some(x=>x.relay==='to-host'&&x.data.type==='join'));
 await room.webSocketMessage(host,JSON.stringify({type:'relay-data',target:players[0].attachment.id,data:{type:'welcome',role:'A'}}));
 assert(players[0].messages.some(x=>x.relay==='to-player'&&x.data.type==='welcome'));
 await room.webSocketMessage(players[0],JSON.stringify({type:'relay-data',data:{type:'state',state:{card:'cheating'}}}));
 assert(!host.messages.some(x=>x.data?.type==='state'),'Players cannot forge game state');
 await room.webSocketMessage(players[0],JSON.stringify({type:'relay-data',data:{type:'action',action:'pass'}}));
 assert(host.messages.some(x=>x.data?.action==='pass'),'Pass forwarded');
 console.log('Cloudflare Relay unit tests PASSED: host 1, players 2, third denied, join, welcome, pass and role security.');
})().catch(e=>{console.error(e);process.exit(1)});
