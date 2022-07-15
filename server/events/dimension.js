module.exports = (valoria) => {

  const self = valoria;

  const dimEvents = {
    "Join dimension": joinDimension
  }

  async function joinDimension (ws, data){
    return new Promise(async (res, rej) => {
      console.log(ws.id + " is joining " + data.dimension);
      if(!self.dimensions[data.dimension]) self.dimensions[data.dimension] = {
        peers: {},
      };
      const peerList = Object.keys(self.dimensions[data.dimension].peers);
      if(!self.dimensions[data.dimension].peers[ws.id]){
        self.dimensions[data.dimension].peers[ws.id] = {};
      }
      ws.dimension = data.dimension;
      ws.send(JSON.stringify({
        event: "Joined dimension",
        data: {
          dimension: data.dimension,
          peers: peerList
        }
      }))
    })

  }

  return dimEvents;

}