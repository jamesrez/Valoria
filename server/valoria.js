const isLocal = process.env.PORT ? false : true;
const http = require('http');
const fs = require('fs');
const fsPromises = require("fs/promises");
const URL = require('url').URL;
const express = require('express');
const Port = process.env.PORT || 3000;
const crypto = require('crypto');
const subtle = crypto.webcrypto.subtle;
const WebSocket = require('ws');
const axios = require('axios');
const cors = require('cors');

class Valoria {
  constructor(port){
    const self = this;
    this.servers = isLocal ? ["http://localhost:3000/", "http://localhost:3001/"] : ["https://www.valoria.live/"]
    this.groups = [];
    this.worlds = {};
    this.accounts = {};
    this.conns = {};
    this.peers = {};
    this.promises = {};
    this.verifying = {};
    this.verificationKeys = {};
    require('./events/events')(this);
    this.app = express();
    this.port = port;
    this.server = http.Server(this.app);
    this.server.listen(this.port, console.log("Valoria running on port " + this.port));
    this.app.enable('trust proxy');
    this.app.use(express.static('./client'));
    this.app.use(cors());
    this.app.get('/', async (req, res) => {
      res.sendFile("index.html", {root: "./client"});
    })
    this.app.get('/valoria/:path', async (req, res) => {
      res.sendFile(req.params.path, {root: "./server/assets"});
    });
    this.wss = new WebSocket.Server({ 
      server: this.server,
      maxPayload: 512 * 1024 * 1024
    });
    this.wss.on('connection', async (ws) => {
      try {
        await this.setupWS(ws);
      } catch(e){

      }
    })
    if(isLocal){
      this.url = 'http://localhost:' + this.port + "/";
    } else {
      this.app.get('/valoria', async (req, res) => {
        const v = Object.assign({}, self);
        res.send(v);
      })
      this.app.get('/valoria/self-verification', async (req, res) => {
        res.send({key: self.selfKey});
      })
      this.app.use(async (req, res, next) => {
        if(!self.url && !self.verifyingSelf && (isLocal || !req.get('host').startsWith('localhost')) && !self.isSetup){
          self.verifyingSelf = true;
          try {
            let url = req.protocol + "://" + req.get('host') + "/";
            self.selfKey = Buffer.from(crypto.randomBytes(32)).toString('hex');
            const data = (await axios.get(url + "valoria/self-verification")).data;
            if(data.key == self.selfKey){
              self.url = url;
              self.setup();
            }
            self.verifyingSelf = false;
            self.selfKey = "";
          } catch(e){
            console.log(e)
          }
        }
        next();
      });
    }
  }

  setup = async () => {
    const self = this;
    return new Promise(async (res, rej) => {
      try {
        let pathUrl = self.url.replace(/\//g, "");
        self.pathUrl = pathUrl.replace(/\:/g, "");
        self.path = `${__dirname}/data/servers/${self.pathUrl}/`;
        // await self.joinNetwork();
        console.log("Valoria setup on " + self.url);
        return res();
      } catch(e){
        console.log(e);
        console.log("Valoria failed on " + self.url);
        return res();
      }
    })
  }

  loadNetwork = async () => {
    const self = this;
    return new Promise(async (res, rej) => {
      const servers = JSON.parse(JSON.stringify(self.servers));
      if(servers.indexOf(self.url) !== -1) servers.splice(servers.indexOf(self.url), 1);
      const askCount = 10;
      let asked = 0;
      while(asked < askCount && servers.length > 0){
        const i = 0 // servers.length * Math.random << 0;
        const url = servers[i];
        try {
          const groups = await self.send(url, {event: "Get groups"});
          self.groups = groups || self.groups;
        } catch(e){
        } 
        servers.splice(i, 1);
        asked += 1;
      }
      return res(self.groups);
    })
  }

  joinNetwork = async () => {
    const self = this;
    return new Promise(async (res, rej) => {
      if(self.group?.joined) return res();
      try {
        await self.loadNetwork();
      } catch(e){
        return rej(e);
      }
      const groups = JSON.parse(JSON.stringify(self.groups));
      while(groups.length > 0){
        const i = groups.length * Math.random() << 0;
        const url = groups[i][groups[i].length * Math.random() << 0];
        console.log("Asking " + url + " for group " + i);
        try {
          const group = await self.send(url, {event: "Join group", data: {url: self.url}});
          self.group = group;
          self.group.joined = true;
          self.groups[group.index] = self.group.members;
          return res();
        } catch(e){
          console.log(e);
        }
        groups.splice(i, 1);
      }
      try {
        await self.createGroup();
      } catch(e){
        console.log(e)
        await self.joinNetwork();
      }
      return res();
    })
  }

  connect = async (url) => {
    const self = this;
    return new Promise(async (res, rej) => {
      if(self.conns[url]?.readyState == WebSocket.OPEN && self.conns[url].connected) return res(self.conns[url])
      let wsUrl = "ws://" + new URL(url).host + "/"
      if(url.startsWith('https')){
        wsUrl = "wss://" + new URL(url).host + "/"
      }
      try {
        self.conns[url] = new WebSocket(wsUrl);
        self.conns[url].Url = url;
        self.conns[url].onopen = async () => {
          await new Promise(async (res, rej) => {
            try {
              await self.setupWS(self.conns[url]);
              self.promises["Url verified with " + url] = {res, rej};
              self.conns[url].send(JSON.stringify({
                event: "Verify url request",
                data: {
                  url: self.url
                }
              }))
            } catch(e){
              // return rej(e);
            }
          })
          self.conns[url].connected = true;
          return res(self.conns[url]);
        }
        self.conns[url].onerror = (error) => {
          return rej(error);
        }
        // setTimeout(() => {
        //   if(!self.conns[url]?.connected) {
        //     delete self.conns[url];
        //     // return rej();
        //   }
        // }, 5000)
      } catch(e){
        // return rej(e);
      }
    })
  }

  setupWS = async (ws) => {
    const self = this;
    return new Promise(async (res, rej) => {
      if(!ws) return rej();
      ws.id = Buffer.from(crypto.randomBytes(32)).toString('hex');
      self.conns[ws.id] = ws;
      ws.on('close', async () => {
        delete self.conns[ws.id];
        if(ws.world && self.worlds[ws.world]?.peers[ws.id]){
          delete self.worlds[ws.world]?.peers[ws.id];
          const peerList = Object.keys(self.worlds[ws.world].peers)
          if(peerList.length == 0){
            delete self.worlds[ws.world];
          } else {
            for (let i=0;i<peerList.length;i++){
              if(self.conns[peerList[i]]){
                self.conns[peerList[i]].send(JSON.stringify({
                  event: "Peer has left world",
                  data: {
                    id: ws.id,
                    world: ws.world
                  }
                }))
              }
            }
          }
        }
      })
      ws.on('message', async (d) => {
        d = JSON.parse(d);
        if(self.events[d.event]) self.events[d.event](ws, d.data);
      });
      return res();
    })
  }

  send = async (url, msg) => {
    const self = this;
    return new Promise(async (res, rej) => {
      try {
        if(url == self.url){
          const d = JSON.parse(msg);
          if(self.events[d.event]) self.events[d.event]({send: (msg) => {}, Url: self.url}, d.data);
          return res();
        }
        if(!self.conns[url] || !self.conns[url].connected) await self.connect(url);
        self.promises[msg.event + " from " + url] = {res, rej};
        self.conns[url].send(JSON.stringify(msg));
      } catch(e){
        rej(e);
      }
    })
  }

  createGroup = async () => {
    const self = this;
    return new Promise(async (res, rej) => {
      if(self.group?.joined) return res();
      const i = self.groups.length;
      self.group = {
        index: i,
        members: [self.url],
        max: 3
      }
      self.groups.push(self.group.members)
      if(self.groups[i-1]){
        const url = self.groups[i-1][self.groups[i-1].length * Math.random() << 0];
        try {
          await self.send(url, {event: "Create group", data: self.group});
          self.group.joined = true;
          return res();
        } catch(e){
          return rej(e);
        }
      } else {
        self.group.joined = true;
        return res();
      }
    })
  }

}

Valoria.runLocalNet = async (count=9) => {
  let servers = [];
  for(let i=0;i<count;i++){
    let valoria = new Valoria(3000 + i);
    try {
      await valoria.setup();
      servers.push(valoria)
    } catch(e){
      console.log(e);
    }
  }

  // setInterval(() => {
  //   let inSync = true;
  //   let groups;
  //   for(let i=0;i<count;i++){
  //     if(!groups) groups = servers[i].groups;
  //     if(JSON.stringify(groups) !== JSON.stringify(servers[i].groups)) inSync = false;
  //   }
  //   console.log(`Local network is ${inSync ? "" : "NOT "}in sync`);
  //   console.log(groups);
  // }, 1000)
  
}

module.exports = Valoria;