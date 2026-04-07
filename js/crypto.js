const Crypto = (() => {

    async function hashPassphrase(passphrase) {
      const encoder = new TextEncoder();
      const data = encoder.encode(passphrase.trim().toLowerCase());
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    }
  
    function generateRoomId() {
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
      let id = "";
      for (let i = 0; i < 10; i++) {
        id += chars[Math.floor(Math.random() * chars.length)];
      }
      return id;
    }
  
    function generateMessageId() {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }
  
    return { hashPassphrase, generateRoomId, generateMessageId };
  })();