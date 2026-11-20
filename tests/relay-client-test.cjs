const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/../relay-client.js','utf8');
const rooms=new Map();
class FakeSocket {
 static OPEN=1;
 constructor(url){this.url=url;this.readyState=0;this.role=new URL(url).searchParams.get('role');this.code=new URL(url).pathname.split('/').pop();this.messages=[];const state=rooms.get(this.code)||{host:null,players:[]};rooms.set(this.code,state);this.state=state;
   if(this.role==='host'){state.host=this}else{state.players.push(this);this.id='mock-player-'+state.players.length}
   setTimeout(()=>{this.readyState=1;this.onmessage?.({data:JSON.stringify({relay:'ready',role:this.role})})},0);
 }
 send(text){const m=JSON.parse(text);const state=this.state;
   if(this.role==='player'){
     if(m.data?.type==='join'){
       state.host?.onmessage?.({data:JSON.stringify({relay:'new-player',id:this.id})});
       state.host?.onmessage?.({data:JSON.stringify({relay:'to-host',id:this.id,data:m.data})});
     }else state.host?.onmessage?.({data:JSON.stringify({relay:'to-host',id:this.id,data:m.data})});
   }else if(m.target){const target=state.players.find(p=>p.id===m.target);target?.onmessage?.({data:JSON.stringify({relay:'to-player',data:m.data})})}
 }
 close(){this.readyState=3;this.onclose?.()}
}
const ctx={window:{},location:{protocol:'https:',host:'duel-arena-test.workers.dev'},WebSocket:FakeSocket,URL,console,queueMicrotask,AbortSignal,fetch:async()=>({ok:true,json:async()=>({ok:true,transport:'Cloudflare Durable Objects WebSocket'})})};
vm.createContext(ctx);vm.runInContext(src+';globalThis.RelayPeer=DuelRoomPeer;',ctx);
(async()=>{
 await ctx.loadPeerLib();
 assert.equal(ctx.window.Peer,ctx.RelayPeer);
 let hostReady=false,welcome=false,gotPass=false;
 const host=new ctx.window.Peer('duel-arena-ro-ABCDEF');
 host.on('open',()=>{hostReady=true});
 host.on('connection',conn=>{
  conn.on('data',data=>{
    if(data.type==='join')conn.send({type:'welcome',role:'A'});
    if(data.action==='pass')gotPass=true;
  });
 });
 await new Promise(r=>setTimeout(r,10));assert(hostReady);
 const player=new ctx.window.Peer();
 player.on('open',()=>{
  const conn=player.connect('duel-arena-ro-ABCDEF');
  conn.on('open',()=>conn.send({type:'join',name:'Simulat'}));
  conn.on('data',msg=>{if(msg.type==='welcome'){welcome=true;conn.send({type:'action',action:'pass'})}})
 });
 await new Promise(r=>setTimeout(r,50));
 assert(welcome,'Player got welcome');assert(gotPass,'Host got player pass');
 console.log('Client Relay mock tests PASSED: host room, join from a second client, welcome and pass across relay.');
 host.destroy();player.destroy();
})().catch(e=>{console.error(e);process.exit(1)});
