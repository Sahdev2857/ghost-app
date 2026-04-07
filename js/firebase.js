const CONFIG = {
    firebase: {
      apiKey: "AIzaSyADzMVDweO70bTVh_QeiJ-mzvxm3JZgr1c",
      authDomain: "ca-imp-questions.firebaseapp.com",
      databaseURL: "https://ca-imp-questions-default-rtdb.asia-southeast1.firebasedatabase.app",
      projectId: "ca-imp-questions",
      storageBucket: "ca-imp-questions.firebasestorage.app",
      messagingSenderId: "665546366323",
      appId: "1:665546366323:web:5fc3c659317c4883daf906"
    },
  
    // TURN server credentials — paste yours here
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: "turn:global.relay.metered.ca:80",
        username: "PASTE_YOUR_TURN_USERNAME",
        credential: "PASTE_YOUR_TURN_CREDENTIAL"
      },
      {
        urls: "turn:global.relay.metered.ca:443",
        username: "PASTE_YOUR_TURN_USERNAME",
        credential: "PASTE_YOUR_TURN_CREDENTIAL"
      },
      {
        urls: "turn:global.relay.metered.ca:443?transport=tcp",
        username: "PASTE_YOUR_TURN_USERNAME",
        credential: "PASTE_YOUR_TURN_CREDENTIAL"
      }
    ],
  
    // DB root path — your secret namespace
    dbRoot: "ghost_zx9k_private",
  
    // Typing debounce ms
    typingDebounce: 2000,
  
    // Max message history (last N hours)
    messageHistoryHours: 24,
  };
  // ════════════════════════════════════════
  //  FIREBASE — init and DB helpers
  // ════════════════════════════════════════
  const FB = (() => {
    let db = null;
    let initialized = false;
  
    function init() {
      if (initialized) return;
      try {
        firebase.initializeApp(CONFIG.firebase);
        db = firebase.database();
        initialized = true;
        console.log("[FB] initialized");
      } catch(e) {
        console.error("[FB] init error:", e);
        UI.toast("firebase error: " + e.message);
      }
    }
  
    function ref(path) {
      if (!firebase.apps.length) {
        firebase.initializeApp(CONFIG.firebase);
        db = firebase.database();
        initialized = true;
      }
    
      if (!db) {
        db = firebase.database();
      }
    
      return db.ref(CONFIG.dbRoot + "/" + path);
    }
  
    function rootRef(path) {
      if (!db) init();
      return db.ref(path);
    }
  
    function isReady() { return initialized && db !== null; }
  
    function destroy() {
        try {
          if (firebase.apps.length) {
            firebase.app().delete();
          }
        } catch(e) {
          console.warn("Firebase delete error:", e);
        }
        db = null;
        initialized = false;
      }
    return { init, ref, rootRef, isReady, destroy };
  })();