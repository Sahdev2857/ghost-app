const Panic = (() => {

    let tapCount = 0;
    let tapTimer = null;
  
    function init() {
      document.addEventListener("click", _onTap);
    }
  
    function _onTap(e) {
      // Show tap ring
      const ring = document.createElement("div");
      ring.className = "tap-ring";
      ring.style.left = e.clientX + "px";
      ring.style.top = e.clientY + "px";
      document.body.appendChild(ring);
      setTimeout(() => ring.remove(), 500);
  
      tapCount++;
      const hint = document.getElementById("panicHint");
  
      if (tapCount === 1) {
        hint.textContent = "tap " + (3 - tapCount) + " more to wipe";
        hint.classList.add("show");
      } else if (tapCount === 2) {
        hint.textContent = "tap 1 more to wipe";
      } else if (tapCount >= 3) {
        hint.classList.remove("show");
        tapCount = 0;
        clearTimeout(tapTimer);
        _wipe();
        return;
      }
  
      clearTimeout(tapTimer);
      tapTimer = setTimeout(() => {
        tapCount = 0;
        hint.classList.remove("show");
      }, 1600);
    }
  
    async function _wipe() {
      // End call
      try { CallManager.endCall(); } catch(e) {}
  
      // Delete all room data from Firebase
      const roomId = App.state.roomId;
      if (roomId && FB.isReady()) {
        try {
          await FB.ref("rooms/" + roomId + "/messages").remove();
          await FB.ref("rooms/" + roomId + "/signal").remove();
          await FB.ref("rooms/" + roomId + "/typing").remove();
        } catch(e) {}
      }
  
      // Show panic overlay
      const overlay = document.getElementById("panicOverlay");
      overlay.classList.add("active");
  
      document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
  
      setTimeout(() => {
        // Full reset
        App.reset();
        overlay.classList.remove("active");
        UI.showScreen("identityScreen");
      }, 1400);
    }
  
    return { init };
  })();