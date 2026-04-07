const App = (() => {

    const state = {
      username: null,
      userId: null,
      roomId: null,
    };
  
    function init() {
      // Init Firebase early
      FB.init();
  
      // Wire up input events
      document.getElementById("usernameInput").addEventListener("keydown", e => {
        if (e.key === "Enter") setIdentity();
      });
  
      document.getElementById("msgInput").addEventListener("keydown", e => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); Chat.send(); }
      });
  
      document.getElementById("msgInput").addEventListener("input", function() {
        // Auto-resize
        this.style.height = "";
        this.style.height = Math.min(this.scrollHeight, 100) + "px";
        // Typing indicator
        Chat.onInputChange();
      });
  
      // Init panic
      // Panic.init();
  
      // Show first screen
      UI.showScreen("identityScreen");
    }
  
    function setIdentity() {
      const input = document.getElementById("usernameInput");
      const name = input.value.trim();
      const err = document.getElementById("usernameErr");
  
      err.textContent = "";
  
      if (!name || name.length < 2) {
        err.textContent = "name must be at least 2 characters";
        return;
      }
      if (name.length > 20) {
        err.textContent = "name too long";
        return;
      }
  
      state.username = name;
      // Generate a stable userId for this session
      state.userId = "u_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  
      document.getElementById("lobbyUsername").textContent = name;
      UI.showScreen("lobbyScreen");
    }
  
    function reset() {
      state.username = null;
      state.userId = null;
      state.roomId = null;
  
      // Destroy Firebase
      //FB.destroy();
  
      // Clear inputs
      document.getElementById("usernameInput").value = "";
      document.getElementById("usernameErr").textContent = "";
      document.getElementById("createRoomName").value = "";
      document.getElementById("createRoomPass").value = "";
      document.getElementById("joinRoomId").value = "";
      document.getElementById("joinRoomPass").value = "";
  
      // Re-init Firebase
      FB.init();
    }
  
    // Expose
    return { state, init, setIdentity, reset };
  })();

// Boot
document.addEventListener("DOMContentLoaded", App.init);