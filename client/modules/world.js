
class World {

  constructor(valoria, name="Valoria"){
    this.valoria = valoria;
    this.name = "Valoria";
    this.models = {};
    // this.map[`${this.valoria.mainUrl}valoria/city.glb`] = { pos: {x: 0, y: 0, z: 0}, rot: {x: 0, y: 0, z: 0} };
    // this.playerModel = `${this.valoria.mainUrl}valoria/sophia.glb`;
    this.players = {};
  }

  async add(name, url, opts={}){
    return new Promise(async (res, rej) => {
      try {
        if(this.models[name]){
          throw `${name} has already been added to the world`;
        }
        const model = await this.valoria.loadModel(url);
        this.models[name] = model;
        if(opts.pos){
          model.position.set(opts.pos.x || 0, opts.pos.y || 0, opts.pos.z || 0);
        }
        if(opts.rot){
          model.rotation.set(opts.rot.x || 0, opts.rot.y || 0, opts.rot.z || 0);
        }
        if(opts.scale){
          model.scale.set(opts.scale.x || 1, opts.scale.y || 1, opts.scale.z || 1);
        }
      } catch(e){
        return rej(e)
      }
      res(this.models[name]);
    })
  }

  async remove(name){
    return new Promise(async (res, rej) => {
      this.models[name].clear();
      delete this.models[name];
    })
  }

  async join(){
    return new Promise(async (res, rej) => {
      try {
        const url = this.valoria.mainUrl
        await this.valoria.connect(url)
        this.valoria.conns[url].send(JSON.stringify({
          event: "Join world",
          data: {
            world: this.name,
            avatar: this.valoria.avatar.url
          }
        }))
        setInterval(() => {
          this.syncPlayers();
        }, 20);
      } catch(e){
  
      }
    })
  }

  async addPlayer(id){
    this.players[id] = await this.valoria.loadModel(this.playerModel);
    this.players[id].position.set(0, 0, 5);
    this.players[id].move = { forward: 0, left: 0 }
    this.players[id].setAction("Idle");
    this.valoria.peers[id].subscribed["Move"] = (data) => {
      this.updatePlayer(id, data);
    }
    this.valoria.updates[`player-${id}`] = (delta) => {
      if(this.players[id].mixer) this.players[id].mixer.update(delta)
    }
  }

  async removePlayer(id){
    this.players[id].clear();
    delete this.players[id];
    delete this.valoria.updates[`player-${id}`];
  }

  async syncPlayers(){
    
    const players = Object.keys(this.players);
    for(let i=0;i<players.length;i++){
      const peer = this.valoria.peers[players[i]];
      if(!peer || !peer.conn || !peer.dc || peer.dc.readyState !== "open") continue;
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

  async updatePlayer(id, data){
    if(!this.players[id] || !data.pos || !data.rot) return;
    if(data.pos){
      this.players[id].position.set(data.pos.x, data.pos.y, data.pos.z)
    }
    if(data.rot){
      this.players[id].rotation.set(data.rot._x, data.rot._y, data.rot._z)
    }
    if(data.isMoving){
      this.players[id].setAction("Run")
    } else {
      this.players[id].setAction("Idle")
    }

  }

}

