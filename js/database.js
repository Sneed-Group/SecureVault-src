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
 * Save data to secure vault storage
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
    // Encrypt the data
    const encrypted = encryptData(data);
    
    if (!encrypted) {
      console.error("Failed to encrypt data");
      return false;
    }
    
    // Get metadata
    const meta = await db.meta.get('metadata') || {
      id: 'metadata',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Update metadata
    meta.updatedAt = new Date().toISOString();
    await db.meta.put(meta);
    
    // Create a record for the vault data
    const dataRecord = {
      id: 'vault_data',
      type: 'encrypted',
      name: 'vault_data',
      data: encrypted,
      updatedAt: new Date().toISOString()
    };
    
    // Save to IndexedDB
    await db.data.put(dataRecord);
    
    console.log("Data saved to secure storage");
    return true;
  } catch (error) {
    console.error("Error saving to secure storage:", error);
    return false;
  }
}

/**
 * Load data from secure vault storage
 * @returns {object} The decrypted data or null if error
 */
export async function loadFromSecureStorage() {
  if (!dbInitialized) {
    console.error("Database not initialized");
    return null;
  }
  
  if (!encryptionKey) {
    console.error("Encryption key not set");
    return null;
  }
  
  try {
    // Get data from secure storage
    const dataRecord = await db.data.get('vault_data');
    
    if (!dataRecord || !dataRecord.data) {
      console.log("No data found in secure storage, checking localStorage for migration");
      
      // Try to migrate from localStorage (one-time operation)
      return await migrateFromLocalStorage();
    }
    
    // Decrypt the data
    const decrypted = decryptData(dataRecord.data);
    
    if (!decrypted) {
      console.error("Failed to decrypt data");
      return null;
    }
    
    console.log("Data loaded from secure storage");
    return decrypted;
  } catch (error) {
    console.error("Error loading from secure storage:", error);
    return null;
  }
}

/**
 * Migrate data from localStorage to secure storage (one-time operation)
 * @returns {object} The migrated data or null if error/no data
 */
export async function migrateFromLocalStorage() {
  try {
    // Check if localStorage has any data
    const data = localStorage.getItem('markdown_vault_data');
    
    if (!data) {
      console.log("No data found in localStorage for migration");
      return null;
    }
    
    // Parse the data
    const parsedData = JSON.parse(data);
    
    // Save to secure storage
    const saveResult = await saveToSecureStorage(parsedData);
    
    if (saveResult) {
      console.log("Successfully migrated data from localStorage to secure storage");
      
      // Clear localStorage after successful migration
      localStorage.removeItem('markdown_vault_data');
      console.log("Cleared localStorage after migration");
      
      return parsedData;
    } else {
      console.error("Failed to save migrated data to secure storage");
      return null;
    }
  } catch (error) {
    console.error("Error during migration from localStorage:", error);
    return null;
  }
}

/**
 * Export database to a file
 * @returns {boolean} True if export was successful
 */
export async function exportDatabase() {
  try {
    // Get data from secure storage
    const data = await loadFromSecureStorage();
    
    if (!data) {
      console.error("No data found in secure storage");
      return false;
    }
    
    // Create the export object
    const exportObj = {
      type: 'markdown-vault-export',
      version: 1,
      timestamp: new Date().toISOString(),
      data: data
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
 * @param {File} file - The file to import from
 * @returns {Promise<Object>} The imported data
 */
export function importDatabase(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided for import'));
      return;
    }
    
    console.log('Importing database from file:', file.name);
    
    // Check if the encryption key is set
    const encryptionKey = getEncryptionKey();
    if (!encryptionKey) {
      reject(new Error('Cannot import database: You must be logged in with an encryption key set'));
      return;
    }
    
    // Read the file
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        // Parse the file content
        const importData = JSON.parse(event.target.result);
        
        // Validate import structure
        if (!importData || typeof importData !== 'object') {
          reject(new Error('Invalid import file: File does not contain valid JSON data'));
          return;
        }
        
        // Verify it's a compatible export format
        if (!importData.metadata || !importData.metadata.exportDate) {
          reject(new Error('Invalid import file: File does not contain valid export metadata'));
          return;
        }
        
        // Import data into secure storage
        const data = importData.data || {};
        
        // Save to our secure storage using the current encryption key
        try {
          // Loop through each data section and save it
          const savePromises = Object.keys(data).map(key => {
            return saveToSecureStorage(key, data[key]);
          });
          
          await Promise.all(savePromises);
          
          // Success
          console.log('Database import successful');
          resolve(data);
          
          // Optionally reload the app to apply imported data
          window.dispatchEvent(new CustomEvent('database-imported', { detail: data }));
        } catch (saveError) {
          reject(new Error(`Failed to save imported data: ${saveError.message}`));
        }
      } catch (parseError) {
        reject(new Error(`Failed to parse import file: ${parseError.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading import file'));
    };
    
    reader.readAsText(file);
  });
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
    // Load current data
    const data = await loadFromSecureStorage();
    if (!data) return false;
    
    // Set the new key
    encryptionKey = newKey;
    
    // Save with the new key
    const success = await saveToSecureStorage(data);
    return success;
  } catch (error) {
    console.error("Error changing encryption key:", error);
    return false;
  }
}

/**
 * Save database to encrypted data (legacy compatibility)
 * @returns {string} The encrypted database data
 */
export async function saveDatabase() {
  // Load the current data
  const data = await loadFromSecureStorage();
  
  // Save it using the new secure storage
  if (data) {
    await saveToSecureStorage(data);
  }
  
  // For compatibility, still return encrypted data
  if (!db) {
    console.error("Database not initialized");
    return null;
  }
  
  if (!encryptionKey) {
    console.error("Encryption key not set");
    return null;
  }
  
  try {
    const dataRecord = await db.data.get('vault_data');
    return dataRecord?.data || null;
  } catch (error) {
    console.error("Error in legacy saveDatabase:", error);
    return null;
  }
}

/**
 * Load database from encrypted data (legacy compatibility)
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
    
    // Use the new storage method
    return await saveToSecureStorage(decrypted);
  } catch (error) {
    console.error("Error in legacy loadDatabase:", error);
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
  saveToSecureStorage,
  loadFromSecureStorage,
  migrateFromLocalStorage
}; 