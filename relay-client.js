// DUEL ARENA V12: transport de camere prin server WebSocket Cloudflare.
// Pastreaza interfata PeerJS folosita de ecranele existente, dar mesajele
// sunt transmise prin relay (nu direct intre retelele telefoanelor).
class DuelEvents {
  constructor(){this._listeners=new Map()}
  on(type,cb){if(!this._listeners.has(type))this._listeners.set(type,[]);this._listeners.get(type).push(cb);return this}
  _emit(type,...values){for(const fn of this._listeners.get(type)||[])try{fn(...values)}catch(e){console.error(e)}}
}
class DuelRoomConnection extends DuelEvents {
 constructor(peer,id,player=false){super();this.peer=peer;this.id=id;this.open=false;this.isPlayer=player}
 send(data){if(!this.open||this.peer._ws?.readyState!==WebSocket.OPEN)return;this.peer._ws.send(JSON.stringify({type:'relay-data',...(this.isPlayer?{}:{target:this.id}),data}))}
 _disconnect(){if(!this.open)return;this.open=false;this._emit('close')}
 close(){this._disconnect();if(this.isPlayer)try{this.peer._ws?.close(1000,'Ieșire')}catch(e){}}
}
class DuelRoomPeer extends DuelEvents {
 constructor(id){super();this._ws=null;this._connections=new Map();this._closed=false;this._isHost=typeof id==='string';this.id=id||'player';
  if(this._isHost){const code=String(id).replace(/^duel-arena-ro-/,'');this._startSocket(code,'host');}
  else queueMicrotask(()=>{if(!this._closed)this._emit('open',this.id)})
 }
 _startSocket(code,role,conn){
  const wsUrl=`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/api/room/${encodeURIComponent(code)}?role=${role}`;
  const ws=new WebSocket(wsUrl);this._ws=ws;let started=false;
  ws.onmessage=e=>{
    let m;try{m=JSON.parse(e.data)}catch{return}
    if(m.relay==='ready'){
      started=true;
      if(role==='host')this._emit('open',this.id);
      else if(conn){conn.open=true;conn._emit('open')}
    }else if(m.relay==='new-player'&&role==='host'){
      if(this._connections.has(m.id))return;
      const p=new DuelRoomConnection(this,m.id,false);p.open=true;this._connections.set(m.id,p);this._emit('connection',p);
    }else if(m.relay==='to-host'&&role==='host'){
      const p=this._connections.get(m.id);if(p)p._emit('data',m.data);
    }else if(m.relay==='to-player'&&role==='player'){
      conn?._emit('data',m.data);
    }else if(m.relay==='player-left'&&role==='host'){
      const p=this._connections.get(m.id);if(p){p._disconnect();this._connections.delete(m.id)}
    }else if(m.relay==='host-left'&&role==='player'){
      conn?._disconnect();
    }
  };
  ws.onerror=()=>{if(!this._closed){const type=role==='host'?'unavailable-id':'peer-unavailable';this._emit('error',{type,message:'Serverul de camere nu răspunde'})}if(conn&&!started)conn._emit('error')};
  ws.onclose=()=>{if(this._closed)return;for(const p of this._connections.values())p._disconnect();if(conn)conn._disconnect();if(started)this._emit('disconnected');else this._emit('error',{type:role==='host'?'unavailable-id':'peer-unavailable'})};
  return ws;
 }
 connect(id){const code=String(id).replace(/^duel-arena-ro-/,'');const conn=new DuelRoomConnection(this,code,true);this._startSocket(code,'player',conn);return conn}
 reconnect(){/* pagina trebuie redeschisa pentru reconectare controlata */}
 destroy(){this._closed=true;for(const p of this._connections.values())p._disconnect();this._connections.clear();try{this._ws?.close(1000,'Ieșire')}catch(e){}}
}
async function loadPeerLib(){
 if(window.Peer===DuelRoomPeer)return;
 if(location.protocol==='file:')throw Error('Modul cu 3 telefoane trebuie publicat pe Cloudflare Workers. Fișierul local este doar pentru modul pe un telefon.');
 let res;try{res=await fetch('/api/status',{cache:'no-store',signal:AbortSignal.timeout(7000)})}catch(e){throw Error('Serverul de camere nu este accesibil. Publică pachetul V12 complet pe Cloudflare Workers.')}
 if(!res.ok)throw Error('Site-ul nu are serverul de camere V12. Netlify Drop publică doar HTML-ul; pentru joc pe rețele diferite, folosește Cloudflare Workers conform instrucțiunilor din ZIP.');
 let data;try{data=await res.json()}catch(e){}
 if(!data?.ok||data.transport!=='Cloudflare Durable Objects WebSocket')throw Error('Acest site nu are serverul de camere V12.');
 window.Peer=DuelRoomPeer;
}
