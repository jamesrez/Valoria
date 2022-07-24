class Avatar {
  constructor(valoria) { 
    this.valoria = valoria;
    this.defaultUrl = valoria.mainUrl + "valoria/sophia.glb";
    this.url = this.defaultUrl;
    this.camera = valoria.camera;
    this.domElement = valoria.el;
    this.cursor = {}
    this.loaded = false;
    this.position = {x: 0, y: 0, z: 0},
    this.rotation= {x: 0, y: 0, z: 0},
    this.speed = 6;
    this.metadata = {};
    this.target = new THREE.Vector3()
    this.spherical = new THREE.Spherical()
    this.sphericalDelta = new THREE.Spherical()
    this.rotateSpeed = 1.0
    this.rotateStart = null
    this.rotateEnd = new THREE.Vector2()
    this.rotateDelta = new THREE.Vector2()
    this.ranOnce = false
    this.activeAction
    this.lastAction
    this.domElement.onclick = () => {
        this.domElement.requestPointerLock()
    }
    this.enabled = true;
    const self = this;

    document.onpointerlockchange = (event) => {
      if (document.pointerLockElement) {
          this.enabled = true
      } else {
          this.enabled = false
          this.ranOnce = false
      }
    }

    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  async set(url){
    const self = this;
    return new Promise(async (res, rej) => {
      if(self.url == url) return res(self.model);
      try {
        await fetch(url);
        if(self.model) {
          self.camera.parent.parent.attach(self.camera)
          self.position = self.model.position;
          self.rotation = self.model.rotation;
          self.model.clear();
        }
        self.loaded = false;
        self.url = url;
        await self.load();
        res(self.model);
      } catch(e){
        rej(e);
      }
    })
  }

  async setDefault(){
    const self = this;
    return new Promise(async (res, rej) => {
      if(self.url == self.defaultUrl && self.loaded) return res(self.model);
      try {
        if(self.model) {
          self.camera.parent.parent.attach(self.camera)
          self.position = self.model.position;
          self.rotation = self.model.rotation;
          self.model.clear();
        }
        self.loaded = false;
        self.url = self.defaultUrl
        await self.load();
        res(self.model);
      } catch(e){
        rej(e);
      }
    })
  }

  async load(){
    const self = this;
    return new Promise(async (res, rej) => {
      if(self.loaded) return res(self.model);
      try {
        self.model = await self.valoria.loadModel(self.url);
        self.model.position.set(self.position.x, self.position.y, self.position.z);
        self.model.rotation.set(self.rotation.x, self.rotation.y, self.rotation.z);
        self.model.move = { forward: 0, left: 0 }
        self.model.lastMove = {};
        self.model.dirTarget = new THREE.Object3D()
        self.model.dirTarget.position.copy(self.model.position)
        self.camera.position.set(self.model.position.x, 2.5, self.model.position.z - 2)
        self.model.attach(self.camera)
        self.model.rotation.y = Math.PI / 2;
        self.camera.dirTarget = new THREE.Object3D()
        self.camera.attach(self.camera.dirTarget)
        self.camera.dirTarget.position.set(
          self.camera.position.x,
          self.camera.position.y,
          self.camera.position.z + 3
        )
        self.camera.rotation.y = -45 * Math.PI / 2;
        self.domElement.addEventListener('mousemove', (e) => {
          if (!self.enabled || !self.ranOnce) return
          const movementX = e.movementX || e.mozMovementX || e.webkitMovementX || 0
          const movementY = e.movementY || e.mozMovementY || e.webkitMovementY || 0
          if (!self.rotateStart) {
            self.rotateStart = new THREE.Vector2()
            self.rotateStart.set(0, 0)
            return
          }
          self.rotateEnd.set(self.rotateStart.x + movementX, self.rotateStart.y + movementY)
          self.rotateDelta
            .subVectors(self.rotateEnd, self.rotateStart)
            .multiplyScalar(self.rotateSpeed)
          const element = self.domElement
          self.sphericalDelta.theta -= (2 * Math.PI * self.rotateDelta.x) / element.clientHeight // yes, height
          self.sphericalDelta.phi -= (2 * Math.PI * self.rotateDelta.y) / element.clientHeight
          self.rotateStart.copy(self.rotateEnd)
        })
        self.loaded = true;
        self.onload();
        res(self.model);
      } catch(e){
        rej(e);
      }
    })
  }

  update (delta) {
    if(!this.loaded) return;
    if(this.model && this.model.mixer){
      this.model.mixer.update(delta);
      this.isMoving = this.model.move.forward !== 0 || this.model.move.left !== 0;
      if (this.model.dying){
        this.model.setAction("Death");
      } else {
        if(this.model.punching){
          this.model.setAction("Punch");
        }
        if (this.model.jumping) {
          this.model.setAction("Jump")
        } else {
          if (this.isMoving && !this.model.punching) {
            this.model.setAction("Run")
            this.model.dancing = false;
          } else if(this.model.dancing){
            this.model.setAction("Dance")
          }
        }
        if(!this.model.punching && !this.model.jumping && !this.isMoving && !this.model.dancing){
          this.model.setAction("Idle");
        }
      }
    } 
    if(!this.enabled || this.valoria.vr.session) return;
    this.lastPos = new THREE.Vector3().copy(this.model.position);
    this.camera.dirTarget.position.set(
      this.camera.position.x + this.model.move.left * 10,
      this.camera.position.y,
      this.camera.position.z + this.model.move.forward * 20 - 2
    )
    var viewPos = this.camera.dirTarget.position
    var newView = new THREE.Vector3()
    newView.copy(viewPos)
    let pos = this.camera.dirTarget.getWorldPosition(newView)
    if (
      (this.model.move.forward !== 0 || this.model.move.left !== 0) &&
      (JSON.stringify(this.model.lastMove) !== JSON.stringify(this.model.move) ||
      JSON.stringify(this.camera.lastPosition) !== JSON.stringify(this.camera.position))
    ) {
      if(this.camera.parent && this.camera.parent.parent){
        this.camera.parent.parent.attach(this.camera)
      }
      this.model.lookAt(
          this.model.position.x - (pos.x - this.model.position.x),
          this.model.position.y,
          this.model.position.z - (pos.z - this.model.position.z)
      )
      this.model.attach(this.camera)
    }

    if(!this.isMobile){
      const offset = new THREE.Vector3() // so camera.up is the orbit axis
      const quat = new THREE.Quaternion().setFromUnitVectors(
          this.camera.up,
          new THREE.Vector3(0, 1, 0)
      )
      const quatInverse = quat.clone().invert()
      const position = this.camera.position
      offset.copy(position).sub(this.target) // rotate offset to "y-axis-is-up" space
      offset.applyQuaternion(quat) // angle from z-axis around y-axis
      this.spherical.setFromVector3(offset)
      this.spherical.theta += this.sphericalDelta.theta
      this.spherical.phi += this.sphericalDelta.phi
      this.spherical.phi = Math.max(0.2, Math.min(Math.PI / 2 - 0.05, this.spherical.phi)) // restrict phi to be between desired limits
      this.spherical.makeSafe()
      this.spherical.radius *= 1 // restrict radius to be between desired limits
      this.spherical.radius = Math.max(0, Math.min(Infinity, this.spherical.radius)) // move target to panned location
      offset.setFromSpherical(this.spherical) // rotate offset back to "camera-up-vector-is-up" space
      offset.applyQuaternion(quatInverse)
      position.copy(this.target).add(offset)
    }

    let velocity = this.isMoving ? 1 : 0
    this.model.translateZ(velocity * this.speed * delta)
    this.model.lastMove = Object.assign({}, this.model.move)

    if(!this.isMobile){
      this.sphericalDelta.set(0, 0, 0)
      this.camera.lookAt(
        this.model.position.x,
        this.model.position.y + 1,
        this.model.position.z
      )
      this.camera.lastPos = Object.assign({}, this.camera.position)
    }
   
    this.ranOnce = true
    if (!this.enabled && this.ranOnce) return
  }

  handleKeyDown(e){
    if(e.code == "KeyW"){
      this.model.move["forward"] = 1;
    }
    if(e.code == "KeyA"){
      this.model.move["left"] = 1;
    }
    if(e.code == "KeyS"){
      this.model.move["forward"] = -1;
    }
    if(e.code == "KeyD"){
      this.model.move["left"] = -1;
    }
    if (e.code === 'Space' && !this.model.jumping) {
      this.model.jumping = true;
      setTimeout(() => {
          this.model.jumping = false;
      }, 600)
    }
  }

  handleKeyUp(e){
    if(e.code == "KeyW"){
      this.model.move["forward"] = 0;
    }
    if(e.code == "KeyA"){
      this.model.move["left"] = 0;
    }
    if(e.code == "KeyS"){
      this.model.move["forward"] = 0;
    }
    if(e.code == "KeyD"){
      this.model.move["left"] = 0;
    }
  }

  setMetadata(data){
    this.metadata = data;
  }

}

