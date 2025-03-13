// Import crypto-js for encryption
import CryptoJS from 'crypto-js';
import Dexie from 'dexie';

// Database instance
let db;

// Current encryption key
let encryptionKey = null;

// Database definition
class VaultDatabase extends Dexie {
  constructor() {
    super('MarkdownVault');
    
    this.version(1).stores({
      meta: 'id, lastUpdated',
      data: 'id, encryptedData'
    });
  }
}

// Initialize the database
async function initializeDatabase() {
  db = new VaultDatabase();
  
  // Check if the database already exists
  const metaRecord = await db.meta.get(1);
  if (!metaRecord) {
    // Create initial empty database
    await createEmptyDatabase();
  }
  
  console.log('Database initialized');
  return true;
}

// Close the database
function closeDatabase() {
  if (db) {
    db.close();
    console.log('Database closed');
  }
}

// Create an empty database structure
async function createEmptyDatabase() {
  const emptyDb = {
    docs: {},
    photos: {},
    files: {}
  };
  
  await db.meta.put({
    id: 1,
    lastUpdated: new Date().toISOString()
  });
  
  // Save the empty database (will be encrypted in saveDatabase)
  await saveDatabase(emptyDb);
  
  console.log('Empty database created');
}

// Set the encryption key
function setEncryptionKey(key) {
  encryptionKey = key;
  return !!key; // Return true if key is set
}

// Get the current encryption key
function getEncryptionKey() {
  return encryptionKey;
}

// Derive a secure key from the password
async function deriveKeyFromPassword(password) {
  // Use PBKDF2 for key derivation
  const salt = CryptoJS.lib.WordArray.random(128/8);
  const iterations = 10000;
  const keySize = 256 / 32;
  
  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: keySize,
    iterations: iterations
  });
  
  return {
    key: key.toString(),
    salt: salt.toString(),
    iterations: iterations
  };
}

// Validate a password against stored salt and iterations
async function validatePassword(password, storedKey, storedSalt, storedIterations) {
  const keySize = 256 / 32;
  
  const derivedKey = CryptoJS.PBKDF2(password, storedSalt, {
    keySize: keySize,
    iterations: storedIterations
  });
  
  return derivedKey.toString() === storedKey;
}

// Encrypt data with the current encryption key
function encryptData(data) {
  if (!encryptionKey) {
    throw new Error('Encryption key not set');
  }
  
  const jsonString = JSON.stringify(data);
  
  // Use AES-GCM equivalent (AES + HMAC) for encryption
  const encrypted = CryptoJS.AES.encrypt(jsonString, encryptionKey).toString();
  
  // Add HMAC for integrity verification
  const hmac = CryptoJS.HmacSHA256(encrypted, encryptionKey).toString();
  
  return {
    data: encrypted,
    hmac: hmac
  };
}

// Decrypt data with the current encryption key
function decryptData(encryptedData, hmac) {
  if (!encryptionKey) {
    throw new Error('Encryption key not set');
  }
  
  // Verify HMAC for integrity
  const calculatedHmac = CryptoJS.HmacSHA256(encryptedData, encryptionKey).toString();
  if (calculatedHmac !== hmac) {
    throw new Error('Data integrity check failed');
  }
  
  // Decrypt the data
  const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
  const decryptedJson = bytes.toString(CryptoJS.enc.Utf8);
  
  if (!decryptedJson) {
    throw new Error('Failed to decrypt data');
  }
  
  return JSON.parse(decryptedJson);
}

// Load and decrypt the database
async function loadDatabase() {
  try {
    // Load the encrypted data from IndexedDB
    const encryptedRecord = await db.data.get(1);
    
    if (!encryptedRecord) {
      throw new Error('No database found');
    }
    
    // Decrypt the database
    const decryptedData = decryptData(
      encryptedRecord.encryptedData.data,
      encryptedRecord.encryptedData.hmac
    );
    
    console.log('Database loaded and decrypted successfully');
    return decryptedData;
  } catch (error) {
    console.error('Failed to load database:', error);
    throw error;
  }
}

// Save and encrypt the database
async function saveDatabase(data) {
  try {
    // Update the last modified timestamp
    await db.meta.update(1, { lastUpdated: new Date().toISOString() });
    
    // Encrypt the database
    const encryptedData = encryptData(data);
    
    // Save to IndexedDB
    await db.data.put({
      id: 1,
      encryptedData: encryptedData
    });
    
    console.log('Database saved and encrypted successfully');
    return true;
  } catch (error) {
    console.error('Failed to save database:', error);
    throw error;
  }
}

// Export database to a file
async function exportDatabase() {
  try {
    // Get the encrypted database record
    const encryptedRecord = await db.data.get(1);
    
    if (!encryptedRecord) {
      throw new Error('No database to export');
    }
    
    // Get the metadata
    const meta = await db.meta.get(1);
    
    // Create an export object with metadata and encrypted data
    const exportData = {
      version: 1,
      timestamp: new Date().toISOString(),
      lastUpdated: meta.lastUpdated,
      encryptedData: encryptedRecord.encryptedData
    };
    
    // Convert to JSON string
    const jsonString = JSON.stringify(exportData);
    
    // Create a Blob for download
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create a download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `markdown-vault-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    
    // Clean up
    URL.revokeObjectURL(url);
    
    console.log('Database exported successfully');
    return true;
  } catch (error) {
    console.error('Failed to export database:', error);
    throw error;
  }
}

// Import database from a file
async function importDatabase(fileContent) {
  try {
    // Parse the file content
    const importData = JSON.parse(fileContent);
    
    // Check version
    if (!importData.version || importData.version !== 1) {
      throw new Error('Unsupported database version');
    }
    
    // Update the database
    await db.data.put({
      id: 1,
      encryptedData: importData.encryptedData
    });
    
    // Update the metadata
    await db.meta.put({
      id: 1,
      lastUpdated: importData.lastUpdated || new Date().toISOString()
    });
    
    console.log('Database imported successfully');
    return true;
  } catch (error) {
    console.error('Failed to import database:', error);
    throw error;
  }
}

// Change the encryption key (reencrypt all data)
async function changeEncryptionKey(newKey) {
  try {
    // Load the database with the current key
    const data = await loadDatabase();
    
    // Set the new encryption key
    const oldKey = encryptionKey;
    encryptionKey = newKey;
    
    // Reencrypt and save with the new key
    await saveDatabase(data);
    
    console.log('Encryption key changed successfully');
    return true;
  } catch (error) {
    // Restore the old key on failure
    encryptionKey = oldKey;
    console.error('Failed to change encryption key:', error);
    throw error;
  }
}

// Export functions and constants
export {
  initializeDatabase,
  closeDatabase,
  setEncryptionKey,
  getEncryptionKey,
  deriveKeyFromPassword,
  validatePassword,
  loadDatabase,
  saveDatabase,
  exportDatabase,
  importDatabase,
  changeEncryptionKey
}; 