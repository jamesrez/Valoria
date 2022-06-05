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

class Valoria {
  constructor(port){
    const self = this;
    this.servers = isLocal ? ["http://localhost:3000/", "http://localhost:3001/"] : ["https://www.valoria.live/"]
    this.groups = [];
    this.dimensions = {};
    this.accounts = {};
    this.conns = {};
    this.events = {};
    this.promises = {};
    this.app = express();
    this.port = port;
    this.server = http.Server(this.app);
    this.server.listen(this.port, console.log("Valoria running on port " + this.port));
    this.app.enable('trust proxy');
    this.app.use(express.static('./client'));
    this.app.get('/', async (req, res) => {
      res.sendFile("index.html", {root: "./client"});
    })
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
      this.setup();
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
      console.log("Valoria setup on " + self.url);
      await self.joinNetwork();
    })
  }

  loadNetwork = async () => {
    const self = this;
    return new Promise(async (res, rej) => {
      const servers = JSON.parse(JSON.stringify(self.servers));
      if(servers.indexOf(self.url) !== -1) servers.splice(servers.indexOf(self.url));
      const askCount = 10;
      const asked = 0;
      while(asked < askCount && servers.length > 0){
        const url = servers[servers.length * Math.random << 0];
        const groups = await self.send(url, "Get groups");
      }
    })
  }

  joinNetwork = async () => {
    const self = this;
    return new Promise(async (res, rej) => {
      await self.loadNetwork();
      console.log("NETWORK LOADED. READY TO JOIN");
      console.log(valoria.groups);
    })
  }

  connect = async (url) => {
    const self = this;
    return new Promise(async (res, rej) => {
      if(self.conns[url]?.readyState == WebSocket.OPEN) return res(self.conns[url])
      let wsUrl = "ws://" + new URL(url).host + "/"
      if(url.startsWith('https')){
        wsUrl = "wss://" + new URL(url).host + "/"
      }
      try {
        self.conns[url] = new WebSocket(wsUrl);
        self.conns[url].Url = url;
        self.conns[url].onopen = async () => {
          await self.setupWS(self.conns[url]);
          self.conns[url].connected = true;
          return res(self.conns[url]);
        }
        setTimeout(() => {
          if(!self.conns[url]?.connected) {
            delete self.conns[url];
            return rej();
          }
        }, 5000)
      } catch(e){
        rej(e);
      }
    })
  }

  setupWS = async (ws) => {
    const self = this;
    return new Promise(async (res, rej) => {
      res();
    })
  }

  send = async (url, msg) => {
    const self = this;
    return new Promise(async (res, rej) => {
      try {
        if(!self.conns[url]) await self.connect(url);
        self.promises["Got groups from " + url] = {res, rej};
        self.conns[url].send(msg);
      } catch(e){
        console.log("COULD NOT SEND MESSAGE TO " + url);
      }
    })
  }

}

Valoria.runLocalNet = async (count=9) => {
  for(let i=0;i<count;i++){
    let valoria = new Valoria(3000 + i);
  }
}

module.exports = Valoria;