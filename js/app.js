const App = (() => {

  const state = {
    username: null,
    userId: null,
    roomId: null,
  };

  function init() {
    // Init Firebase
    FB.init();

    // 🔥 AUTO LOGIN (NEW)
    const savedName = localStorage.getItem("ghost_username");
    const savedId = localStorage.getItem("ghost_user_id");

    if (savedName && savedId) {
      state.username = savedName;
      state.userId = savedId;
    
      document.getElementById("lobbyUsername").textContent = savedName;
    
      // 🔥 AUTO REJOIN
      const lastRoom = localStorage.getItem("ghost_room_id");
      const lastPass = localStorage.getItem("ghost_room_pass");
    
      if (lastRoom && lastPass) {
        document.getElementById("joinRoomId").value = lastRoom;
        document.getElementById("joinRoomPass").value = lastPass;
    
        // auto join
        setTimeout(() => {
          Rooms.join();
        }, 300);
      } else {
        UI.showScreen("lobbyScreen");
      }
    
    } else {
      UI.showScreen("identityScreen");
    }

    // Input listeners
    document.getElementById("usernameInput").addEventListener("keydown", e => {
      if (e.key === "Enter") setIdentity();
    });

    document.getElementById("msgInput").addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        Chat.send();
      }
    });

    document.getElementById("msgInput").addEventListener("input", function () {
      this.style.height = "";
      this.style.height = Math.min(this.scrollHeight, 100) + "px";
      Chat.onInputChange();
    });

    // Panic disabled
    // Panic.init();
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

    // 🔥 SAVE NAME
    localStorage.setItem("ghost_username", name);

    // 🔥 GET OR CREATE USER ID
    let userId = localStorage.getItem("ghost_user_id");

    if (!userId) {
      userId = "u_" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("ghost_user_id", userId);
    }

    state.username = name;
    state.userId = userId;

    document.getElementById("lobbyUsername").textContent = name;

    UI.showScreen("lobbyScreen");
  }

  function reset() {
    state.username = null;
    state.userId = null;
    state.roomId = null;

    // 🔥 CLEAR STORAGE
    localStorage.removeItem("ghost_username");
    localStorage.removeItem("ghost_user_id");

    // Clear inputs
    document.getElementById("usernameInput").value = "";
    document.getElementById("usernameErr").textContent = "";
    document.getElementById("createRoomName").value = "";
    document.getElementById("createRoomPass").value = "";
    document.getElementById("joinRoomId").value = "";
    document.getElementById("joinRoomPass").value = "";

    FB.init();
    UI.showScreen("identityScreen");
  }

  return { state, init, setIdentity, reset };

})();

// Boot
document.addEventListener("DOMContentLoaded", App.init);