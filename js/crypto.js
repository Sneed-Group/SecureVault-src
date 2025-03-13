/**
 * Crypto utility functions for SecureVault
 * Handles encryption and decryption of data
 */

const SecureVaultCrypto = (function() {
  // Private variables
  let _key = null;
  
  // Private methods
  const _deriveKey = function(password) {
    const salt = CryptoJS.lib.WordArray.random(128/8);
    const iterations = 10000;
    const keySize = 256/32;
    
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: keySize,
      iterations: iterations
    });
    
    return {
      key: key,
      salt: salt,
      iterations: iterations
    };
  };
  
  const _generateIV = function() {
    return CryptoJS.lib.WordArray.random(128/8);
  };
  
  // Public API
  return {
    /**
     * Initialize the crypto module
     */
    init: function() {
      if (typeof CryptoJS === 'undefined') {
        throw new Error('CryptoJS is required but not loaded');
      }
    },
    
    /**
     * Set the encryption key
     * @param {string} password - The password to derive the key from
     * @returns {Object} The derived key information
     */
    setKey: function(password) {
      const keyInfo = _deriveKey(password);
      _key = keyInfo.key;
      return keyInfo;
    },
    
    /**
     * Set the encryption key from existing key info
     * @param {Object} keyInfo - The key information
     */
    setKeyFromInfo: function(keyInfo) {
      _key = CryptoJS.PBKDF2(keyInfo.password, CryptoJS.enc.Hex.parse(keyInfo.salt), {
        keySize: 256/32,
        iterations: keyInfo.iterations
      });
    },
    
    /**
     * Clear the encryption key
     */
    clearKey: function() {
      _key = null;
    },
    
    /**
     * Check if a key is set
     * @returns {boolean} True if a key is set
     */
    hasKey: function() {
      return _key !== null;
    },
    
    /**
     * Encrypt data
     * @param {*} data - The data to encrypt
     * @returns {string} The encrypted data
     */
    encrypt: function(data) {
      if (!_key) {
        throw new Error('No encryption key set');
      }
      
      const iv = _generateIV();
      const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), _key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      return iv.toString() + encrypted.toString();
    },
    
    /**
     * Decrypt data
     * @param {string} encrypted - The encrypted data
     * @returns {*} The decrypted data
     */
    decrypt: function(encrypted) {
      if (!_key) {
        throw new Error('No encryption key set');
      }
      
      try {
        const iv = CryptoJS.enc.Hex.parse(encrypted.substr(0, 32));
        const ciphertext = encrypted.substr(32);
        
        const decrypted = CryptoJS.AES.decrypt(ciphertext, _key, {
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        });
        
        return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
      } catch (error) {
        throw new Error('Failed to decrypt data: ' + error.message);
      }
    },
    
    /**
     * Convert a file to base64
     * @param {File} file - The file to convert
     * @returns {Promise<string>} The base64 string
     */
    fileToBase64: function(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = () => {
          resolve(reader.result);
        };
        
        reader.onerror = () => {
          reject(new Error('Failed to read file'));
        };
        
        reader.readAsDataURL(file);
      });
    }
  };
})();

// Add to window for global access
window.SecureVaultCrypto = SecureVaultCrypto; 