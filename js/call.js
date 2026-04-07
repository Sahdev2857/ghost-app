const CallManager = (() => {

    let roomId = null;
    let sigRef = null;
    let callRef = null;
    let peerConn = null;
    let localStream = null;
    let callType = null; // "voice" | "video"
    let callState = "idle"; // idle | calling | ringing | connected | ended
    let callSeconds = 0;
    let callInterval = null;
    let isMuted = false;
    let camOff = false;
    let incomingCallData = null;
    let callListener = null;
  
    function init(id) {
      roomId = id;
      sigRef = FB.ref("rooms/" + id + "/signal");
      callRef = FB.ref("rooms/" + id + "/call");
  
      // Listen for incoming calls
      callListener = callRef.on("value", snap => {
        const data = snap.val();
        if (!data) return;
  
        // Someone is calling and it's not us
        if (data.state === "calling" && data.callerId !== App.state.userId && callState === "idle") {
          _showIncomingCall(data);
        }
  
        // Call was ended by the other side
        if (data.state === "ended" && callState === "connected") {
          _handleRemoteEnd();
        }
      });
    }
  
    function destroy() {
      endCall();
      if (callRef && callListener) { callRef.off("value", callListener); }
      sigRef = null; callRef = null; roomId = null;
    }
  
    async function startCall(type) {
      if (callState !== "idle") { UI.toast("already in a call"); return; }
      if (!FB.isReady()) { UI.toast("not connected"); return; }
  
      callType = type;
      callState = "calling";
  
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === "video"
        });
      } catch(e) {
        UI.toast("mic/camera permission needed");
        callState = "idle";
        return;
      }
  
      // Show call overlay
      _showCallOverlay("calling...", "ringing");
  
      // Set local video
      if (type === "video") {
        const lv = document.getElementById("localVideo");
        lv.srcObject = localStream;
        lv.style.display = "block";
        document.getElementById("callAvatarCenter").style.display = "none";
      }
  
      // Post call invite to Firebase
      await callRef.set({
        callerId: App.state.userId,
        callerName: App.state.username,
        type: callType,
        state: "calling",
        ts: Date.now()
      });
  
      // Setup WebRTC as caller
      await _setupRTC(true);
  
      // Timeout if no answer in 30s
      setTimeout(() => {
        if (callState === "calling") {
          UI.toast("no answer");
          endCall();
        }
      }, 30000);
    }
  
    function _showIncomingCall(data) {
      incomingCallData = data;
      callState = "ringing";
  
      document.getElementById("incomingAvatar").textContent = UI.avatar(data.callerName);
      document.getElementById("incomingCallerName").textContent = data.callerName || "someone";
      document.getElementById("incomingCallType").textContent = (data.type || "voice") + " call";
  
      document.getElementById("incomingCallModal").classList.remove("hidden");
    }
  
    async function acceptCall() {
      document.getElementById("incomingCallModal").classList.add("hidden");
      if (!incomingCallData) return;
  
      callType = incomingCallData.type || "voice";
      callState = "connected";
  
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === "video"
        });
      } catch(e) {
        UI.toast("mic/camera permission needed");
        callState = "idle";
        return;
      }
  
      _showCallOverlay(incomingCallData.callerName, "connecting");
  
      if (callType === "video") {
        const lv = document.getElementById("localVideo");
        lv.srcObject = localStream;
        lv.style.display = "block";
        document.getElementById("callAvatarCenter").style.display = "none";
      }
  
      document.getElementById("callBigAvatar").textContent = UI.avatar(incomingCallData.callerName);
      document.getElementById("callOverlayName").textContent = incomingCallData.callerName;
  
      // Setup WebRTC as answerer
      await _setupRTC(false);
      incomingCallData = null;
    }
  
    function rejectCall() {
      document.getElementById("incomingCallModal").classList.add("hidden");
      incomingCallData = null;
      callState = "idle";
      callRef.update({ state: "rejected" });
    }
  
    async function _setupRTC(isCaller) {
      peerConn = new RTCPeerConnection({ iceServers: CONFIG.iceServers });
  
      localStream.getTracks().forEach(t => peerConn.addTrack(t, localStream));
  
      peerConn.ontrack = e => {
        const stream = e.streams[0];
        if (callType === "video") {
          const rv = document.getElementById("remoteVideo");
          rv.srcObject = stream;
          rv.style.display = "block";
          document.getElementById("callAvatarCenter").style.display = "none";
        } else {
          const audio = document.createElement("audio");
          audio.className = "ghost-audio";
          audio.srcObject = stream;
          audio.autoplay = true;
          document.body.appendChild(audio);
        }
        _onConnected();
      };
  
      peerConn.onicecandidate = e => {
        if (e.candidate) {
          sigRef.child(App.state.userId + "/ice").push(e.candidate.toJSON());
        }
      };
  
      peerConn.onconnectionstatechange = () => {
        const s = peerConn.connectionState;
        if (s === "connected") _onConnected();
        if (s === "failed" || s === "disconnected") {
          UI.toast("call disconnected");
          endCall();
        }
      };
  
      if (isCaller) {
        // Create offer
        const offer = await peerConn.createOffer();
        await peerConn.setLocalDescription(offer);
        await sigRef.child(App.state.userId + "/offer").set({
          sdp: offer.sdp, type: offer.type, from: App.state.userId, ts: Date.now()
        });
  
        // Listen for answer
        sigRef.on("child_added", async snap => {
          if (snap.key === App.state.userId) return;
          const data = snap.val();
          if (data?.answer && !peerConn.currentRemoteDescription) {
            await peerConn.setRemoteDescription(new RTCSessionDescription(data.answer));
            callState = "connected";
          }
          if (data?.ice) {
            Object.values(data.ice).forEach(c => {
              if (peerConn.remoteDescription) {
                peerConn.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
              }
            });
          }
        });
  
      } else {
        // Find offer from caller
        const offerSnap = await sigRef.orderByChild("offer/from").once("value");
        let offerData = null;
  
        offerSnap.forEach(child => {
          const val = child.val();
          if (val?.offer && child.key !== App.state.userId) {
            offerData = { key: child.key, ...val.offer };
          }
        });
  
        if (!offerData) { UI.toast("call offer not found"); endCall(); return; }
  
        await peerConn.setRemoteDescription(new RTCSessionDescription(offerData));
        const answer = await peerConn.createAnswer();
        await peerConn.setLocalDescription(answer);
        await sigRef.child(App.state.userId + "/answer").set({
          sdp: answer.sdp, type: answer.type, from: App.state.userId
        });
  
        // Listen for caller's ICE
        sigRef.child(offerData.key + "/ice").on("value", snap => {
          const ices = snap.val();
          if (!ices) return;
          Object.values(ices).forEach(c => {
            if (peerConn.remoteDescription) {
              peerConn.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
            }
          });
        });
      }
    }
  
    function _onConnected() {
      callState = "connected";
      document.getElementById("callOverlayStatus").textContent = "connected";
      _startTimer();
      callRef.update({ state: "connected" });
    }
  
    function _handleRemoteEnd() {
      UI.toast("call ended by other person");
      endCall();
    }
  
    function endCall() {
      if (callState === "idle") return;
  
      callState = "ended";
      _stopTimer();
      isMuted = false;
      camOff = false;
  
      if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
      if (peerConn) { peerConn.close(); peerConn = null; }
  
      document.querySelectorAll("audio.ghost-audio").forEach(a => a.remove());
  
      const rv = document.getElementById("remoteVideo");
      const lv = document.getElementById("localVideo");
      rv.srcObject = null; rv.style.display = "none";
      lv.srcObject = null; lv.style.display = "none";
  
      document.getElementById("callOverlay").classList.add("hidden");
      document.getElementById("incomingCallModal").classList.add("hidden");
      document.getElementById("callAvatarCenter").style.display = "flex";
  
      const muteBtn = document.getElementById("muteBtn");
      const camBtn = document.getElementById("cameraBtn");
      if (muteBtn) muteBtn.classList.remove("muted");
      if (camBtn) camBtn.classList.remove("cam-off");
  
      if (callRef) callRef.update({ state: "ended" });
      if (sigRef) sigRef.remove().catch(() => {});
  
      callState = "idle";
      callType = null;
    }
  
    function toggleMute() {
      if (!localStream) return;
      isMuted = !isMuted;
      localStream.getAudioTracks().forEach(t => t.enabled = !isMuted);
      const btn = document.getElementById("muteBtn");
      btn.classList.toggle("muted", isMuted);
      btn.querySelector("span").textContent = isMuted ? "unmute" : "mute";
    }
  
    function toggleCamera() {
      if (!localStream) return;
      camOff = !camOff;
      localStream.getVideoTracks().forEach(t => t.enabled = !camOff);
      const btn = document.getElementById("cameraBtn");
      btn.classList.toggle("cam-off", camOff);
      btn.querySelector("span").textContent = camOff ? "cam off" : "camera";
    }
  
    function _showCallOverlay(name, status) {
      document.getElementById("callOverlayName").textContent = name;
      document.getElementById("callOverlayStatus").textContent = status;
      document.getElementById("callTimer").textContent = "00:00";
      document.getElementById("callBigAvatar").textContent = UI.avatar(name);
      document.getElementById("callOverlay").classList.remove("hidden");
    }
  
    function _startTimer() {
      callSeconds = 0;
      callInterval = setInterval(() => {
        callSeconds++;
        const m = String(Math.floor(callSeconds / 60)).padStart(2, "0");
        const s = String(callSeconds % 60).padStart(2, "0");
        document.getElementById("callTimer").textContent = m + ":" + s;
      }, 1000);
    }
  
    function _stopTimer() {
      clearInterval(callInterval);
      callInterval = null;
      callSeconds = 0;
    }
  
    return { init, destroy, startCall, acceptCall, rejectCall, endCall, toggleMute, toggleCamera };
  })();