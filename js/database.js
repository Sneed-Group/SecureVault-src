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
 * @param {Object} data - The data to encrypt
 * @returns {string|null} The encrypted data string, or null if encryption failed
 */
export function encryptData(data) {
  if (!encryptionKey) {
    console.error("Encryption key not set");
    return null;
  }
  
  try {
    console.log("Starting encryption process...");
    const jsonData = JSON.stringify(data);
    console.log(`Data stringified, length: ${jsonData.length} characters`);
    
    const encrypted = CryptoJS.AES.encrypt(jsonData, encryptionKey);
    const encryptedString = encrypted.toString();
    console.log(`Data encrypted, result length: ${encryptedString.length} characters`);
    
    return encryptedString;
  } catch (error) {
    console.error("Error during encryption process:", error);
    return null;
  }
}

/**
 * Decrypt data using the encryption key
 * @param {string} encryptedData - The encrypted data string
 * @returns {Object|null} The decrypted data object, or null if decryption failed
 */
export function decryptData(encryptedData) {
  if (!encryptionKey) {
    console.error("Encryption key not set");
    return null;
  }
  
  try {
    console.log("Attempting to decrypt data...");
    const decrypted = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
    
    // Check if decryption result is empty
    if (!decrypted || decrypted.sigBytes <= 0) {
      console.error("Decryption result is empty, likely incorrect key");
      return null;
    }
    
    const jsonData = decrypted.toString(CryptoJS.enc.Utf8);
    
    // Check if resulting string is empty
    if (!jsonData || jsonData.length === 0) {
      console.error("Decryption produced empty string, likely incorrect key");
      return null;
    }
    
    // Try to parse the JSON
    try {
      const parsedData = JSON.parse(jsonData);
      return parsedData;
    } catch (parseError) {
      console.error("Error parsing decrypted JSON:", parseError);
      console.error("Decryption may have succeeded but produced invalid JSON (first 100 chars):", 
        jsonData.substring(0, 100));
      return null;
    }
  } catch (error) {
    console.error("Error during decryption process:", error);
    return null;
  }
}

/**
 * Save data to secure storage
 * @param {Object} data - The data to save
 * @param {boolean} downloadFile - Whether to download the file
 * @returns {Promise<boolean>} True if save was successful
 */
export async function saveToSecureStorage(data, downloadFile = false) {
  if (!encryptionKey) {
    console.error("Encryption key not set");
    return false;
  }
  
  try {
    // First, ensure we're properly merging data
    let mergedData = {};
    
    // Start with existing vault data if available
    if (vaultData) {
      // Deep clone the vault data to avoid reference issues
      mergedData = JSON.parse(JSON.stringify(vaultData));
    }
    
    // Merge in the new data
    // We need to handle each section carefully to avoid losing data
    if (data) {
      // For each section, merge or replace as needed
      if (data.docs) {
        mergedData.docs = mergedData.docs || {};
        Object.assign(mergedData.docs, data.docs);
      }
      
      if (data.files) {
        mergedData.files = mergedData.files || {};
        Object.assign(mergedData.files, data.files);
      }
      
      if (data.photos) {
        mergedData.photos = mergedData.photos || {};
        Object.assign(mergedData.photos, data.photos);
      }
      
      // Handle any other sections in the data
      for (const key in data) {
        if (key !== 'docs' && key !== 'files' && key !== 'photos' && key !== 'meta') {
          mergedData[key] = data[key];
        }
      }
    }
    
    // Add metadata
    mergedData.meta = {
      version: 1,
      updatedAt: new Date().toISOString(),
      encryptionMethod: "pbkdf2" // Add encryption method info
    };
    
    // Log data sizes for debugging
    const dataSize = {
      docs: mergedData.docs ? Object.keys(mergedData.docs).length : 0,
      files: mergedData.files ? Object.keys(mergedData.files).length : 0,
      photos: mergedData.photos ? Object.keys(mergedData.photos).length : 0
    };
    console.log(`Saving vault data with: ${dataSize.docs} docs, ${dataSize.files} files, ${dataSize.photos} photos`);
    
    // Encrypt the data
    const encryptedData = encryptData(mergedData);
    if (!encryptedData) {
      throw new Error("Failed to encrypt data");
    }
    
    // Create vault file object
    const vaultFileObj = {
      type: 'secure-vault',
      version: 1,
      timestamp: new Date().toISOString(),
      data: encryptedData,
      encryptionInfo: {
        method: "pbkdf2",
        saltUsed: true
      }
    };
    
    // Convert to JSON
    const jsonData = JSON.stringify(vaultFileObj);
    
    // Only download file if explicitly requested
    if (downloadFile) {
      await downloadVaultFile(jsonData);
    }
    
    // Update the vault data with our merged data
    vaultData = mergedData;
    
    console.log("Data saved to secure storage");
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
      return vaultData; // Return current vault data if available
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
    
    // Make sure all sections exist
    if (!decryptedData.docs) decryptedData.docs = {};
    if (!decryptedData.files) decryptedData.files = {};
    if (!decryptedData.photos) decryptedData.photos = {};
    
    // Log data sizes for debugging
    const dataSize = {
      docs: decryptedData.docs ? Object.keys(decryptedData.docs).length : 0,
      files: decryptedData.files ? Object.keys(decryptedData.files).length : 0,
      photos: decryptedData.photos ? Object.keys(decryptedData.photos).length : 0
    };
    console.log(`Loaded vault data with: ${dataSize.docs} docs, ${dataSize.files} files, ${dataSize.photos} photos`);
    
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
    if (!file) {
      console.error("Error reading vault file: No file provided");
      reject(new Error("No file provided"));
      return;
    }
    
    console.log(`Reading vault file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
    
    const reader = new FileReader();
    
    reader.onload = (event) => {
      console.log(`File read complete, content length: ${event.target.result.length}`);
      resolve(event.target.result);
    };
    
    reader.onerror = (error) => {
      console.error("Error reading vault file:", error);
      reject(error);
    };
    
    // Read the file as text
    reader.readAsText(file);
  });
}

/**
 * Import database with password
 * @param {File} file The imported file
 * @param {string} password The password to decrypt the file
 * @returns {Promise<boolean>} True if import was successful
 */
export async function importDatabaseWithPassword(file, password) {
  try {
    if (!file) {
      console.error("Import error: No file provided");
      return false;
    }

    console.log(`Attempting to import file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
    
    // Read the file
    const fileContent = await readVaultFile(file);
    if (!fileContent) {
      console.error("Failed to read vault file contents");
      throw new Error("Failed to read vault file");
    }
    
    console.log(`File content read successfully, length: ${fileContent.length} characters`);
    
    // Parse the JSON
    let vaultFileObj;
    try {
      vaultFileObj = JSON.parse(fileContent);
      console.log("File JSON parsed successfully");
    } catch (parseError) {
      console.error("Error parsing file JSON:", parseError);
      throw new Error("Invalid vault file format - not valid JSON");
    }
    
    // Validate the file format
    if (!vaultFileObj || vaultFileObj.type !== 'secure-vault' || !vaultFileObj.data) {
      console.error("Invalid vault file structure:", vaultFileObj ? 
        `type: ${vaultFileObj.type}, has data: ${!!vaultFileObj.data}` : 
        "undefined object");
      throw new Error("Invalid vault file format - missing required fields");
    }
    
    console.log("Attempting to decrypt the vault...");
    
    // Check for encryption info in the vault file
    let encryptionMethod = "pbkdf2"; // Default method
    let saltUsed = true;
    
    if (vaultFileObj.encryptionInfo) {
      encryptionMethod = vaultFileObj.encryptionInfo.method || encryptionMethod;
      saltUsed = vaultFileObj.encryptionInfo.saltUsed !== false; // Default to true
      console.log(`Vault file specifies encryption method: ${encryptionMethod}, salt used: ${saltUsed}`);
    } else {
      console.log("No encryption info in vault file, trying default methods");
    }
    
    // Try multiple approaches to decrypt
    let decryptedData = null;
    let decryptionSuccessful = false;
    let usedKey = null;
    
    // Attempt 1: Try with default salt
    console.log("Attempt 1: Trying to decrypt with default salt");
    const key1 = deriveKeyFromPassword(password);
    if (key1) {
      setEncryptionKey(key1);
      try {
        decryptedData = decryptData(vaultFileObj.data);
        if (decryptedData && typeof decryptedData === 'object') {
          console.log("Decryption successful using default salt");
          decryptionSuccessful = true;
          usedKey = key1;
        }
      } catch (e) {
        console.log("Decryption failed with default salt:", e);
      }
    }
    
    // Attempt 2: Try with no salt
    if (!decryptionSuccessful) {
      console.log("Attempt 2: Trying to decrypt with no salt");
      const key2 = deriveKeyFromPassword(password, '');
      if (key2) {
        setEncryptionKey(key2);
        try {
          decryptedData = decryptData(vaultFileObj.data);
          if (decryptedData && typeof decryptedData === 'object') {
            console.log("Decryption successful using no salt");
            decryptionSuccessful = true;
            usedKey = key2;
          }
        } catch (e) {
          console.log("Decryption failed with no salt:", e);
        }
      }
    }
    
    // Attempt 3: Try with password directly
    if (!decryptionSuccessful) {
      console.log("Attempt 3: Trying to decrypt with password directly");
      setEncryptionKey(password);
      try {
        decryptedData = decryptData(vaultFileObj.data);
        if (decryptedData && typeof decryptedData === 'object') {
          console.log("Decryption successful using password directly");
          decryptionSuccessful = true;
          usedKey = password;
        }
      } catch (e) {
        console.log("Decryption failed with direct password:", e);
      }
    }
    
    // Attempt 4: Try with SHA-256 of password
    if (!decryptionSuccessful) {
      console.log("Attempt 4: Trying to decrypt with SHA-256 of password");
      const key4 = CryptoJS.SHA256(password).toString();
      setEncryptionKey(key4);
      try {
        decryptedData = decryptData(vaultFileObj.data);
        if (decryptedData && typeof decryptedData === 'object') {
          console.log("Decryption successful using SHA-256 of password");
          decryptionSuccessful = true;
          usedKey = key4;
        }
      } catch (e) {
        console.log("Decryption failed with SHA-256 of password:", e);
      }
    }
    
    if (!decryptionSuccessful) {
      console.error("All decryption attempts failed - invalid password or corrupt file");
      throw new Error("Invalid password or corrupt file");
    }
    
    // Set the vault file only after successful decryption
    setVaultFile(file);
    console.log("Vault file set successfully");
    
    // Check and initialize data structure if needed
    if (!decryptedData.docs) decryptedData.docs = {};
    if (!decryptedData.files) decryptedData.files = {};
    if (!decryptedData.photos) decryptedData.photos = {};
    
    // Log stats about the imported data
    const stats = {
      docs: Object.keys(decryptedData.docs).length,
      files: Object.keys(decryptedData.files).length,
      photos: Object.keys(decryptedData.photos).length
    };
    
    console.log(`Imported vault data statistics: ${stats.docs} docs, ${stats.files} files, ${stats.photos} photos`);
    
    // Store the decrypted data
    vaultData = decryptedData;
    
    // Store the working key in session storage
    if (usedKey) {
      sessionStorage.setItem('sessionKey', usedKey);
      console.log("Saved working key to session storage");
    }
    
    console.log("Vault file imported successfully");
    return true;
  } catch (error) {
    console.error("Error importing vault file:", error);
    return false;
  }
}

/**
 * Export database to a file
 * @returns {Promise<boolean>} True if export was successful
 */
export async function exportDatabase() {
  try {
    // Get the current database state
    if (!encryptionKey) {
      console.error("No encryption key available");
      return false;
    }
    
    console.log("Starting vault export process...");
    console.log("Current encryption key type:", typeof encryptionKey);
    
    // We need to make sure we're exporting the most up-to-date data
    // First, trigger an autosave to ensure all modules save their data
    window.dispatchEvent(new CustomEvent('vault:autosave'));
    
    // Wait a moment for the autosave to complete
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Ensure vaultData is populated with all the latest data
    const mergedData = {};
    
    // If we have existing vault data, start with that
    if (vaultData) {
      Object.assign(mergedData, vaultData);
    }
    
    // Make sure all sections exist
    if (!mergedData.docs) mergedData.docs = {};
    if (!mergedData.files) mergedData.files = {};  
    if (!mergedData.photos) mergedData.photos = {};
    
    // Ensure we store the auth data as well, which is important for imports
    if (!mergedData.auth) {
      // Try to get from localStorage
      const authDataStr = localStorage.getItem('auth');
      if (authDataStr) {
        try {
          mergedData.auth = JSON.parse(authDataStr);
          console.log("Included auth data from localStorage in export");
        } catch (e) {
          console.warn("Could not parse auth data from localStorage");
        }
      }
    }
    
    console.log("Preparing to export vault with data:", 
      `${Object.keys(mergedData.docs).length} documents, ` +
      `${Object.keys(mergedData.files).length} files, ` + 
      `${Object.keys(mergedData.photos).length} photos`);
    
    // Store current encryptionKey to restore later
    const originalKey = encryptionKey;
    
    // Set the current encryption key for the export
    // This ensures the export and import process use the same key derivation
    let currentSessionKey = sessionStorage.getItem('sessionKey');
    if (currentSessionKey) {
      console.log("Using session key for export");
      setEncryptionKey(currentSessionKey);
    }
    
    // Use saveToSecureStorage with the merged data and download flag set to true
    const result = await saveToSecureStorage(mergedData, true);
    
    // Restore original key
    setEncryptionKey(originalKey);
    
    return result;
  } catch (error) {
    console.error("Error exporting database:", error);
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
  importDatabaseWithPassword,
  exportDatabase
}; 