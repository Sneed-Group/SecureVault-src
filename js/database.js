// Import crypto-js for encryption
import CryptoJS from 'crypto-js';

// Current vault state and encryption key
let vaultData = null;
let encryptionKey = null;
let vaultFile = null;

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
export function deriveKeyFromPassword(password, salt = 'SecureVaultSalt') {
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
 * Save data to secure storage as a file
 * @param {object} data - The data to save
 * @returns {Promise<boolean>} True if save was successful
 */
export async function saveToSecureStorage(data) {
  if (!encryptionKey) {
    console.error("Encryption key not set");
    return false;
  }
  
  try {
    // Add metadata to the vault data
    const vaultObj = {
      ...data,
      meta: {
        version: 1,
        updatedAt: new Date().toISOString()
      }
    };
    
    // Encrypt the data
    const encryptedData = encryptData(vaultObj);
    if (!encryptedData) {
      throw new Error("Failed to encrypt data");
    }
    
    // Create vault file object
    const vaultFileObj = {
      type: 'secure-vault',
      version: 1,
      timestamp: new Date().toISOString(),
      data: encryptedData
    };
    
    // Convert to JSON
    const jsonData = JSON.stringify(vaultFileObj);
    
    // Save as file
    await downloadVaultFile(jsonData);
    
    // Update the vault data
    vaultData = vaultObj;
    
    console.log("Data saved to secure storage file");
    return true;
  } catch (error) {
    console.error("Error saving to secure storage:", error);
    return false;
  }
}

/**
 * Load data from secure storage (vault file)
 * @returns {Promise<object>} The loaded data, or null if load failed
 */
export async function loadFromSecureStorage() {
  if (!encryptionKey) {
    console.error("Encryption key not set");
    return null;
  }
  
  try {
    // If we don't have a vault file, prompt user to select one
    if (!vaultFile) {
      console.log("No vault file loaded yet");
      return null;
    }
    
    // Read the file
    const fileContent = await readVaultFile(vaultFile);
    if (!fileContent) {
      throw new Error("Failed to read vault file");
    }
    
    // Parse the JSON
    const vaultFileObj = JSON.parse(fileContent);
    
    // Validate the file format
    if (vaultFileObj.type !== 'secure-vault' || !vaultFileObj.data) {
      throw new Error("Invalid vault file format");
    }
    
    // Decrypt the data
    const decryptedData = decryptData(vaultFileObj.data);
    if (!decryptedData) {
      throw new Error("Failed to decrypt vault data");
    }
    
    // Store the decrypted data
    vaultData = decryptedData;
    
    console.log("Data loaded from secure storage file");
    return vaultData;
  } catch (error) {
    console.error("Error loading from secure storage:", error);
    return null;
  }
}

/**
 * Set the current vault file
 * @param {File} file - The vault file
 */
export function setVaultFile(file) {
  vaultFile = file;
}

/**
 * Get the current vault file
 * @returns {File} The vault file
 */
export function getVaultFile() {
  return vaultFile;
}

/**
 * Download the vault file
 * @param {string} jsonData - The JSON data to save
 * @returns {Promise<boolean>} True if download was successful
 */
export async function downloadVaultFile(jsonData) {
  return new Promise((resolve) => {
    try {
      // Create a blob from the JSON data
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create a download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `secure-vault-${new Date().toISOString().split('T')[0]}.vault`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log("Vault file downloaded");
      resolve(true);
    } catch (error) {
      console.error("Error downloading vault file:", error);
      resolve(false);
    }
  });
}

/**
 * Read the vault file
 * @param {File} file - The file to read
 * @returns {Promise<string>} The file content
 */
export function readVaultFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      resolve(event.target.result);
    };
    
    reader.onerror = (error) => {
      console.error("Error reading vault file:", error);
      reject(error);
    };
    
    reader.readAsText(file);
  });
}

/**
 * Import database from a file with password
 * @param {File} file - The file to import
 * @param {string} password - The password for the file
 * @returns {Promise<boolean>} True if import was successful
 */
export async function importDatabaseWithPassword(file, password) {
  try {
    // Read the file
    const fileContent = await readVaultFile(file);
    if (!fileContent) {
      throw new Error("Failed to read vault file");
    }
    
    // Parse the JSON
    const vaultFileObj = JSON.parse(fileContent);
    
    // Validate the file format
    if (vaultFileObj.type !== 'secure-vault' || !vaultFileObj.data) {
      throw new Error("Invalid vault file format");
    }
    
    // Derive key from password
    const key = deriveKeyFromPassword(password);
    if (!key) {
      throw new Error("Failed to derive key from password");
    }
    
    // Set the encryption key
    setEncryptionKey(key);
    
    // Set the vault file
    setVaultFile(file);
    
    // Try to decrypt
    const decryptedData = decryptData(vaultFileObj.data);
    if (!decryptedData) {
      throw new Error("Failed to decrypt vault data - incorrect password");
    }
    
    // Store the decrypted data
    vaultData = decryptedData;
    
    console.log("Vault file imported successfully");
    return true;
  } catch (error) {
    console.error("Error importing vault file:", error);
    return false;
  }
}

// Export database module
export default {
  setEncryptionKey,
  getEncryptionKey,
  deriveKeyFromPassword,
  validatePassword,
  encryptData,
  decryptData,
  saveToSecureStorage,
  loadFromSecureStorage,
  setVaultFile,
  getVaultFile,
  downloadVaultFile,
  readVaultFile,
  importDatabaseWithPassword
}; 