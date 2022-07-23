module.exports = (valoria) => {

  const self = valoria;

  const dimEvents = {
    "Join world": joinWorld
  }

  async function joinWorld (ws, data){
    return new Promise(async (res, rej) => {
      console.log(ws.id + " is joining " + data.world);
      if(!self.worlds[data.world]) self.worlds[data.world] = {
        peers: {},
      };
      if(!self.worlds[data.world].peers[ws.id]){
        self.worlds[data.world].peers[ws.id] = {avatar: data.avatar, id: ws.id, metadata: data.metadata};
      }
      ws.world = data.world;
      ws.avatar = data.avatar;
      ws.send(JSON.stringify({
        event: "Joined world",
        data: {
          world: data.world,
          peers: self.worlds[data.world].peers
        }
      }))
    })

  }

  return dimEvents;

}