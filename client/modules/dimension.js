
class Dimension {

  constructor(valoria, name="Valoria"){
    this.valoria = valoria;
    this.name = "Valoria";
    this.url = "../assets/japan.glb";
    this.models = {};
  }

  load = async () => {
    await this.valoria.loadModel(this.url);
    const url = window.location.href;
    await this.valoria.connect(url)
    this.valoria.conns[url].send(JSON.stringify({
      event: "Join dimension",
      data: {
        dimension: this.name
      }
    }))
  }

}

