const valoriaEvents = {
  "Joined world": joinedWorld,
  "Got ice candidate": gotIceCandidate,
  "Got rtc description": gotRTCDescription,
  "Peer has left world": peerHasLeftWorld
}

async function joinedWorld(ws, data){
  const self = ws.valoria;
  const peerList = Object.keys(data.peers);
  for(let i=0;i<peerList.length;i++){
    try {
      await self.p2pConnect(peerList[i]);
      await self.world.addPlayer(data.peers[peerList[i]]);
    } catch(e){
      // console.log(e)
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
    const world = data.world || "Valoria";
    const avatar = data.avatar || self.avatar.defaultUrl;
    const metadata = data.metadata || {};
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
        // console.log("datachannel open")
        // console.log(self.peers[data.id]);
        if(world == self.world.name){
          self.world.addPlayer({id: data.id, avatar, metadata});
        }
        // self.peers[data.id].dc.send('Hi back!');
      }
      self.peers[data.id].dc.onmessage = function(e) {
        const d = JSON.parse(e.data);
        const event = d.event;
        if(self.peers[data.id].subscribed[event]) self.peers[data.id].subscribed[event](d.data);
      }
      self.peers[data.id].dc.onclose = () => {
        if(self.world.players[data.id]) self.world.removePlayer(data.id);
      }
    }
  } catch(e){
    // console.log(e)
  }
}

async function peerHasLeftWorld(ws, data){
  const self = ws.valoria;
  if(self.world.name == data.world && self.world.players[data.id]) self.world.removePlayer(data.id);
}