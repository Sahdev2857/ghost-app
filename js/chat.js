
// ════════════════════════════════════════
//  CHAT — messages, status, typing
// ════════════════════════════════════════
const Chat = (() => {

    let roomId = null;
    let msgRef = null;
    let typingRef = null;
    let typingTimeout = null;
    let isTyping = false;
    const rendered = new Set();
  
    function init(id) {
      roomId = id;
      msgRef = FB.ref("rooms/" + id + "/messages");
      typingRef = FB.ref("rooms/" + id + "/typing");
  
      _listenMessages();
      _listenTyping();
    }
  
    function destroy() {
      if (msgRef) { msgRef.off(); msgRef = null; }
      if (typingRef) { typingRef.off(); typingRef = null; }
      rendered.clear();
      roomId = null;
      _stopTyping();
    }
  
    function send() {
      const input = document.getElementById("msgInput");
      const text = input.value.trim();
      if (!text || !msgRef) return;
  
      input.value = "";
      input.style.height = "";
      _stopTyping();
  
      const msg = {
        id: Crypto.generateMessageId(),
        type: "chat",
        text: text,
        sender: App.state.username,
        senderId: App.state.userId,
        ts: Date.now(),
        status: "sent"
      };
  
      msgRef.push(msg).catch(e => {
        UI.toast("failed to send message");
        console.error("[Chat.send]", e);
      });
    }
  
    function _listenMessages() {
      const cutoff = Date.now() - CONFIG.messageHistoryHours * 3600 * 1000;
      msgRef.orderByChild("ts").startAt(cutoff).on("child_added", snap => {
        const msg = snap.val();
        const key = snap.key;
        if (!msg) return;
  
        // Mark delivered if not mine and status is "sent"
        if (msg.type === "chat" && msg.senderId !== App.state.userId && msg.status === "sent") {
          msgRef.child(key).update({ status: "delivered" });
        }
  
        _renderMsg(msg, key);
      });
  
      // Listen for status updates to re-render ticks
      msgRef.on("child_changed", snap => {
        const msg = snap.val();
        const key = snap.key;
        if (!msg || msg.type !== "chat") return;
        _updateMsgStatus(key, msg.status);
  
        // Mark seen if we're looking at it and it's not ours
        if (msg.senderId !== App.state.userId && msg.status === "delivered") {
          msgRef.child(key).update({ status: "seen" });
        }
      });
    }
  
    function _listenTyping() {
      typingRef.on("value", snap => {
        const data = snap.val() || {};
        const othersTyping = Object.entries(data)
          .filter(([uid, val]) => uid !== App.state.userId && val === true)
          .map(([uid]) => uid);
  
        if (othersTyping.length > 0) {
          // Get their names from members
          const membersRef = FB.ref("rooms/" + roomId + "/members");
          membersRef.once("value", mSnap => {
            const members = mSnap.val() || {};
            const names = othersTyping.map(uid => members[uid]?.name || "someone");
            document.getElementById("typingName").textContent = names.join(", ") + " typing...";
            document.getElementById("typingBar").style.display = "flex";
          });
        } else {
          document.getElementById("typingBar").style.display = "none";
        }
      });
    }
  
    function onInputChange() {
      if (!typingRef) return;
      if (!isTyping) {
        isTyping = true;
        typingRef.child(App.state.userId).set(true);
      }
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(_stopTyping, CONFIG.typingDebounce);
    }
  
    function _stopTyping() {
      isTyping = false;
      clearTimeout(typingTimeout);
      if (typingRef) typingRef.child(App.state.userId).set(false);
    }
  
    function _renderMsg(msg, key) {
      const dedupKey = key || (msg.ts + msg.senderId);
      if (rendered.has(dedupKey)) return;
      rendered.add(dedupKey);
  
      const area = document.getElementById("messagesArea");
      const empty = document.getElementById("emptyChat");
      if (empty) empty.remove();
  
      if (msg.type === "system") {
        const div = document.createElement("div");
        div.className = "system-msg";
        div.textContent = msg.text;
        area.appendChild(div);
        _scrollBottom();
        return;
      }
  
      const isMine = msg.senderId === App.state.userId;
  
      const group = document.createElement("div");
      group.className = "msg-group";
      group.dataset.msgKey = key;
  
      const senderDiv = document.createElement("div");
      senderDiv.className = "msg-sender" + (isMine ? " mine" : "");
      senderDiv.textContent = msg.sender || "unknown";
  
      const msgDiv = document.createElement("div");
      msgDiv.className = "msg " + (isMine ? "mine" : "theirs");
      msgDiv.dataset.key = key;
  
      msgDiv.innerHTML =
        UI.escapeHtml(msg.text) +
        '<div class="msg-meta">' +
          UI.timeStr(msg.ts) +
          (isMine ? " " + UI.statusTick(msg.status) : "") +
        "</div>";
  
      group.appendChild(senderDiv);
      group.appendChild(msgDiv);
      area.appendChild(group);
      _scrollBottom();
    }
  
    function _updateMsgStatus(key, status) {
      const msgDiv = document.querySelector(`.msg[data-key="${key}"]`);
      if (!msgDiv) return;
      const meta = msgDiv.querySelector(".msg-meta");
      if (!meta) return;
  
      const isMine = msgDiv.classList.contains("mine");
      if (!isMine) return;
  
      const ts = meta.textContent.split(" ")[0];
      meta.innerHTML = ts + " " + UI.statusTick(status);
    }
  
    function addSystemMsg(text) {
      const area = document.getElementById("messagesArea");
      const empty = document.getElementById("emptyChat");
      if (empty) empty.remove();
  
      const div = document.createElement("div");
      div.className = "system-msg";
      div.textContent = text;
      area.appendChild(div);
      _scrollBottom();
    }
  
    function _scrollBottom() {
      const area = document.getElementById("messagesArea");
      if (area) area.scrollTop = area.scrollHeight;
    }
  
    return { init, destroy, send, onInputChange, addSystemMsg };
  })();