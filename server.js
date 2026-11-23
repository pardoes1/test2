const https = require("https");
const fs = require("fs");
const path = require("path");
const os = require("os");
const WebSocket = require("ws");

const PORT = Number(process.env.PORT || 8443);
const CERT = process.env.TLS_CERT || path.join(__dirname, "cert.pem");
const KEY = process.env.TLS_KEY || path.join(__dirname, "key.pem");
if (!fs.existsSync(CERT) || !fs.existsSync(KEY)) {
  console.error("TLS certificate missing. See README.md for mkcert setup.");
  process.exit(1);
}
const server = https.createServer({
  cert: fs.readFileSync(CERT),
  key: fs.readFileSync(KEY)
}, (req, res) => {
  const pathname = new URL(req.url, "https://localhost").pathname;
  if (pathname === "/" || pathname === "/index.html") {
    res.writeHead(200, {"content-type":"text/html; charset=utf-8","cache-control":"no-store"});
    fs.createReadStream(path.join(__dirname,"index.html")).pipe(res);
  } else {
    res.writeHead(404, {"content-type":"text/plain"}); res.end("Not found");
  }
});
const wss = new WebSocket.Server({server});
const clients = new Map(); // ws -> {id, name, room}
const rooms = new Map();   // room -> {members:Set<ws>, activeSharer:string|null}
let nextId = 1;
const send = (ws,obj) => { if(ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify(obj)); };
const broadcast = (room,obj,except=null) => {
  const r=rooms.get(room); if(!r)return;
  for(const ws of r.members) if(ws!==except) send(ws,obj);
};
function leave(ws) {
  const c=clients.get(ws); if(!c)return;
  const r=rooms.get(c.room);
  if(r) {
    r.members.delete(ws);
    if(r.activeSharer===c.id) { r.activeSharer=null; broadcast(c.room,{type:"share-stopped",id:c.id}); }
    broadcast(c.room,{type:"peer-left",id:c.id});
    if(!r.members.size) rooms.delete(c.room);
  }
  clients.delete(ws);
}
wss.on("connection", ws => {
  ws.on("message", raw => {
    let m; try { m=JSON.parse(raw.toString()); } catch { return; }
    if(m.type==="join") {
      if(clients.has(ws)) return;
      const room=String(m.room||"").trim().slice(0,32);
      const name=String(m.name||"Laptop").trim().slice(0,32);
      if(!room){send(ws,{type:"error",message:"A room code is required."});return;}
      const id=String(nextId++);
      if(!rooms.has(room)) rooms.set(room,{members:new Set(),activeSharer:null});
      const r=rooms.get(room);
      const peers=[...r.members].map(member=>{const p=clients.get(member);return {id:p.id,name:p.name};});
      clients.set(ws,{id,name,room}); r.members.add(ws);
      send(ws,{type:"joined",id,peers,activeSharer:r.activeSharer});
      broadcast(room,{type:"peer-joined",peer:{id,name}},ws);
    } else {
      const c=clients.get(ws); if(!c)return;
      const r=rooms.get(c.room); if(!r)return;
      if(m.type==="signal") {
        const target=[...r.members].find(member=>clients.get(member)?.id===String(m.to));
        if(target) send(target,{type:"signal",from:c.id,data:m.data});
      } else if(m.type==="start-share") {
        if(r.activeSharer && r.activeSharer!==c.id) send(ws,{type:"share-denied"});
        else {r.activeSharer=c.id;broadcast(c.room,{type:"share-started",id:c.id,name:c.name});}
      } else if(m.type==="stop-share" && r.activeSharer===c.id) {
        r.activeSharer=null;broadcast(c.room,{type:"share-stopped",id:c.id});
      } else if(m.type==="leave") leave(ws);
    }
  });
  ws.on("close",()=>leave(ws));
});
server.listen(PORT,"0.0.0.0",()=>{
  const nets=os.networkInterfaces(), ips=[];
  for(const list of Object.values(nets)) for(const n of (list||[])) if(n.family==="IPv4"&&!n.internal) ips.push(n.address);
  console.log(`LAN Screen Share listening on https://localhost:${PORT}`);
  ips.forEach(ip=>console.log(`On other laptops: https://${ip}:${PORT}`));
  console.log("Keep this terminal open while using the dashboard.");
});
