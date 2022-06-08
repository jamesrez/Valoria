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
    "Created group": createGroup,
    "Join group": joinGroup,
    "Joined group": joinedGroup
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
    if(self.groups[data.index]?.length > 0) return err();
    for(let i=0;i<self.group?.members?.length;i++){
      const groups = await self.send(self.group?.members[i], {event: "Get groups"});
      if(groups?.length !== data.index){
        return err();
      }
    }
    ws.send(JSON.stringify({
      event: "Created group",
      data: {success: true}
    }))
    //TODO: ADD GROUP TO NETWORK
    return;
    function err(){
      ws.send(JSON.stringify({
        event: "Created group",
        data: {err: true}
      }))
    }
  }

  async function createdGroup(ws, data){
    if(!self.promises["Create group from " + ws.Url]) return res();
    if(data.success){
      self.promises["Create group from " + ws.Url].res()
    } else {
      self.promises["Create group from " + ws.Url].rej();
    }
    delete self.promises["Create group from " + ws.Url];
  }

  async function joinGroup(ws, data){
    if(!self.group?.joined || self.group.members?.length >= self.group.max) return err();
    for(let i=0;i<self.group?.members?.length;i++){
      const group = await self.send(self.group?.members[i], {event: "Get group"});
      if(group?.members.length >= group.max){
        return err();
      }
    }
    self.group.members.push(ws.Url);
    self.groups[self.group.index] = self.group.members;
    ws.send(JSON.stringify({
      event: "Joined group",
      data: {success: true, group: self.group}
    }))
    //TODO: ADD MEMBER TO GROUP, Tell other members
    return;
    function err(){
      ws.send(JSON.stringify({
        event: "Joined group",
        data: {err: true}
      }))
    }
  }

  async function joinedGroup(ws, data){
    if(!self.promises["Join group from " + ws.Url]) return res();
    if(data.success){
      self.promises["Join group from " + ws.Url].res(data.group)
    } else {
      self.promises["Join group from " + ws.Url].rej();
    }
    delete self.promises["Join group from " + ws.Url];
  }




  valoria.events = events;
  return valoria;
}