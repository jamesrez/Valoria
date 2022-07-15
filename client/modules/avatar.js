class Avatar {
  constructor(valoria, url="assets/sophia.glb") { 
    this.valoria = valoria;
    this.url = url;
    this.camera = valoria.camera;
    this.domElement = valoria.el;
    this.cursor = {}
    this.speed = 6
    this.target = new THREE.Vector3()
    this.spherical = new THREE.Spherical()
    this.sphericalDelta = new THREE.Spherical()
    this.rotateSpeed = 1.0
    this.rotateStart = null
    this.rotateEnd = new THREE.Vector2()
    this.rotateDelta = new THREE.Vector2()
    this.enabled = false
    this.ranOnce = false
    this.activeAction
    this.lastAction
    this.domElement.onclick = () => {
        this.domElement.requestPointerLock()
    }
    const self = this;
    document.onpointerlockchange = (event) => {
      // console.log(this.domElement.pointerLockElement);
      if (document.pointerLockElement) {
          self.enabled = true
      } else {
          self.enabled = false
          self.ranOnce = false
      }
    }

    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  }

  load = async () => {
    const self = this;
    this.avatar = await this.valoria.loadModel(this.url)
    this.avatar.position.set(0, 0, 5);
    this.avatar.move = { forward: 0, left: 0 }
    this.avatar.lastMove = {};
    this.avatar.dirTarget = new THREE.Object3D()
    this.avatar.dirTarget.position.copy(this.avatar.position)
    this.camera.position.set(this.avatar.position.x, 2.5, this.avatar.position.z - 2)
    this.avatar.attach(this.camera)
    this.avatar.rotation.y = Math.PI / 2;
    this.camera.dirTarget = new THREE.Object3D()
    this.camera.attach(this.camera.dirTarget)
    this.camera.dirTarget.position.set(
      this.camera.position.x,
      this.camera.position.y,
      this.camera.position.z + 3
    )
    this.domElement.addEventListener('mousemove', (e) => {
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
  }

  update = (delta) => {
    if(!this.loaded) return;
    this.camera.dirTarget.position.set(
      this.camera.position.x + this.avatar.move.left * 10,
      this.camera.position.y,
      this.camera.position.z + this.avatar.move.forward * 20 - 2
    )
    var viewPos = this.camera.dirTarget.position
    var newView = new THREE.Vector3()
    newView.copy(viewPos)
    let pos = this.camera.dirTarget.getWorldPosition(newView)
    if (
      (this.avatar.move.forward !== 0 || this.avatar.move.left !== 0) &&
      (JSON.stringify(this.avatar.lastMove) !== JSON.stringify(this.avatar.move) ||
      JSON.stringify(this.camera.lastPosition) !== JSON.stringify(this.camera.position))
    ) {
      this.camera?.parent?.parent?.attach(this.camera)
      this.avatar.lookAt(
          this.avatar.position.x - (pos.x - this.avatar.position.x),
          this.avatar.position.y,
          this.avatar.position.z - (pos.z - this.avatar.position.z)
      )
      this.avatar.attach(this.camera)
    }
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
    let isMoving = this.avatar.move.forward !== 0 || this.avatar.move.left !== 0
    if (this.avatar.jump) {
      this.avatar.setAction("Jump")
    } else if (!this.avatar.jump) {
      if (isMoving) {
        this.avatar.setAction("Run")
      } else {
        if (this.avatar.dancing) {
          this.avatar.setAction("Dance")
        } else {
          this.avatar.setAction("Idle")
        }
      }
    }
    let velocity = isMoving ? 1 : 0
    this.avatar.translateZ(velocity * this.speed * delta)
    this.avatar.lastMove = Object.assign({}, this.avatar.move)
    this.sphericalDelta.set(0, 0, 0)
    this.camera.lookAt(
      this.avatar.position.x,
      this.avatar.position.y + 1,
      this.avatar.position.z
    )
    this.camera.lastPos = Object.assign({}, this.camera.position)
    this.ranOnce = true
    if (!this.enabled && this.ranOnce) return
  }

  handleKeyDown = (e) => {
    if(e.code == "KeyW"){
      this.avatar.move["forward"] = 1;
    }
    if(e.code == "KeyA"){
      this.avatar.move["left"] = 1;
    }
    if(e.code == "KeyS"){
      this.avatar.move["forward"] = -1;
    }
    if(e.code == "KeyD"){
      this.avatar.move["left"] = -1;
    }
  }

  handleKeyUp = (e) => {
    if(e.code == "KeyW"){
      this.avatar.move["forward"] = 0;
    }
    if(e.code == "KeyA"){
      this.avatar.move["left"] = 0;
    }
    if(e.code == "KeyS"){
      this.avatar.move["forward"] = 0;
    }
    if(e.code == "KeyD"){
      this.avatar.move["left"] = 0;
    }
  }

}

