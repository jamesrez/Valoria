
class Dimension {

  constructor(valoria, name="Valoria"){
    this.valoria = valoria;
    this.name = "Valoria";
    this.map = {
      "../assets/japan.glb": { pos: {x: 0, y: 0, z: 0}, rot: {x: 0, y: 0, z: 0} }
    };
    this.playerModel = "../assets/sophia.glb";
    this.players = {};
  }

  load = async () => {
    const mList = Object.keys(this.map);
    for(let i=0;i<mList.length;i++){
      const map = this.map[mList[i]];
      const model = await this.valoria.loadModel(mList[i]);
      model.position.set(map.pos.x, map.pos.y, map.pos.z);
      model.rotation.set(map.rot.x, map.rot.y, map.rot.z);
    }
    const url = this.valoria.mainUrl;
    await this.valoria.connect(url)
    this.valoria.conns[url].send(JSON.stringify({
      event: "Join dimension",
      data: {
        dimension: this.name
      }
    }))
    setInterval(() => {
      this.syncPlayers();
    }, 20);
  }

  addPlayer = async (id) => {
    this.players[id] = await this.valoria.loadModel(this.playerModel);
    this.players[id].position.set(0, 0, 5);
    this.players[id].move = { forward: 0, left: 0 }
    this.players[id].setAction("Idle");
    this.valoria.peers[id].subscribed["Move"] = (data) => {
      this.updatePlayer(id, data);
    }
  }

  removePlayer = async (id) => {
    this.players[id].clear();
    delete this.players[id];
  }

  syncPlayers = async () => {
    
    const players = Object.keys(this.players);
    for(let i=0;i<players.length;i++){
      const peer = this.valoria.peers[players[i]];
      if(!peer || !peer.conn || peer.dc?.readyState !== "open") continue;
      const pos = this.valoria.avatar.avatar.position;
      const rot = this.valoria.avatar.avatar.rotation;
      const isMoving = this.valoria.avatar.avatar.move.forward !== 0 || this.valoria.avatar.avatar.move.left !== 0
      peer.dc.send(JSON.stringify({
        event: "Move",
        data: {
          pos, rot, isMoving
        }
      }))
    }

  }

  updatePlayer = async (id, data) => {

    if(!this.players[id] || !data) return;

    this.players[id].position.set(data.pos?.x, data.pos?.y, data.pos?.z)
    this.players[id].rotation.set(data.rot?._x, data.rot?._y, data.rot?._z)
    if(data.isMoving){
      this.players[id].setAction("Run")
    } else {
      this.players[id].setAction("Idle")
    }

  }

}

