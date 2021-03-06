const crypto = require('crypto');
const subtle = crypto.webcrypto.subtle;
const axios = require('axios');

module.exports = (valoria) => {

  const self = valoria;
  const events = {
    "Verify url request": verifyUrlRequest,
    "Verify url with key": verifyUrlWithKey,
    "Verify url": verifyUrl,
    "Url verified": urlVerified,
    "Get groups": getGroups,
    "Got groups": gotGroups,
    "Get group": getGroup,
    "Got group": gotGroup,
    "Create group": createGroup,
    "Created group": createdGroup,
    "Join group": joinGroup,
    "Joined group": joinedGroup,
    "Send ice candidate": sendIceCandidate,
    "Send rtc description": sendRTCDescription,
    ...require('./world')(valoria)
  }

  async function verifyUrlRequest(ws, data){
    return new Promise(async( res, rej) => {
      try {
        if(!data.url) return res();
        ws.verifyingUrl = data.url;
        self.verifying[data.url] = Buffer.from(crypto.randomBytes(32)).toString('hex');
        await new Promise(async(res, rej) => {
          self.promises["Verified url " + data.url + " with key"] = {res, rej}
          ws.send(JSON.stringify({
            event: "Verify url with key",
            data: {
              key: self.verifying[data.url]
            }
          }))
        })
        res();
      } catch(e){
        // console.log(e)
        // rej();
        res();
      }
    })
  }

  async function verifyUrlWithKey(ws, data){
    return new Promise(async( res, rej) => {
      try {
        if(!self.promises["Url verified with " + ws.Url] || !data.key) return res();
        let pathUrl = ws.Url.replace(/\//g, "");
        pathUrl = pathUrl.replace(/\:/g, "");
        // const sig = Buffer.from(await self.sign(data.key)).toString("base64");
        self.verificationKeys["/valoria/verifying/" + pathUrl] = {
          key: data.key,
          // sig,
          // id: self.id
        };
        self.app.get("/valoria/verifying/" + pathUrl, (req, res) => {
          res.send(self.verificationKeys[req.path]);
        })
        ws.send(JSON.stringify({
          event: "Verify url"
        }))
      } catch(e){

      }
      return res();
    })
  }

  async function verifyUrl(ws, data){
    return new Promise(async( res, rej) => {
      try {
        if(!ws.verifyingUrl || !self.verifying[ws.verifyingUrl]) return res();
        const data = (await axios.get(ws.verifyingUrl + "valoria/verifying/" + self.pathUrl)).data;
        if(data.key == self.verifying[ws.verifyingUrl]){
          ws.Url = ws.verifyingUrl;
          ws.connected = true;
          self.conns[ws.verifyingUrl] = ws;
          ws.send(JSON.stringify({
            event: "Url verified",
            data: {
              success: true
            }
          }))
          if(self.promises["Connected to peer ws for " + ws.Url]){
            self.promises["Connected to peer ws for " + ws.Url].res(ws);
          }
          return res();
        } else {
          ws.send(JSON.stringify({
            event: "Url verified",
            data: {
              err: true
            }
          }))
        }
      } catch(e){
        ws.send(JSON.stringify({
          event: "Url verified",
          data: {
            err: true
          }
        }))
      }
      return res();
    })
  }

  async function urlVerified(ws, data){
    return new Promise(async(res, rej) => {
      if(!self.promises["Url verified with " + ws.Url]) return res();
      if(data.success){
        self.promises["Url verified with " + ws.Url].res()
      } else {
        self.promises["Url verified with " + ws.Url].rej();
      }
      delete self.promises["Url verified with " + ws.Url]
      res()
    })
  }
  
  async function getGroups(ws, data){
    ws.send(JSON.stringify({
      event: "Got groups",
      data: self.groups
    }));
  }
  
  async function gotGroups(ws, data){
    if(!self.promises["Get groups from " + ws.Url]) return;
    self.promises["Get groups from " + ws.Url].res(data)
    delete self.promises["Get groups from " + ws.Url]
  }

  async function getGroup(ws, data){
    ws.send(JSON.stringify({
      event: "Got group",
      data: self.group
    }));
  }
  
  async function gotGroup(ws, data){
    if(!self.promises["Get group from " + ws.Url]) return;
    self.promises["Get group from " + ws.Url].res(data)
    delete self.promises["Get group from " + ws.Url]
  }

  async function createGroup(ws, data){
    if(self.groups[data.index] || !self.group) return err();
    if(data.members.indexOf(ws.Url) !== -1 && data.index == self.group.index + 1){
      for(let i=0;i<self.group?.members?.length;i++){
        if(self.group?.members[i] == self.url) continue;
        try {
          const groups = await self.send(self.group?.members[i], {event: "Get groups"});
          if(groups?.length !== data.index){
            return err();
          }
        } catch(e){
  
        }
      }
      ws.send(JSON.stringify({
        event: "Created group",
        data: {success: true}
      }))
    }
    if(self.group.members.indexOf(ws.Url) == -1){
      if(self.groups[self.group.index + 1] && self.groups[self.group.index + 1]?.indexOf(ws.Url) == -1){
        const i = self.groups[self.group.index + 1]?.length * Math.random() << 0;
        const url = self.groups[self.group.index + 1][i];
        self.send(url, {event: "Create group", data})
      }
      if(self.groups[self.group.index - 1] && self.groups[self.group.index - 1]?.indexOf(ws.Url) == -1){
        const i = self.groups[self.group.index - 1]?.length * Math.random() << 0;
        const url = self.groups[self.group.index - 1][i];
        self.send(url, {event: "Create group", data})
      }
      for(let i=0;i<self.group.members.length;i++){
        if(self.group.members[i] == self.url) continue;
        self.send(self.group.members[i], {event: "Create group", data})
      }
    }
    self.groups.push(data.members);
    function err(){
      ws.send(JSON.stringify({
        event: "Created group",
        data: {err: true}
      }))
    }
  }

  async function createdGroup(ws, data){
    if(!self.promises["Create group from " + ws.Url]) return;
    if(data.success){
      self.promises["Create group from " + ws.Url].res()
    } else {
      self.promises["Create group from " + ws.Url].rej();
    }
    delete self.promises["Create group from " + ws.Url];
  }

  async function joinGroup(ws, data){
    if(!self.group?.joined) return err();
    let index = data.index;
    if(data.url == ws.Url){
      index = self.group.index;
      if(self.group.members?.length >= self.group.max) return err();
      for(let i=0;i<self.group?.members?.length;i++){
        if(self.group.members[i] == self.url) continue;
        try {
          const group = await self.send(self.group?.members[i], {event: "Get group"});
          if(group?.members.length >= group.max){
            return err();
          }
        } catch(e){

        }
      }
      ws.send(JSON.stringify({
        event: "Joined group",
        data: {success: true, group: self.group}
      }));
    }
    if(self.group.members.indexOf(ws.Url) == -1){
      if(self.groups[self.group.index - 1] && (ws.Url == data.url || self.groups[self.group.index + 1]?.indexOf(ws.Url) !== -1)){
        const g = self.groups[self.group.index - 1];
        const url = g[g.length * Math.random() << 0];
        self.send(url, {event: "Join group", data: {url: data.url, index}})
      }
      if(self.groups[self.group.index + 1] && (ws.Url == data.url || self.groups[self.group.index - 1]?.indexOf(ws.Url) !== -1)){
        const g = self.groups[self.group.index + 1];
        const url = g[g.length * Math.random() << 0];
        self.send(url, {event: "Join group", data: {url: data.url, index}})
      }
      for(let i=0;i<self.group.members.length;i++){
        if(self.group.members[i] == self.url || self.group.members[i] == data.url) continue;
        self.send(self.group.members[i], {event: "Join group", data: {url: data.url, index}})
      }
    }
    if(index == self.group.index && self.group.members.indexOf(data.url) == -1){
      self.group.members.push(data.url);
      self.groups[self.group.index] = self.group.members;
    } else if(self.groups[index]?.indexOf(data.url) == -1){
      self.groups[index].push(data.url);
    }
    console.log(self.url + " says " + data.url + " joined " + index)
    //TODO: ADD MEMBER TO GROUP, Tell other members
    function err(){
      ws.send(JSON.stringify({
        event: "Joined group",
        data: {err: true}
      }))
    }
  }

  async function joinedGroup(ws, data){
    if(!self.promises["Join group from " + ws.Url]) return;
    if(data.success){
      self.promises["Join group from " + ws.Url].res(data.group)
    } else {
      self.promises["Join group from " + ws.Url].rej("Could not join group");
    }
    delete self.promises["Join group from " + ws.Url];
  }

  async function sendIceCandidate(ws, data){
    if(self.conns[data.id] && data.candidate){
      self.conns[data.id].send(JSON.stringify({
        event: "Got ice candidate",
        data: {
          candidate: data.candidate,
          id: ws.id
        }
      }))
    }
  }

  async function sendRTCDescription(ws, data){
    if(self.conns[data.id] && data.description){
      try {
        if(!self.conns[data.id]?.peers) self.conns[data.id].peers = {};
        if(!self.conns[ws.id]?.peers) self.conns[ws.id].peers = {};
        if(!self.conns[ws.id].peers[data.id] || !self.conns[data.id].peers[ws.id]){
          self.conns[ws.id].peers[data.id] = {polite: false};
          self.conns[data.id].peers[ws.id] = {polite: true};
        }
        self.conns[data.id].send(JSON.stringify({
          event: "Got rtc description",
          data: {
            description: data.description,
            id: ws.id,
            polite: self.conns[ws.id]?.peers[data.id]?.polite,
            world: ws.world,
            avatar: ws.avatar,
            metadata: ws.metadata
          }
        }))
      } catch(e){
        console.log(e)
      } 
    }
  }

  valoria.events = events;
  return valoria;
}