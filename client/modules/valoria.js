class Valoria {
  constructor(){
    this.models = {};
    this.loader = new THREE.GLTFLoader();
    this.clock = new THREE.Clock();
    this.conns = {};
    this.events = valoriaEvents;
  }

  load = async () => {
    document.body.style.margin = "0px";
    this.el = document.createElement('div');
    this.el.style.position = "absolute";
    this.el.style.zIndex = "100000000000";
    this.el.style.backgroundColor = "black";
    document.body.appendChild(this.el);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    this.camera.position.set(-3, 2.1, 5);
    this.camera.rotation.y = -45 * Math.PI / 2;
    this.renderer = new THREE.WebGLRenderer({antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setClearColor(0x1a0025)
    this.renderer.shadowMap.enabled = true // isMobile ? false : true
    this.renderer.xr.enabled = true
    this.el.appendChild( this.renderer.domElement );

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(window.innerWidth, window.innerHeight)
    }, false);

    this.renderer.setAnimationLoop(async () => {
      this.renderer.render( this.scene, this.camera );
      let delta = this.clock.getDelta();
      this.scene.traverse((node) => {
        if(node.mixer) node.mixer.update(delta);
      })
      if(this.avatar.update) this.avatar.update(delta);
    })

    this.loadLights();

    this.dimension = new Dimension(this);
    this.avatar = new Avatar(this);
    await this.dimension.load();
    await this.avatar.load();
  }

  loadModel = async (url, opts={clone: true}) => {
    return new Promise(async (res, rej) => {
      if(!this.models[url] || opts.clone == false){
        this.loader.load(url, (gltf) => {
          this.scene.add(gltf.scene);
          gltf.scene.traverse((node) => {
            if(node.isMesh){
              node.frustumCulled = false;
            }
          })
          gltf.scene.animations = gltf.animations;
          gltf.scene.mixer = new THREE.AnimationMixer(gltf.scene);
          gltf.scene.animationActions = [];
          for(let i=0;i<gltf.animations.length;i++){
            const animationAction = gltf.scene.mixer.clipAction(gltf.animations[i])
            gltf.scene.animationActions.push(animationAction)
          }
          if(opts.clone){
            this.models[url] = gltf;
          }
          res(gltf.scene);
        })
      }
      if(this.models[url] && opts.clone){
        let model = this.models[url].scene.clone();
        scene.add(model);
        model.traverse((node) => {
          if(node.isMesh){
            node.frustumCulled = false;
          }
        })
        model.animations = models[url].animations;
        model.mixer = new THREE.AnimationMixer(model);
        res(model);
      }
    })
  }

  loadLights = () => {
    const light = new THREE.AmbientLight()
    light.intensity = 1
    light.position.y = 50
    this.scene.add(light)

    const directionalLight = new THREE.DirectionalLight(0xdd77ff, 1.5)
    directionalLight.position.y = 10
    directionalLight.castShadow = true
    this.scene.add(directionalLight)
  }

  connect = async (url) => {
    return new Promise(async (res, rej) => {
      if(this.conns[url]?.connected) return res(this.conns[url]);
      let wsUrl = "ws://" + new URL(url).host + "/"
      if(url.startsWith('https')){
        wsUrl = "wss://" + new URL(url).host + "/"
      }
      this.conns[url] = new WebSocket(wsUrl)
      this.conns[url].onopen = async () => {
        await this.setupWS(this.conns[url]);
        this.conns[url].connected = true;
        return res(this.conns[url])
      }
    })
  }

  setupWS = async (ws) => {
    return new Promise(async (res, rej) => {
      ws.onclose = async () => {
        delete self.conns[url];
      }
      ws.onmessage = async (d) => {
        d = JSON.parse(d);
        if(self.events[d.event]) self.events[d.event](ws, d.data);
      }
      return res();
    })
  }






}


(async () => {
  let valoria = new Valoria();
  await valoria.load();
  window.valoria = valoria;
})();
