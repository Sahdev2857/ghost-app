const Rooms = (() => {

  let currentRoom = null;
  let presenceRef = null;
  let membersListener = null;

  // ───────── CREATE ROOM ─────────
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

      prompt("Share this Room ID:", roomId);

      await _enterRoom(roomId, roomData, pass);

    } catch(e) {
      err.textContent = "error: " + e.message;
      console.error("[Rooms.create]", e);
    }
  }

  // ───────── JOIN ROOM ─────────
  async function join() {
    const roomId = document.getElementById("joinRoomId").value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    const pass = document.getElementById("joinRoomPass").value;
    const err  = document.getElementById("joinErr");

    err.textContent = "";

    if (!roomId) { err.textContent = "enter a room ID"; return; }
    if (!pass)   { err.textContent = "enter the passphrase"; return; }

    if (!FB.isReady()) FB.init();

    try {
      const snap = await FB.ref("rooms/" + roomId + "/meta").get();

      if (!snap.exists()) {
        err.textContent = "room not found";
        return;
      }

      const roomData = snap.val();
      const passHash = await Crypto.hashPassphrase(pass);

      if (passHash !== roomData.passHash) {
        err.textContent = "wrong passphrase";
        return;
      }

      const membersSnap = await FB.ref("rooms/" + roomId + "/members").get();
      const members = membersSnap.val() || {};
      const onlineCount = Object.values(members).filter(m => m.online).length;

      if (onlineCount >= roomData.maxUsers) {
        err.textContent = "room is full (" + roomData.maxUsers + " max)";
        return;
      }

      await _enterRoom(roomId, roomData, pass);

    } catch(e) {
      err.textContent = "error: " + e.message;
      console.error("[Rooms.join]", e);
    }
  }

  // ───────── ENTER ROOM (FIXED) ─────────
  async function _enterRoom(roomId, roomData, pass) {
    currentRoom = { id: roomId, ...roomData };
    App.state.roomId = roomId;

    // 🔥 SAVE FOR AUTO REJOIN
    localStorage.setItem("ghost_room_id", roomId);
    localStorage.setItem("ghost_room_pass", pass);

    // ───────── PRESENCE ─────────
    const userId = App.state.userId;

    presenceRef = FB.ref("rooms/" + roomId + "/members/" + userId);

    const memberData = {
      name: App.state.username,
      online: true,
      joinedAt: Date.now(),
      lastSeen: Date.now()
    };

    await presenceRef.set(memberData);

    // 🔥 PROPER DISCONNECT HANDLING
    presenceRef.child("online").onDisconnect().set(false);
    presenceRef.child("lastSeen").onDisconnect().set(Date.now());

    // ───────── MEMBERS LISTENER ─────────
    _listenMembers(roomId);

    // ───────── UI ─────────
    UI.updateRoomUI(currentRoom);
    UI.showScreen("appScreen");
    UI.setConnStatus(true);

    // ───────── CHAT ─────────
    Chat.addSystemMsg(App.state.username + " joined the room");
    Chat.init(roomId);

    // ───────── CALL ─────────
    CallManager.init(roomId);

    // ───────── FIREBASE SYSTEM MSG ─────────
    FB.ref("rooms/" + roomId + "/messages").push({
      type: "system",
      text: App.state.username + " joined",
      ts: Date.now()
    });
  }

  // ───────── MEMBERS LISTENER ─────────
  function _listenMembers(roomId) {
    const ref = FB.ref("rooms/" + roomId + "/members");
    ref.on("value", snap => {
      const members = snap.val() || {};
      UI.renderMembers(members);
    });
    membersListener = ref;
  }

  // ───────── LEAVE ROOM ─────────
  async function leave() {
    if (!currentRoom) return;

    if (presenceRef) {
      await presenceRef.update({ online: false, lastSeen: Date.now() });
      presenceRef.onDisconnect().cancel();
    }

    // 🔥 CLEAR AUTO JOIN
    localStorage.removeItem("ghost_room_id");
    localStorage.removeItem("ghost_room_pass");

    CallManager.endCall();
    Chat.destroy();
    CallManager.destroy();

    if (membersListener) {
      membersListener.off();
      membersListener = null;
    }

    currentRoom = null;
    App.state.roomId = null;
    presenceRef = null;

    document.getElementById("messagesArea").innerHTML = `
      <div class="empty-chat">
        <div>💬</div>
        <div>no messages yet</div>
      </div>`;

    UI.setConnStatus(false);
    UI.showScreen("lobbyScreen");
    UI.toast("left the room");
  }

  function getCurrent() {
    return currentRoom;
  }

  return { create, join, leave, getCurrent };

})();