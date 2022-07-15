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
    this.models = {};
    this.loader = new THREE.GLTFLoader();
    this.clock = new THREE.Clock();
    this.conns = {};
    this.peers = {};
    if(window.location.hostname == "localhost"){
      this.mainUrl = window.location.href;
    } else {
      this.mainUrl = "https://www.valoria.net/"
    }
    this.events = valoriaEvents;
    console.log(this.events);
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

  loadModel = async (url, opts={clone: false}) => {
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
          if(opts.clone){
            this.models[url] = gltf;
          }
          res(gltf.scene);
        })
      }
      // if(this.models[url] && opts.clone){
      //   let model = this.models[url].scene.clone();
      //   this.scene.add(model);
      //   model.traverse((node) => {
      //     if(node.isMesh){
      //       node.frustumCulled = false;
      //     }
      //   })
      //   model.animations = models[url].animations;
      //   model.mixer = new THREE.AnimationMixer(model);
      //   res(model);
      // }
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

  p2pConnect = async (id) => {
    const self = this;
    return new Promise(async (res, rej) => {
      if(self.peers[id]?.conn?.datachannel?.open) return res(self.peers[id].conn);      
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
          console.log(self.conns);
          self.conns[self.mainUrl].send(JSON.stringify({
            event: "Send rtc description",
            data: {
              description: pc.localDescription,
              id
            }
          }))
        } catch (e) {
          console.log(e)
        } finally {
          self.peers[id].makingOffer = false;
        }
      };
      pc.onnegotiationneeded();

      self.peers[id].dc = pc.createDataChannel("data");
      self.peers[id].dc.onopen = function(event) {
        console.log("datachannel open");
        console.log(self.peers[id])
        return res(self.peers[id]);
      }
      self.peers[id].dc.onmessage = function(e) {
        const d = JSON.parse(e.data);
        const event = d.event;
        if(self.peers[id].subscribed[event]) self.peers[id].subscribed[event](d.data);
      }
      self.peers[id].dc.onclose = () => {
        if(self.dimension.players[id]) self.dimension.removePlayer(id);
      }

    })
  }

  setupWS = async (ws) => {
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


(async () => {
  let valoria = new Valoria();
  await valoria.load();
  window.valoria = valoria;
})();
