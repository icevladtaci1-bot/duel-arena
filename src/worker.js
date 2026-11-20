import { DurableObject } from 'cloudflare:workers';

const CODE_PATTERN=/^[A-HJ-NP-Z2-9]{6}$/;
function send(ws,obj){try{ws.send(JSON.stringify(obj))}catch{}}
function meta(ws){return ws.deserializeAttachment()||{}}

export class GameRoom extends DurableObject {
 constructor(ctx,env){super(ctx,env)}
 connections(){return this.ctx.getWebSockets()}
 host(){return this.connections().find(ws=>meta(ws).role==='host')}
 player(id){return this.connections().find(ws=>meta(ws).role==='player' && meta(ws).id===id)}
 async fetch(request){
   if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});
   const url=new URL(request.url);const role=url.searchParams.get('role');
   if(role!=='host'&&role!=='player')return new Response('Invalid role',{status:400});
   if(role==='host'&&this.host())return new Response('Camera este deja folosită',{status:409});
   if(role==='player'&&!this.host())return new Response('Camera nu există sau arbitrul a ieșit',{status:404});
   if(role==='player'&&this.connections().filter(ws=>meta(ws).role==='player').length>=2)return new Response('Camera este plină',{status:409});
   const pair=new WebSocketPair();const [client,server]=Object.values(pair);
   const id=role==='host'?'host':crypto.randomUUID();
   this.ctx.acceptWebSocket(server);
   server.serializeAttachment({role,id,joined:false});
   if(role==='host')send(server,{relay:'ready',role:'host'});
   else send(server,{relay:'ready',role:'player',id});
   return new Response(null,{status:101,webSocket:client});
 }
 async webSocketMessage(ws,message){
   if(typeof message!=='string'||message.length>130000)return;
   let m;try{m=JSON.parse(message)}catch{return}
   const info=meta(ws);
   if(info.role==='host'){
      if(m.type==='relay-data'&&typeof m.target==='string'&&m.data&&typeof m.data==='object'){
        const receiver=this.player(m.target);
        if(receiver)send(receiver,{relay:'to-player',data:m.data});
      }
   }else if(info.role==='player'){
      const host=this.host();if(!host)return;
      if(m.type==='relay-data'&&m.data&&typeof m.data==='object'){
       if(m.data.type==='join'){
        if(!info.joined){ws.serializeAttachment({...info,joined:true});send(host,{relay:'new-player',id:info.id});}
        const name=String(m.data.name||'Jucător').slice(0,26);
        send(host,{relay:'to-host',id:info.id,data:{type:'join',name}});
       }else if(info.joined&&((m.data.type==='action'&&m.data.action==='pass')||m.data.type==='image-error')){
        send(host,{relay:'to-host',id:info.id,data:m.data});
       }
      }
   }
 }
 async webSocketClose(ws,code,reason){
   const info=meta(ws);
   if(info.role==='host'){
     for(const other of this.connections())if(other!==ws){send(other,{relay:'host-left'});try{other.close(1000,'Arbitrul a ieșit')}catch{}}
   }else{
     const host=this.host();if(host)send(host,{relay:'player-left',id:info.id});
   }
   try{ws.close(1000,'Closed')}catch{}
 }
 async webSocketError(ws){try{ws.close()}catch{}}
}

export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/api/status')return new Response(JSON.stringify({ok:true,transport:'Cloudflare Durable Objects WebSocket',version:12}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  if(url.pathname.startsWith('/api/room/')){
   const code=url.pathname.substring('/api/room/'.length).toUpperCase();
   if(!CODE_PATTERN.test(code))return new Response('Cod invalid',{status:400});
   if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});
   return env.GAME_ROOMS.getByName(code).fetch(request);
  }
  return env.ASSETS.fetch(request);
 }
};
