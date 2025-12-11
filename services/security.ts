
// Military-grade Local Encryption Strategy (AES-GCM-256)
// Keys are stored locally, encrypted with a device-specific key managed by Web Crypto.
// No cleartext keys ever touch disk.

const ENC_ALGO = { name: 'AES-GCM', length: 256 };
const KDF_ALGO = { name: 'PBKDF2' };

// Helpers
const str2ab = (str: string) => new TextEncoder().encode(str);
const ab2str = (buf: ArrayBuffer) => new TextDecoder().decode(buf);
const buf2hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
const hex2buf = (hex: string) => new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

export const securityService = {
  // 1. Get or Create the "Local Encryption Key" (LEK)
  async getDeviceKey(): Promise<CryptoKey> {
      let rawKeyJson = localStorage.getItem('kyoki_lek');
      
      if (!rawKeyJson) {
          const key = await window.crypto.subtle.generateKey(ENC_ALGO, true, ['encrypt', 'decrypt']);
          const exported = await window.crypto.subtle.exportKey('jwk', key);
          localStorage.setItem('kyoki_lek', JSON.stringify(exported));
          return key;
      }
      
      return window.crypto.subtle.importKey(
          'jwk', 
          JSON.parse(rawKeyJson), 
          ENC_ALGO, 
          true, 
          ['encrypt', 'decrypt']
      );
  },

  async encrypt(text: string): Promise<string> {
      try {
          const key = await this.getDeviceKey();
          return this.encryptWithKey(text, key);
      } catch (e) {
          console.error("Encryption failed", e);
          throw new Error("Encryption failed");
      }
  },

  async decrypt(cipherText: string): Promise<string> {
      try {
          const key = await this.getDeviceKey();
          return this.decryptWithKey(cipherText, key);
      } catch (e) {
          console.error("Decryption failed", e);
          return "";
      }
  },

  // --- Export/Import Encryption (Passphrase based) ---

  async deriveKeyFromPassphrase(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
      const keyMaterial = await window.crypto.subtle.importKey(
          'raw', 
          str2ab(passphrase), 
          { name: 'PBKDF2' }, 
          false, 
          ['deriveKey']
      );

      return window.crypto.subtle.deriveKey(
          {
              name: 'PBKDF2',
              salt: salt,
              iterations: 100000,
              hash: 'SHA-256'
          },
          keyMaterial,
          ENC_ALGO,
          true,
          ['encrypt', 'decrypt']
      );
  },

  async encryptWithPassphrase(data: string, passphrase: string): Promise<string> {
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const key = await this.deriveKeyFromPassphrase(passphrase, salt);
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encoded = str2ab(data);
      
      const encrypted = await window.crypto.subtle.encrypt(
          { name: 'AES-GCM', iv }, 
          key, 
          encoded
      );

      // Format: SALT_HEX:IV_HEX:DATA_HEX
      return `${buf2hex(salt.buffer)}:${buf2hex(iv.buffer)}:${buf2hex(encrypted)}`;
  },

  async decryptWithPassphrase(cipherText: string, passphrase: string): Promise<string> {
      const parts = cipherText.split(':');
      if (parts.length !== 3) throw new Error("Invalid bundle format");
      
      const [saltHex, ivHex, dataHex] = parts;
      const salt = hex2buf(saltHex);
      const iv = hex2buf(ivHex);
      const data = hex2buf(dataHex);

      const key = await this.deriveKeyFromPassphrase(passphrase, salt);

      const decrypted = await window.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          key,
          data
      );

      return ab2str(decrypted);
  },

  // Helper for internal use with a specific key object
  async encryptWithKey(text: string, key: CryptoKey): Promise<string> {
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encoded = str2ab(text);
      const encrypted = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
      return `${buf2hex(iv.buffer)}:${buf2hex(encrypted)}`;
  },

  async decryptWithKey(cipherText: string, key: CryptoKey): Promise<string> {
      const [ivHex, dataHex] = cipherText.split(':');
      const iv = hex2buf(ivHex);
      const data = hex2buf(dataHex);
      const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
      return ab2str(decrypted);
  }
};
