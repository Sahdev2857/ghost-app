const UI = (() => {

    let toastTimeout = null;
  
    function showScreen(id) {
      document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
      const el = document.getElementById(id);
      if (el) el.classList.remove("hidden");
    }
  
    function toast(msg, duration = 2800) {
      const t = document.getElementById("toast");
      t.textContent = msg;
      t.classList.add("show");
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => t.classList.remove("show"), duration);
    }
  
    function setConnStatus(online, label = null) {
      const dot = document.getElementById("connDot");
      const lbl = document.getElementById("connLabel");
      if (!dot || !lbl) return;
      dot.classList.toggle("online", online);
      lbl.textContent = label || (online ? "connected" : "offline");
    }
  
    function avatar(name) {
      return (name || "?").charAt(0).toUpperCase();
    }
  
    function timeAgo(ts) {
      const now = Date.now();
      const diff = now - ts;
      if (diff < 60000) return "just now";
      if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
      return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
  
    function timeStr(ts) {
      return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
  
    function escapeHtml(t) {
      return String(t)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
    }
  
    function statusTick(status) {
      if (status === "seen") return '<span class="status-tick status-seen">✔✔</span>';
      if (status === "delivered") return '<span class="status-tick status-delivered">✔✔</span>';
      if (status === "sent") return '<span class="status-tick status-sent">✔</span>';
      return "";
    }
  
    function openSidebar() {
      document.getElementById("sidebar").classList.add("open");
    }
  
    function closeSidebar() {
      document.getElementById("sidebar").classList.remove("open");
    }
  
    function copyRoomId() {
      const id = document.getElementById("sidebarRoomId").textContent;
      navigator.clipboard.writeText(id).then(() => {
        toast("room ID copied!");
      }).catch(() => {
        toast("room ID: " + id);
      });
    }
  
    function updateRoomUI(room) {
      document.getElementById("topRoomName").textContent = room.name || "ghost";
      document.getElementById("sidebarRoomName").textContent = room.name || "ghost";
      document.getElementById("sidebarRoomId").textContent = room.id || "—";
    }
  
    function renderMembers(members) {
      const list = document.getElementById("membersList");
      const count = document.getElementById("memberCount");
      const meta = document.getElementById("topRoomMeta");
      if (!list) return;
  
      const entries = Object.values(members || {});
      const online = entries.filter(m => m.online);
  
      count.textContent = entries.length;
      meta.textContent = online.length + " online";
  
      list.innerHTML = "";
      entries.forEach(m => {
        const div = document.createElement("div");
        div.className = "member-item";
        div.innerHTML = `
          <div class="member-avatar">${avatar(m.name)}</div>
          <div class="member-info">
            <div class="member-name">${escapeHtml(m.name)}</div>
            <div class="member-status">${m.online ? "online" : timeAgo(m.lastSeen || 0)}</div>
          </div>
          <div class="member-online-dot ${m.online ? "online" : ""}"></div>
        `;
        list.appendChild(div);
      });
    }
  
    return {
      showScreen, toast, setConnStatus, avatar,
      timeStr, escapeHtml, statusTick,
      openSidebar, closeSidebar, copyRoomId,
      updateRoomUI, renderMembers
    };
  })();
  // ══════