const Rooms = (() => {

    let currentRoom = null;
    let presenceRef = null;
    let membersListener = null;
  
    async function create() {
      const name = document.getElementById("createRoomName").value.trim();
      const pass = document.getElementById("createRoomPass").value;
      const max  = parseInt(document.getElementById("createRoomMax").value);
      const customIdInput = document.getElementById("createRoomId").value;
      const err  = document.getElementById("createErr");
    
      err.textContent = "";
    
      if (!name) {
        err.textContent = "enter a room name";
        return;
      }
    
      if (pass.length < 4) {
        err.textContent = "passphrase must be at least 4 chars";
        return;
      }
    
      // 🔥 CUSTOM ROOM ID
      const roomId = customIdInput
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    
      if (!roomId || roomId.length < 4) {
        err.textContent = "room key must be at least 4 letters/numbers";
        return;
      }
    
      if (!FB.isReady()) FB.init();
    
      try {
        // 🔥 CHECK IF ROOM EXISTS
        const existing = await FB.ref("rooms/" + roomId + "/meta").get();
    
        if (existing.exists()) {
          err.textContent = "room key already taken";
          return;
        }
    
        const passHash = await Crypto.hashPassphrase(pass);
    
        const roomData = {
          id: roomId,
          name: name,
          passHash: passHash,
          maxUsers: max,
          createdBy: App.state.username,
          createdAt: Date.now()
        };
    
        await FB.ref("rooms/" + roomId + "/meta").set(roomData);
    
        console.log("CREATED ROOM ID:", roomId);
    
        // Better UX
        prompt("Share this Room ID:", roomId);
    
        await _enterRoom(roomId, roomData);
    
      } catch(e) {
        err.textContent = "error: " + e.message;
        console.error("[Rooms.create]", e);
      }
    }
  
    async function join() {
      const roomId = document.getElementById("joinRoomId").value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
      const pass   = document.getElementById("joinRoomPass").value;
      const err    = document.getElementById("joinErr");
  
      err.textContent = "";
  
      if (!roomId) { err.textContent = "enter a room ID"; return; }
      if (!pass)   { err.textContent = "enter the passphrase"; return; }
  
      if (!FB.isReady()) FB.init();
  
      try {
        console.log("JOINING ROOM:", roomId);

const snap = await FB.ref("rooms/" + roomId + "/meta").get();

console.log("SNAP EXISTS:", snap.exists(), snap.val());
  
        if (!snap.exists()) {
          err.textContent = "room not found";
          return;
        }
  
        const roomData = snap.val();
        const passHash = await Crypto.hashPassphrase(pass);
  
        // Validate passphrase
        if (passHash !== roomData.passHash) {
          err.textContent = "wrong passphrase";
          return;
        }
  
        // Check capacity
        const membersSnap = await FB.ref("rooms/" + roomId + "/members").get();
        const members = membersSnap.val() || {};
        const onlineCount = Object.values(members).filter(m => m.online).length;
  
        if (onlineCount >= roomData.maxUsers) {
          err.textContent = "room is full (" + roomData.maxUsers + " max)";
          return;
        }
  
        await _enterRoom(roomId, roomData);
  
      } catch(e) {
        err.textContent = "error: " + e.message;
        console.error("[Rooms.join]", e);
      }
    }
  
    async function _enterRoom(roomId, roomData) {
      currentRoom = { id: roomId, ...roomData };
      App.state.roomId = roomId;
  
      // Setup presence
      const userId = App.state.userId;
      presenceRef = FB.ref("rooms/" + roomId + "/members/" + userId);
  
      const memberData = {
        name: App.state.username,
        online: true,
        joinedAt: Date.now(),
        lastSeen: Date.now()
      };
  
      await presenceRef.set(memberData);
  
      // Auto-remove on disconnect
      presenceRef.onDisconnect().update({ online: false, lastSeen: Date.now() });
  
      // Listen for members
      _listenMembers(roomId);
  
      // Update UI
      UI.updateRoomUI(currentRoom);
      UI.showScreen("appScreen");
      UI.setConnStatus(true);
  
      // Add system message
      Chat.addSystemMsg(App.state.username + " joined the room");
  
      // Start chat listener
      Chat.init(roomId);
  
      // Init call signaling listener
      CallManager.init(roomId);
  
      // Add a join system msg to Firebase
      const sysRef = FB.ref("rooms/" + roomId + "/messages");
      sysRef.push({
        type: "system",
        text: App.state.username + " joined",
        ts: Date.now()
      });
    }
  
    function _listenMembers(roomId) {
      const ref = FB.ref("rooms/" + roomId + "/members");
      ref.on("value", snap => {
        const members = snap.val() || {};
        UI.renderMembers(members);
      });
      membersListener = ref;
    }
  
    async function leave() {
      if (!currentRoom) return;
  
      // Mark offline
      if (presenceRef) {
        await presenceRef.update({ online: false, lastSeen: Date.now() });
        presenceRef.onDisconnect().cancel();
      }
  
      // End any active call
      CallManager.endCall();
  
      // Stop chat listeners
      Chat.destroy();
  
      // Stop call listeners
      CallManager.destroy();
  
      // Stop members listener
      if (membersListener) { membersListener.off(); membersListener = null; }
  
      currentRoom = null;
      App.state.roomId = null;
      presenceRef = null;
  
      // Reset UI
      document.getElementById("messagesArea").innerHTML = `
        <div class="empty-chat" id="emptyChat">
          <div class="empty-icon">💬</div>
          <div class="empty-text">no messages yet</div>
        </div>`;
  
      UI.setConnStatus(false);
      UI.showScreen("lobbyScreen");
      UI.toast("left the room");
    }
  
    function getCurrent() { return currentRoom; }
  
    return { create, join, leave, getCurrent };
  })();