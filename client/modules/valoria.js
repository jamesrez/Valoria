const iceServers = [
  {url: "stun:stun.l.google.com:19302", urls: "stun:stun.l.google.com:19302"},
  {url: "stun:stun2.l.google.com:19302", urls: "stun:stun2.l.google.com:19302"},
  {url: "stun:stun3.l.google.com:19302", urls: "stun:stun3.l.google.com:19302"},
  {url: "stun:stun4.l.google.com:19302", urls: "stun:stu4.l.google.com:19302"},
  {url: "stun:stunserver.org", urls: "stun:stunserver.org"},
  {url: "stun:stun.voiparound.com", urls: "stun:stun.voiparound.com"},
  {url: "stun:stun.voipbuster.com", urls: "stun:stun.voipbuster.com"},
  {url: "stun:stun.voipstunt.com", urls: "stun:stun.voipstunt.com"},
  {urls: "stun:openrelay.metered.ca:80"},
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject"
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject"
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject"
  }
];

class Valoria {
  constructor(){
    this.THREE = THREE;
    this.THREE.Cache.enabled = true;
    this.TWEEN = TWEEN;
    this.loader = new THREE.GLTFLoader();
    this.clock = new THREE.Clock();
    this.conns = {};
    this.peers = {};
    this.updates = {};
    this.isMobile = false;
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent) ||
       (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.platform))) {
        this.isMobile = true;
    }
    // if(window.location.hostname == "localhost"){
    //   this.mainUrl = window.location.href;
    // } else {
      this.mainUrl = "https://www.valoria.net/"
    // }
    this.events = valoriaEvents;
  }

  async load(opts={}){
    if(!opts.el) {
      opts.el = document.body;
      document.body.style.margin = "0px";
    }
    this.el = document.createElement('div');
    this.el.style.position = "relative";
    this.el.style.zIndex = "100000000000";
    this.el.style.backgroundColor = "black";
    this.el.style.top = "0px";
    this.el.style.left = "0px";
    this.el.style.overflow = "hidden";
    this.el.style.width = "100%";
    this.el.style.height = "100%";
    opts.el.appendChild(this.el);
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
      TWEEN.update();
      const delta = this.clock.getDelta();
      if(this.avatar.update) this.avatar.update(delta);
      if(this.touch && this.touch.update) this.touch.update(delta);
      const updates = Object.keys(this.updates);
      for(let i=0;i<updates.length;i++){
        if(typeof this.updates[updates[i]] == "function") this.updates[updates[i]](delta);
      }
    })

    this.light = new THREE.AmbientLight()
    this.light.intensity = 1
    this.light.position.y = 50
    this.scene.add(this.light)

    this.world = new World(this);
    this.avatar = new Avatar(this);
    this.avatar.onload = () => {

      if(this.isMobile){
        this.touch = new TouchControls(this, {
          speedFactor: 0.015,
          delta: 1,
          rotationFactor: 0.015,
          maxPitch: 55,
          hitTest: false,
          hitTestDistance: 40,
        })
      }

      this.world.join();
      this.avatar.enabled = true;
    }
  }

  async update(name, fn){
    try {
      fn(0.007);
      this.updates[name] = fn;
    } catch(e){
      throw e;
    }
  }

  async removeUpdate(name){
    try {
      delete this.updates[name]
    } catch(e){

    }
  }

  async loadModel(url, opts={}){
    return new Promise(async (res, rej) => {
      this.loader.load(url, (gltf) => {
        this.scene.add(gltf.scene);
        gltf.scene.traverse((node) => {
          if(node.isMesh){
            node.frustumCulled = false;
            node.material.roughness = 1;
          }
        })
        gltf.scene.animations = gltf.animations;
        gltf.scene.mixer = new THREE.AnimationMixer(gltf.scene);
        gltf.scene.animationActions = {};
        for(let i=0;i<gltf.animations.length;i++){
          const animationAction = gltf.scene.mixer.clipAction(gltf.animations[i])
          gltf.scene.animationActions[animationAction.getClip().name] = animationAction;
        }
        gltf.scene.setAction = (toActionName, timeScale=1) => {
          let toAction = gltf.scene.animationActions[toActionName];
          if (toAction && toAction != gltf.scene.activeAction) {
            gltf.scene.lastAction = gltf.scene.activeAction
            gltf.scene.activeAction = toAction
            if (gltf.scene.lastAction) {
              gltf.scene.lastAction.fadeOut(0.2)
            }
            gltf.scene.activeAction.reset()
            gltf.scene.activeAction.fadeIn(0.2)
            gltf.scene.activeAction.play()
            gltf.scene.activeAction.timeScale = timeScale;
          }
        }
        res(gltf.scene);
      })
    })
  }

  async connect(url){
    return new Promise(async (res, rej) => {
      try {
        if(this.conns[url] && this.conns[url].connected) return res(this.conns[url]);
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
      } catch(e){
        return rej(e);
      }
    })
  }

  async p2pConnect(id){
    const self = this;
    return new Promise(async (res, rej) => {
      const peer = self.peers[id];
      if(peer && peer.dc && peer.dc.open && peer.conn) return res(peer.conn);      
      self.peers[id] = {
        makingOffer: false,
        ignoreOffer: false,
        srdAnswerPending: false,
        conn: new RTCPeerConnection({iceServers}),
        subscribed: {}
      }
      const pc = self.peers[id].conn;
      pc.onicecandidate = ({candidate}) => {
        self.conns[this.mainUrl].send(JSON.stringify({
          event: "Send ice candidate",
          data: {
            candidate,
            id
          }
        }))
      };
      pc.onnegotiationneeded = async () => {
        try {
          if(pc.signalingState !== 'stable') throw 'negotiationneeded always fires in stable state';
          if(self.peers[id].makingOffer !== false) throw 'negotiationneeded not already in progress';
          self.peers[id].makingOffer = true;
          await pc.setLocalDescription();
          if(pc.signalingState !== "have-local-offer") throw 'negotiationneeded not racing with onmessage';
          if(pc.localDescription.type !== "offer") throw 'negotiationneeded SLD worked';
          self.conns[self.mainUrl].send(JSON.stringify({
            event: "Send rtc description",
            data: {
              description: pc.localDescription,
              id
            }
          }))
        } catch (e) {
          // console.log(e)
        } finally {
          self.peers[id].makingOffer = false;
        }
      };
      pc.onnegotiationneeded();

      self.peers[id].dc = pc.createDataChannel("data");
      self.peers[id].dc.onopen = function(event) {
        return res(self.peers[id]);
      }
      self.peers[id].dc.onmessage = function(e) {
        const d = JSON.parse(e.data);
        const event = d.event;
        if(self.peers[id].subscribed[event]) self.peers[id].subscribed[event](d.data);
      }
      self.peers[id].dc.onclose = () => {
        if(self.world.players[id]) self.world.removePlayer(id);
      }

    })
  }

  async setupWS(ws){
    const self = this;
    return new Promise(async (res, rej) => {
      ws.valoria = self;
      ws.onclose = async () => {
        delete self.conns[url];
      }
      ws.onmessage = async (d) => {
        d = JSON.parse(d.data);
        if(self.events[d.event]) self.events[d.event](ws, d.data);
      }
      return res();
    })
  }

}


let valoria = new Valoria();
window.valoria = valoria;
