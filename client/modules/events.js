const valoriaEvents = {
  "Joined dimension": joinedDimension,
  "Got ice candidate": gotIceCandidate,
  "Got rtc description": gotRTCDescription,
}

async function joinedDimension(ws, data){
  const self = ws.valoria;
  for(let i=0;i<data.peers.length;i++){
    try {
      await self.p2pConnect(data.peers[i]);
      await self.dimension.addPlayer(data.peers[i]);
    } catch(e){
      console.log(e)
    }
  }
}

async function gotIceCandidate(ws, data){
  const self = ws.valoria;
  if(!self.peers[data.id] || !self.peers[data.id].conn) return;
  const pc = self.peers[data.id].conn;
  try {
    await pc.addIceCandidate(data.candidate);
  } catch (e) {
    if (!self.peers[data.id].ignoreOffer) throw e;
  }
}

async function gotRTCDescription(ws, data){
  const self = ws.valoria;
  try {
    if(self.peers[data.id] && self.peers[data.id].dc && self.peers[data.id].dc.open) return;    
    if(!self.peers[data.id]) self.peers[data.id] = {
      makingOffer: false,
      ignoreOffer: false,
      srdAnswerPending: false,
      conn: new RTCPeerConnection({iceServers}),
      subscribed: {}
    }
    const description = data.description;
    const polite = data.polite;
    const dimension = data.dimension || "Valoria";
    const pc = self.peers[data.id].conn;
    const isStable =
      pc.signalingState == 'stable' ||
      (pc.signalingState == 'have-local-offer' && self.peers[data.id].srdAnswerPending);
    self.peers[data.id].ignoreOffer =
      description.type == 'offer' && !polite && (self.peers[data.id].makingOffer || !isStable);
    if (self.peers[data.id].ignoreOffer) {
      console.log('glare - ignoring offer');
      return;
    }
    self.peers[data.id].srdAnswerPending = description.type == 'answer';
    await pc.setRemoteDescription(description);
    self.peers[data.id].srdAnswerPending = false;
    if (description.type == 'offer') {
      if(pc.signalingState !== "have-remote-offer") throw "Remote offer not given";
      if(pc.remoteDescription.type !== "offer") throw "SRD didn't work";
      await pc.setLocalDescription();
      if(pc.signalingState !== "stable") throw 'onmessage racing with negotiationneeded';
      if(pc.localDescription.type !== "answer") throw 'onmessage SLD didnt work';
      ws.send(JSON.stringify({
        event: "Send rtc description",
        data: {
          id: data.id,
          description: pc.localDescription
        }
      }))
    } else {
      if(pc.remoteDescription.type !== "answer") throw 'Answer was not set';
      if(pc.signalingState !== "stable") throw '"Not answered"';
      pc.dispatchEvent(new Event('negotiated'));
    }
    pc.ondatachannel = function(event) {
      self.peers[data.id].dc = event.channel;
      self.peers[data.id].dc.onopen = function(event) {
        console.log("datachannel open")
        console.log(self.peers[data.id]);
        if(dimension == self.dimension.name){
          self.dimension.addPlayer(data.id);
        }
        // self.peers[data.id].dc.send('Hi back!');
      }
      self.peers[data.id].dc.onmessage = function(e) {
        const d = JSON.parse(e.data);
        const event = d.event;
        if(self.peers[data.id].subscribed[event]) self.peers[data.id].subscribed[event](d.data);
      }
      self.peers[data.id].dc.onclose = () => {
        if(self.dimension.players[data.id]) self.dimension.removePlayer(data.id);
      }
    }
  } catch(e){
    console.log(e)
  }
}