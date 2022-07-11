module.exports = (valoria) => {

  const self = valoria;

  const dimEvents = {
    "Join dimension": joinDimension
  }

  async function joinDimension (ws, data){
    console.log(ws.id + " is joining " + data.dimension);
  }

  return dimEvents;

}