let isMobile = false
if (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent) ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.platform)
) {
    isMobile = true
}

class VRButton {
    static createButton(renderer, options) {
        if (options) {
            console.error(
                'THREE.VRButton: The "options" parameter has been removed. Please set the reference space type via renderer.xr.setReferenceSpaceType() instead.'
            )
        }

        const button = document.createElement('button')

        function showEnterVR(/*device*/) {
            let currentSession = null

            async function onSessionStarted(session) {
                session.addEventListener('end', onSessionEnded)

                await renderer.xr.setSession(session)
                button.textContent = 'EXIT VR'

                currentSession = session
            }

            function onSessionEnded(/*event*/) {
                currentSession.removeEventListener('end', onSessionEnded)

                button.textContent = 'ENTER VR'

                currentSession = null
            }

            //

            button.style.display = ''

            button.style.cursor = 'pointer'
            button.style.left = 'calc(50% - 50px)'
            button.style.width = '100px'

            button.textContent = 'ENTER VR'

            button.onmouseenter = function () {
                button.style.opacity = '1.0'
            }

            button.onmouseleave = function () {
                button.style.opacity = '0.5'
            }

            button.onclick = function () {
                if (currentSession === null) {
                    // WebXR's requestReferenceSpace only works if the corresponding feature
                    // was requested at session creation time. For simplicity, just ask for
                    // the interesting ones as optional features, but be aware that the
                    // requestReferenceSpace call will fail if it turns out to be unavailable.
                    // ('local' is always available for immersive sessions and doesn't need to
                    // be requested separately.)

                    const sessionInit = {
                        optionalFeatures: [
                            'local-floor',
                            'bounded-floor',
                            'hand-tracking',
                            'layers',
                        ],
                    }
                    navigator.xr.requestSession('immersive-vr', sessionInit).then(onSessionStarted)
                } else {
                    currentSession.end()
                }
            }
        }

        function disableButton() {
            button.style.display = ''

            button.style.cursor = 'auto'
            button.style.left = 'calc(50% - 75px)'
            button.style.width = '150px'

            button.onmouseenter = null
            button.onmouseleave = null

            button.onclick = null
        }

        function showWebXRNotFound() {
            disableButton()

            button.textContent = 'VR NOT SUPPORTED'

            button.style.display = 'none'
        }

        function showVRNotAllowed(exception) {
            disableButton()

            console.warn('Exception when trying to call xr.isSessionSupported', exception)

            button.textContent = 'VR NOT ALLOWED'
        }

        function stylizeElement(element) {
            element.style.position = 'absolute'
            element.style.bottom = '80px'
            element.style.padding = '12px 6px'
            element.style.border = '1px solid #fff'
            element.style.borderRadius = '4px'
            element.style.background = 'rgba(0,0,0,0.1)'
            element.style.color = '#fff'
            element.style.font = 'normal 13px sans-serif'
            element.style.textAlign = 'center'
            element.style.opacity = '0.5'
            element.style.outline = 'none'
            element.style.zIndex = '999'
        }

        if ('xr' in navigator) {
            button.id = 'VRButton'
            button.style.display = 'block';

            stylizeElement(button)

            navigator.xr
                .isSessionSupported('immersive-vr')
                .then(function (supported) {
                    supported ? showEnterVR() : showWebXRNotFound()

                    if (supported && VRButton.xrSessionIsGranted) {
                        button.click()
                    }
                })
                .catch(showVRNotAllowed)

            return button
        } else {
            const message = document.createElement('a')

            if (window.isSecureContext === false) {
                message.href = document.location.href.replace(/^http:/, 'https:')
                message.innerHTML = 'WEBXR NEEDS HTTPS' // TODO Improve message
            } else {
                message.href = 'https://immersiveweb.dev/'
                message.innerHTML = 'WEBXR NOT AVAILABLE'
            }

            message.style.left = 'calc(50% - 90px)'
            message.style.width = '180px'
            message.style.textDecoration = 'none'

            stylizeElement(message)

            message.style.display = 'none'

            return message
        }
    }

    static xrSessionIsGranted = false

    static registerSessionGrantedListener() {
        if ('xr' in navigator) {
            // WebXRViewer (based on Firefox) has a bug where addEventListener
            // throws a silent exception and aborts execution entirely.
            if (/WebXRViewer\//i.test(navigator.userAgent)) return

            navigator.xr.addEventListener('sessiongranted', () => {
                VRButton.xrSessionIsGranted = true
            })
        }
    }
}

VRButton.registerSessionGrantedListener()


class VR {
  constructor(valoria, opts){
    this.valoria = valoria;
    this.session = this.valoria.renderer.xr.getSession();
    this.setup();
  }

  setup () {
    this.button = VRButton.createButton(this.valoria.renderer);
    this.valoria.el.append(this.button)
    this.valoria.update("Valoria VR", (delta) => {
      this.session = this.valoria.renderer.xr.getSession()
      if (!this.session) return
      this.valoria.avatar.model.visible = false;
      for (let source of this.session.inputSources) {
        if (!source || !source.gamepad || !source.handedness) continue
        if(source.handedness == "left"){
          this.left = source;
        } else if(source.handedness == "right"){
          this.right = source;
        }
        let axes = source.gamepad.axes.slice(0)
        axes.forEach((value, i) => {
          if (Math.abs(value) > 0.2) {
            if (i == 2) {
              if (source.handedness == 'left') {
                if (axes[i] < 0) {
                  this.valoria.avatar.model.move['left'] = 1
                } else if (axes[i] > 0) {
                  this.valoria.avatar.model.move['left'] = -1
                }
              } else {
                if (axes[i] < 0) {
                  this.valoria.avatar.model.rotation.y += 0.03
                } else if (axes[i] > 0) {
                  this.valoria.avatar.model.rotation.y -= 0.03
                }
              }
            }
            if (i == 3) {
                if (source.handedness == 'left') {
                    if (axes[i] < 0) {
                      this.valoria.avatar.model.move['forward'] = 1
                    } else if (axes[i] > 0) {
                      this.valoria.avatar.model.move['forward'] = -1
                    }
                } else {
                }
            }
          } else {
       
          }
        })
      }
    })
  }

}


