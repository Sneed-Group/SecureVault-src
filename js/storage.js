/**
 * Storage utility functions for SecureVault
 * Handles database operations and storage
 */

const SecureVaultStorage = (function() {
  // Private variables
  let _db = null;
  let _keyInfo = null;
  
  // Database structure
  const _collections = {
    docs: {},
    photos: {},
    files: {}
  };
  
  // Private methods
  const _generateId = function() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };
  
  const _addTimestamps = function(item, isNew = false) {
    const now = Date.now();
    if (isNew) {
      item.createdAt = now;
    }
    item.updatedAt = now;
    return item;
  };
  
  // Public API
  return {
    /**
     * Initialize the storage module
     */
    init: function() {
      if (typeof CryptoJS === 'undefined') {
        throw new Error('CryptoJS is required but not loaded');
      }
    },
    
    /**
     * Create a new encrypted database
     * @param {string} password - The password to encrypt the database with
     */
    createDatabase: function(password) {
      return new Promise((resolve, reject) => {
        try {
          // Generate new key
          _keyInfo = SecureVaultCrypto.setKey(password);
          
          // Initialize empty database
          _db = JSON.parse(JSON.stringify(_collections));
          
          resolve();
        } catch (error) {
          reject(new Error('Failed to create database: ' + error.message));
        }
      });
    },
    
    /**
     * Save the database to a file
     * @returns {Promise<string>} The encrypted database
     */
    saveDatabase: function() {
      return new Promise((resolve, reject) => {
        if (!_db || !SecureVaultCrypto.hasKey()) {
          reject(new Error('No database loaded or no encryption key set'));
          return;
        }
        
        try {
          // Add key info to database
          const dbWithKey = {
            keyInfo: _keyInfo,
            data: _db
          };
          
          // Encrypt database
          const encrypted = SecureVaultCrypto.encrypt(dbWithKey);
          resolve(encrypted);
        } catch (error) {
          reject(new Error('Failed to save database: ' + error.message));
        }
      });
    },
    
    /**
     * Load and decrypt a database
     * @param {string} encrypted - The encrypted database
     * @param {string} password - The password to decrypt the database
     */
    unlockDatabase: function(encrypted, password) {
      return new Promise((resolve, reject) => {
        try {
          // Decrypt database
          const decrypted = SecureVaultCrypto.decrypt(encrypted);
          
          // Validate database structure
          if (!decrypted || !decrypted.keyInfo || !decrypted.data) {
            throw new Error('Invalid database format');
          }
          
          // Set key info and database
          _keyInfo = decrypted.keyInfo;
          _db = decrypted.data;
          
          // Set encryption key
          SecureVaultCrypto.setKeyFromInfo({
            password: password,
            salt: _keyInfo.salt,
            iterations: _keyInfo.iterations
          });
          
          resolve();
        } catch (error) {
          reject(new Error('Failed to unlock database: ' + error.message));
        }
      });
    },
    
    /**
     * Lock the database
     */
    lockDatabase: function() {
      return new Promise((resolve) => {
        _db = null;
        _keyInfo = null;
        SecureVaultCrypto.clearKey();
        resolve();
      });
    },
    
    /**
     * Check if the database is locked
     * @returns {boolean} True if the database is locked
     */
    isLocked: function() {
      return !_db || !SecureVaultCrypto.hasKey();
    },
    
    /**
     * Get all items in a collection
     * @param {string} collection - The collection name
     * @returns {Promise<Object>} The items in the collection
     */
    getItems: function(collection) {
      return new Promise((resolve, reject) => {
        if (!_db || !SecureVaultCrypto.hasKey()) {
          reject(new Error('No database loaded or no encryption key set'));
          return;
        }
        
        if (!_db[collection]) {
          reject(new Error('Invalid collection: ' + collection));
          return;
        }
        
        resolve(_db[collection]);
      });
    },
    
    /**
     * Get a single item from a collection
     * @param {string} collection - The collection name
     * @param {string} id - The item ID
     * @returns {Promise<Object>} The item
     */
    getItem: function(collection, id) {
      return new Promise((resolve, reject) => {
        if (!_db || !SecureVaultCrypto.hasKey()) {
          reject(new Error('No database loaded or no encryption key set'));
          return;
        }
        
        if (!_db[collection]) {
          reject(new Error('Invalid collection: ' + collection));
          return;
        }
        
        const item = _db[collection][id];
        if (!item) {
          reject(new Error('Item not found: ' + id));
          return;
        }
        
        resolve(item);
      });
    },
    
    /**
     * Save an item to a collection
     * @param {string} collection - The collection name
     * @param {string} id - The item ID (null for new items)
     * @param {Object} data - The item data
     * @returns {Promise<Object>} The saved item
     */
    saveItem: function(collection, id, data) {
      return new Promise((resolve, reject) => {
        if (!_db || !SecureVaultCrypto.hasKey()) {
          reject(new Error('No database loaded or no encryption key set'));
          return;
        }
        
        if (!_db[collection]) {
          reject(new Error('Invalid collection: ' + collection));
          return;
        }
        
        try {
          // Generate new ID for new items
          const itemId = id || _generateId();
          
          // Add timestamps
          const item = _addTimestamps(data, !id);
          
          // Save item
          _db[collection][itemId] = item;
          
          resolve({
            id: itemId,
            ...item
          });
        } catch (error) {
          reject(new Error('Failed to save item: ' + error.message));
        }
      });
    },
    
    /**
     * Delete an item from a collection
     * @param {string} collection - The collection name
     * @param {string} id - The item ID
     */
    deleteItem: function(collection, id) {
      return new Promise((resolve, reject) => {
        if (!_db || !SecureVaultCrypto.hasKey()) {
          reject(new Error('No database loaded or no encryption key set'));
          return;
        }
        
        if (!_db[collection]) {
          reject(new Error('Invalid collection: ' + collection));
          return;
        }
        
        if (!_db[collection][id]) {
          reject(new Error('Item not found: ' + id));
          return;
        }
        
        delete _db[collection][id];
        resolve();
      });
    }
  };
})();

// Add to window for global access
window.SecureVaultStorage = SecureVaultStorage; 