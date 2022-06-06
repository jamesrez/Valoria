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
  }

  async function verifyUrlRequest(ws, data){
    return new Promise(async( res, rej) => {
      console.log(data);
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
        console.log(e)
        // rej();
        res();
      }
    })
  }

  async function verifyUrlWithKey(ws, data){
    return new Promise(async( res, rej) => {
      console.log(self.url + " VERIFY URL WITH KEY " + data.key)
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
        console.log(e)
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
    if(!self.promises["Got groups from " + ws.Url]) return;
    self.promises["Got groups from " + ws.Url].res(data)
    delete self.promises["Got groups from " + ws.Url]
  }

  valoria.events = events;
  return valoria;
}