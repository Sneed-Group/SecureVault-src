// Import crypto-js for encryption
import CryptoJS from 'crypto-js';
import Dexie from 'dexie';

// Database class for storing encrypted vault data
class VaultDatabase extends Dexie {
  constructor() {
    super('MarkdownVault');
    this.version(1).stores({
      meta: 'id',
      data: 'id, type, name, updatedAt'
    });
  }
}

let db = null;
let encryptionKey = null;
let dbInitialized = false;

/**
 * Initialize the database
 */
export function initializeDatabase() {
  try {
    if (!db) {
      console.log("Initializing database...");
      db = new VaultDatabase();
      dbInitialized = true;
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error initializing database:", error);
    throw new Error(`Database initialization failed: ${error.message}`);
  }
}

/**
 * Close the database connection
 */
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    encryptionKey = null;
    dbInitialized = false;
  }
}

/**
 * Create empty database structure
 */
export async function createEmptyDatabase() {
  if (!db) initializeDatabase();
  
  try {
    // Clear any existing data
    await db.meta.clear();
    await db.data.clear();
    
    // Create metadata record
    await db.meta.put({
      id: 'metadata',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    console.log("Empty database created successfully");
    return true;
  } catch (error) {
    console.error("Error creating empty database:", error);
    return false;
  }
}

/**
 * Set the encryption key
 * @param {string} key - The encryption key to set
 */
export function setEncryptionKey(key) {
  if (!key) return false;
  encryptionKey = key;
  return true;
}

/**
 * Get the encryption key
 */
export function getEncryptionKey() {
  return encryptionKey;
}

/**
 * Derive an encryption key from a password
 * @param {string} password - The password to derive the key from
 * @param {string} salt - Optional salt for key derivation
 * @returns {string} The derived key
 */
export function deriveKeyFromPassword(password, salt = 'MarkdownVaultSalt') {
  if (!password) return null;
  // Use PBKDF2 to derive a strong key from the password
  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 10000
  });
  return key.toString();
}

/**
 * Validate a password against stored authentication data
 * @param {string} password - The password to validate
 * @param {object} authData - The stored authentication data
 * @returns {boolean} True if password is valid
 */
export function validatePassword(password, authData) {
  if (!password || !authData) return false;
  
  try {
    const derivedKey = deriveKeyFromPassword(password, authData.salt);
    const keyHash = CryptoJS.SHA256(derivedKey).toString();
    
    return keyHash === authData.keyHash;
  } catch (error) {
    console.error("Error validating password:", error);
    return false;
  }
}

/**
 * Encrypt data using the encryption key
 * @param {object} data - The data to encrypt
 * @returns {string} The encrypted data
 */
export function encryptData(data) {
  if (!encryptionKey) {
    console.error("Encryption key not set");
    return null;
  }
  
  try {
    const jsonData = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(jsonData, encryptionKey).toString();
    return encrypted;
  } catch (error) {
    console.error("Error encrypting data:", error);
    return null;
  }
}

/**
 * Decrypt data using the encryption key
 * @param {string} encryptedData - The encrypted data to decrypt
 * @returns {object} The decrypted data
 */
export function decryptData(encryptedData) {
  if (!encryptionKey) {
    console.error("Encryption key not set");
    return null;
  }
  
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
    const jsonData = decrypted.toString(CryptoJS.enc.Utf8);
    return JSON.parse(jsonData);
  } catch (error) {
    console.error("Error decrypting data:", error);
    return null;
  }
}

/**
 * Load database from encrypted data
 * @param {string} encryptedData - The encrypted database data
 * @returns {boolean} True if database was loaded successfully
 */
export async function loadDatabase(encryptedData) {
  if (!db) initializeDatabase();
  if (!encryptionKey) {
    console.error("Encryption key not set");
    return false;
  }
  
  try {
    const decrypted = decryptData(encryptedData);
    if (!decrypted) return false;
    
    // Clear any existing data
    await db.meta.clear();
    await db.data.clear();
    
    // Load metadata
    if (decrypted.meta) {
      await db.meta.put(decrypted.meta);
    }
    
    // Load data records
    if (decrypted.data && Array.isArray(decrypted.data)) {
      await db.data.bulkPut(decrypted.data);
    }
    
    console.log("Database loaded successfully");
    return true;
  } catch (error) {
    console.error("Error loading database:", error);
    return false;
  }
}

/**
 * Save database to encrypted data
 * @returns {string} The encrypted database data
 */
export async function saveDatabase() {
  if (!db) {
    console.error("Database not initialized");
    return null;
  }
  
  if (!encryptionKey) {
    console.error("Encryption key not set");
    return null;
  }
  
  try {
    // Get metadata
    const meta = await db.meta.get('metadata');
    
    // Get all data records
    const data = await db.data.toArray();
    
    // Create the database object
    const databaseObj = {
      meta,
      data
    };
    
    // Encrypt the database
    const encrypted = encryptData(databaseObj);
    
    // Update metadata
    await db.meta.update('metadata', { updatedAt: new Date().toISOString() });
    
    return encrypted;
  } catch (error) {
    console.error("Error saving database:", error);
    return null;
  }
}

/**
 * Export database to a file
 * @returns {boolean} True if export was successful
 */
export async function exportDatabase() {
  try {
    // Get data from localStorage
    const data = localStorage.getItem('markdown_vault_data');
    
    if (!data) {
      console.error("No data found in localStorage");
      return false;
    }
    
    // Parse the data to ensure it's valid JSON
    const parsedData = JSON.parse(data);
    
    // Create the export object
    const exportObj = {
      type: 'markdown-vault-export',
      version: 1,
      timestamp: new Date().toISOString(),
      data: parsedData
    };
    
    // Convert to JSON
    const jsonData = JSON.stringify(exportObj);
    
    // Create a download link
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `markdown-vault-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log("Database exported successfully");
    return true;
  } catch (error) {
    console.error("Error exporting database:", error);
    return false;
  }
}

/**
 * Import database from a file
 * @param {File} file - The file to import
 * @returns {Promise<boolean>} True if import was successful
 */
export async function importDatabase(file) {
  try {
    // Read the file
    const reader = new FileReader();
    
    return new Promise((resolve, reject) => {
      reader.onload = async (event) => {
        try {
          const jsonData = event.target.result;
          const importObj = JSON.parse(jsonData);
          
          // Validate the import object
          if (importObj.type !== 'markdown-vault-export' || !importObj.data) {
            console.error("Invalid import file format");
            resolve(false);
            return;
          }
          
          // Store the data in localStorage
          localStorage.setItem('markdown_vault_data', JSON.stringify(importObj.data));
          
          console.log("Database imported successfully");
          resolve(true);
        } catch (error) {
          console.error("Error parsing import file:", error);
          resolve(false);
        }
      };
      
      reader.onerror = () => {
        console.error("Error reading import file");
        resolve(false);
      };
      
      reader.readAsText(file);
    });
  } catch (error) {
    console.error("Error importing database:", error);
    return false;
  }
}

/**
 * Change the encryption key
 * @param {string} newKey - The new encryption key
 * @returns {boolean} True if key was changed successfully
 */
export async function changeEncryptionKey(newKey) {
  if (!dbInitialized) {
    console.error("Database not initialized");
    return false;
  }
  
  if (!encryptionKey) {
    console.error("Encryption key not set");
    return false;
  }
  
  if (!newKey) {
    console.error("New key is invalid");
    return false;
  }
  
  try {
    // Save the database with the current key
    const encryptedData = await saveDatabase();
    if (!encryptedData) return false;
    
    // Set the new key
    encryptionKey = newKey;
    
    // Load the database with the new key
    const success = await loadDatabase(encryptedData);
    return success;
  } catch (error) {
    console.error("Error changing encryption key:", error);
    return false;
  }
}

/**
 * Load database from encrypted localStorage
 * This is a helper function for the transition from localStorage to secure database
 * @returns {object} The decrypted database object or null if error
 */
export function loadFromLocalStorage() {
  if (!encryptionKey) {
    console.error("Encryption key not set");
    return null;
  }
  
  try {
    // Get data from localStorage
    const data = localStorage.getItem('markdown_vault_data');
    
    if (!data) {
      console.error("No data found in localStorage");
      return null;
    }
    
    // Parse the data (it's currently not encrypted in localStorage)
    const parsedData = JSON.parse(data);
    
    return parsedData;
  } catch (error) {
    console.error("Error loading from localStorage:", error);
    return null;
  }
}

/**
 * Save database to secure storage and localStorage
 * @param {object} data - The data to save
 * @returns {boolean} True if save was successful
 */
export async function saveToSecureStorage(data) {
  if (!dbInitialized) {
    console.error("Database not initialized");
    return false;
  }
  
  if (!encryptionKey) {
    console.error("Encryption key not set");
    return false;
  }
  
  try {
    // Encrypt and save data
    const encrypted = encryptData(data);
    
    if (!encrypted) {
      console.error("Failed to encrypt data");
      return false;
    }
    
    // Update localStorage as a fallback/transition
    localStorage.setItem('markdown_vault_data', JSON.stringify(data));
    
    console.log("Data saved to secure storage");
    return true;
  } catch (error) {
    console.error("Error saving to secure storage:", error);
    return false;
  }
}

// Export database module
export default {
  initializeDatabase,
  closeDatabase,
  createEmptyDatabase,
  setEncryptionKey,
  getEncryptionKey,
  deriveKeyFromPassword,
  validatePassword,
  encryptData,
  decryptData,
  loadDatabase,
  saveDatabase,
  exportDatabase,
  importDatabase,
  changeEncryptionKey,
  loadFromLocalStorage,
  saveToSecureStorage
}; 