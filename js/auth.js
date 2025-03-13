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
const AUTH_EVENTS = {
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
  const authForm = document.getElementById('auth-form');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('login-btn');
  const createAccountBtn = document.getElementById('create-account-btn');
  const importVaultBtn = document.getElementById('import-vault-btn');
  const fileInput = document.getElementById('import-file');
  const messageContainer = document.getElementById('auth-message');
  
  // Check if user exists
  const hasUser = userExists();
  
  // Show/hide appropriate buttons
  if (hasUser) {
    loginBtn.style.display = 'block';
    createAccountBtn.style.display = 'none';
    document.getElementById('auth-title').textContent = 'Unlock Your Vault';
    document.getElementById('auth-subtitle').textContent = 'Enter your password to continue';
  } else {
    loginBtn.style.display = 'none';
    createAccountBtn.style.display = 'block';
    document.getElementById('auth-title').textContent = 'Create Your Vault';
    document.getElementById('auth-subtitle').textContent = 'Set a strong password to secure your data';
  }
  
  // Handle login button click
  loginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    
    const password = passwordInput.value.trim();
    
    if (!password) {
      showAuthMessage('Please enter your password', 'error');
      return;
    }
    
    const authenticated = authenticateUser(password);
    
    if (authenticated) {
      authScreen.classList.remove('active');
      mainScreen.classList.add('active');
      passwordInput.value = '';
    } else {
      showAuthMessage('Invalid password', 'error');
    }
  });
  
  // Handle create account button click
  createAccountBtn.addEventListener('click', (e) => {
    e.preventDefault();
    
    const password = passwordInput.value.trim();
    
    if (!password) {
      showAuthMessage('Please enter a password', 'error');
      return;
    }
    
    if (password.length < 8) {
      showAuthMessage('Password must be at least 8 characters', 'error');
      return;
    }
    
    const created = createUser(password);
    
    if (created) {
      authScreen.classList.remove('active');
      mainScreen.classList.add('active');
      passwordInput.value = '';
      showAuthMessage('Account created successfully', 'success');
    } else {
      showAuthMessage('Error creating account', 'error');
    }
  });
  
  // Handle import vault button click
  importVaultBtn.addEventListener('click', (e) => {
    e.preventDefault();
    fileInput.click();
  });
  
  // Handle file input change
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    
    if (!file) return;
    
    const password = passwordInput.value.trim();
    
    if (!password) {
      showAuthMessage('Please enter a password', 'error');
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
  });
  
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