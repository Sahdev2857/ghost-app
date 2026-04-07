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
      function renderMembers(members) {
        const container = document.getElementById("membersList");
      
        if (!members || Object.keys(members).length === 0) {
          container.innerHTML = "<div class='empty'>no members</div>";
          return;
        }
      
        container.innerHTML = "";
      
        Object.values(members).forEach(member => {
          const div = document.createElement("div");
          div.className = "member";
      
          let status = "";
      
          if (member.online) {
            status = "<span class='online-dot'></span> online";
          } else {
            const diff = Date.now() - (member.lastSeen || 0);
            status = "last seen " + formatTime(diff);
          }
      
          div.innerHTML = `
            <div class="member-name">${member.name}</div>
            <div class="member-status">${status}</div>
          `;
      
          container.appendChild(div);
        });
      }
    }
  
    return {
      showScreen, toast, setConnStatus, avatar,
      timeStr, escapeHtml, statusTick,
      openSidebar, closeSidebar, copyRoomId,
      updateRoomUI, renderMembers
    };
  })();
  function formatTime(ms) {
    const sec = Math.floor(ms / 1000);
  
    if (sec < 60) return sec + "s ago";
  
    const min = Math.floor(sec / 60);
    if (min < 60) return min + "m ago";
  
    const hr = Math.floor(min / 60);
    if (hr < 24) return hr + "h ago";
  
    const day = Math.floor(hr / 24);
    return day + "d ago";
  }