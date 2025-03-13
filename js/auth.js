// Import crypto functionality
import {
  deriveKeyFromPassword,
  validatePassword,
  setEncryptionKey,
  createEmptyDatabase,
  importDatabase,
  initializeDatabase
} from './database.js';

// Auth Event system
export const AUTH_EVENTS = {
  LOGIN: 'auth:login',
  LOGOUT: 'auth:logout',
  REGISTER: 'auth:register',
  ERROR: 'auth:error'
};

/**
 * Check if user exists (has saved auth data)
 * @returns {boolean} True if user exists
 */
export function userExists() {
  return localStorage.getItem('auth') !== null;
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if user is authenticated
 */
export function checkAuthentication() {
  return sessionStorage.getItem('sessionKey') !== null;
}

/**
 * Create a new user
 * @param {string} password - The password to set
 * @returns {boolean} True if user was created successfully
 */
export function createUser(password) {
  if (!password) return false;

  try {
    // Generate a random salt
    const salt = CryptoJS.lib.WordArray.random(16).toString();
    
    // Derive a key from the password
    const derivedKey = deriveKeyFromPassword(password, salt);
    
    // Hash the derived key for storage
    const keyHash = CryptoJS.SHA256(derivedKey).toString();
    
    // Store auth data in localStorage
    const authData = {
      salt,
      keyHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem('auth', JSON.stringify(authData));
    
    // Store session key in sessionStorage
    sessionStorage.setItem('sessionKey', derivedKey);
    
    // Set the encryption key for the database
    setEncryptionKey(derivedKey);
    
    // Initialize and create empty database
    initializeDatabase();
    createEmptyDatabase();
    
    // Dispatch login event
    window.dispatchEvent(new CustomEvent(AUTH_EVENTS.LOGIN));
    
    return true;
  } catch (error) {
    console.error("Error creating user:", error);
    return false;
  }
}

/**
 * Authenticate a user
 * @param {string} password - The password to authenticate with
 * @returns {boolean} True if authentication was successful
 */
export function authenticateUser(password) {
  if (!password) return false;
  
  try {
    // Get stored auth data
    const authDataStr = localStorage.getItem('auth');
    if (!authDataStr) return false;
    
    const authData = JSON.parse(authDataStr);
    
    // Validate the password
    const isValid = validatePassword(password, authData);
    
    if (isValid) {
      // Derive the key again
      const derivedKey = deriveKeyFromPassword(password, authData.salt);
      
      // Store session key in sessionStorage
      sessionStorage.setItem('sessionKey', derivedKey);
      
      // Set the encryption key for the database
      setEncryptionKey(derivedKey);
      
      // Initialize database
      initializeDatabase();
      
      // Dispatch login event
      window.dispatchEvent(new CustomEvent(AUTH_EVENTS.LOGIN));
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error authenticating user:", error);
    return false;
  }
}

/**
 * Change user password
 * @param {string} currentPassword - The current password
 * @param {string} newPassword - The new password to set
 * @returns {boolean} True if password was changed successfully
 */
export function changePassword(currentPassword, newPassword) {
  if (!currentPassword || !newPassword) return false;
  
  try {
    // First authenticate with current password
    const isAuthenticated = authenticateUser(currentPassword);
    
    if (!isAuthenticated) return false;
    
    // Generate a new salt
    const salt = CryptoJS.lib.WordArray.random(16).toString();
    
    // Derive a key from the new password
    const derivedKey = deriveKeyFromPassword(newPassword, salt);
    
    // Hash the derived key for storage
    const keyHash = CryptoJS.SHA256(derivedKey).toString();
    
    // Get the current auth data to preserve creation date
    const authDataStr = localStorage.getItem('auth');
    const currentAuthData = JSON.parse(authDataStr);
    
    // Update auth data in localStorage
    const authData = {
      salt,
      keyHash,
      createdAt: currentAuthData.createdAt,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem('auth', JSON.stringify(authData));
    
    // Update session key in sessionStorage
    sessionStorage.setItem('sessionKey', derivedKey);
    
    // Set the new encryption key for the database
    setEncryptionKey(derivedKey);
    
    return true;
  } catch (error) {
    console.error("Error changing password:", error);
    return false;
  }
}

/**
 * Logout user
 */
export function logoutUser() {
  sessionStorage.removeItem('sessionKey');
  
  // Dispatch logout event
  window.dispatchEvent(new CustomEvent(AUTH_EVENTS.LOGOUT));
}

/**
 * Import database with password
 * @param {File} file - The file to import
 * @param {string} password - The password for decryption
 * @returns {boolean} True if import was successful
 */
export async function importDatabaseWithPassword(file, password) {
  if (!file || !password) return false;
  
  try {
    // Create a new user with the password
    const created = createUser(password);
    
    if (!created) return false;
    
    // Import the database
    const imported = await importDatabase(file);
    
    return imported;
  } catch (error) {
    console.error("Error importing database with password:", error);
    return false;
  }
}

/**
 * Initialize authentication
 */
export function initializeAuth() {
  const authScreen = document.getElementById('auth-screen');
  const mainScreen = document.getElementById('main-screen');
  const passwordForm = document.getElementById('password-form');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const unlockBtn = document.getElementById('unlock-btn');
  const importDbBtn = document.getElementById('import-db-btn');
  const newUserFields = document.getElementById('new-user-fields');
  const messageContainer = document.getElementById('auth-message');
  const importFileInput = document.getElementById('import-file-input');
  
  // Check if user exists
  const hasUser = userExists();
  
  // Show/hide appropriate fields
  if (hasUser) {
    unlockBtn.textContent = 'Unlock Vault';
    newUserFields.style.display = 'none';
  } else {
    unlockBtn.textContent = 'Create Vault';
    newUserFields.style.display = 'block';
  }
  
  // Handle unlock/create button click
  unlockBtn.addEventListener('click', (e) => {
    e.preventDefault();
    
    const password = passwordInput.value.trim();
    
    if (!password) {
      showAuthMessage('Please enter your password', 'error');
      return;
    }
    
    if (hasUser) {
      // Login existing user
      const authenticated = authenticateUser(password);
      
      if (authenticated) {
        authScreen.classList.remove('active');
        mainScreen.classList.add('active');
        passwordInput.value = '';
      } else {
        showAuthMessage('Invalid password', 'error');
      }
    } else {
      // Create new user
      const confirmPassword = confirmPasswordInput.value.trim();
      
      if (password.length < 8) {
        showAuthMessage('Password must be at least 8 characters', 'error');
        return;
      }
      
      if (password !== confirmPassword) {
        showAuthMessage('Passwords do not match', 'error');
        return;
      }
      
      const created = createUser(password);
      
      if (created) {
        authScreen.classList.remove('active');
        mainScreen.classList.add('active');
        passwordInput.value = '';
        confirmPasswordInput.value = '';
      } else {
        showAuthMessage('Error creating vault', 'error');
      }
    }
  });
  
  // Handle import database button click
  if (importDbBtn) {
    importDbBtn.addEventListener('click', (e) => {
      e.preventDefault();
      
      // If we have an import file input, trigger it
      if (importFileInput) {
        importFileInput.click();
      } else {
        showAuthMessage('Import functionality not available', 'error');
      }
    });
  }
  
  // Handle file input change (if present)
  if (importFileInput) {
    importFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      
      if (!file) return;
      
      // Show password modal for importing
      const importModal = document.getElementById('import-modal');
      if (importModal) {
        importModal.classList.add('active');
        
        // Store the file reference for later use
        importFileInput._selectedFile = file;
      } else {
        // If no modal exists, proceed with direct password prompt
        const password = passwordInput.value.trim();
        
        if (!password) {
          showAuthMessage('Please enter a password for the imported vault', 'error');
          return;
        }
        
        const imported = await importDatabaseWithPassword(file, password);
        
        if (imported) {
          authScreen.classList.remove('active');
          mainScreen.classList.add('active');
          passwordInput.value = '';
          showAuthMessage('Vault imported successfully', 'success');
        } else {
          showAuthMessage('Error importing vault', 'error');
        }
      }
    });
  }
  
  // Handle import confirmation
  const importConfirmBtn = document.getElementById('import-confirm-btn');
  if (importConfirmBtn) {
    importConfirmBtn.addEventListener('click', async () => {
      const importModal = document.getElementById('import-modal');
      const importPassword = document.getElementById('import-password');
      const file = importFileInput._selectedFile;
      
      if (!file) {
        showAuthMessage('No file selected', 'error');
        importModal.classList.remove('active');
        return;
      }
      
      const password = importPassword.value.trim();
      
      if (!password) {
        showAuthMessage('Please enter a password', 'error');
        return;
      }
      
      const imported = await importDatabaseWithPassword(file, password);
      
      if (imported) {
        importModal.classList.remove('active');
        authScreen.classList.remove('active');
        mainScreen.classList.add('active');
        importPassword.value = '';
        showAuthMessage('Vault imported successfully', 'success');
      } else {
        showAuthMessage('Error importing vault', 'error');
      }
    });
  }
  
  // Listen for auth events
  window.addEventListener(AUTH_EVENTS.LOGIN, () => {
    console.log('User logged in');
  });
  
  window.addEventListener(AUTH_EVENTS.LOGOUT, () => {
    authScreen.classList.add('active');
    mainScreen.classList.remove('active');
    console.log('User logged out');
  });
  
  // Check if user is already authenticated
  if (checkAuthentication()) {
    // Get the session key
    const sessionKey = sessionStorage.getItem('sessionKey');
    
    // Set the encryption key
    setEncryptionKey(sessionKey);
    
    // Initialize the database
    initializeDatabase();
    
    // Show main screen
    authScreen.classList.remove('active');
    mainScreen.classList.add('active');
  }
  
  // Helper function to show auth messages
  function showAuthMessage(message, type) {
    messageContainer.textContent = message;
    messageContainer.className = 'message';
    messageContainer.classList.add(`${type}-message`);
    
    // Clear the message after 3 seconds
    setTimeout(() => {
      messageContainer.textContent = '';
      messageContainer.className = 'message';
    }, 3000);
  }
}

// Export auth module
export default {
  AUTH_EVENTS,
  userExists,
  checkAuthentication,
  createUser,
  authenticateUser,
  changePassword,
  logoutUser,
  importDatabaseWithPassword,
  initializeAuth
}; 