// Import crypto functionality
import CryptoJS from 'crypto-js';
import {
  deriveKeyFromPassword,
  validatePassword,
  setEncryptionKey,
  encryptData,
  decryptData,
  saveToSecureStorage,
  setVaultFile,
  importDatabaseWithPassword
} from './database.js';
import { showNotification } from './ui.js';

// Auth Event system
export const AUTH_EVENTS = {
  LOGIN: 'auth:login',
  LOGOUT: 'auth:logout',
  REGISTER: 'auth:register',
  ERROR: 'auth:error'
};

// Authentication state
let isAuthenticated = false;
let authData = null;
let username = null;

// Hidden file input for vault selection
let vaultFileInput = null;

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
  // Check both the isAuthenticated flag and session storage
  return isAuthenticated || sessionStorage.getItem('sessionKey') !== null;
}

/**
 * Create a new user
 * @param {string} password - The password to set
 * @returns {Promise<boolean>} True if user was created successfully
 */
export async function createUser(password) {
  if (!password) {
    console.error("Create user error: Password is empty");
    return false;
  }

  try {
    console.log("Creating user with password...");
    
    // Check if CryptoJS is properly loaded
    if (!CryptoJS || !CryptoJS.lib || !CryptoJS.lib.WordArray) {
      throw new Error("CryptoJS library is not properly loaded");
    }
    
    // Generate a random salt
    const salt = CryptoJS.lib.WordArray.random(16).toString();
    console.log("Salt generated:", salt);
    
    // Derive a key from the password
    const derivedKey = deriveKeyFromPassword(password, salt);
    console.log("Key derived successfully");
    
    // Hash the derived key for storage
    const keyHash = CryptoJS.SHA256(derivedKey).toString();
    console.log("Key hash created");
    
    // Store auth data in localStorage
    const authData = {
      salt,
      keyHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem('auth', JSON.stringify(authData));
    console.log("Auth data stored in localStorage");
    
    // Store session key in sessionStorage
    sessionStorage.setItem('sessionKey', derivedKey);
    console.log("Session key stored");
    
    // Set the encryption key for the database
    const encryptionKeySet = setEncryptionKey(derivedKey);
    console.log("Encryption key set:", encryptionKeySet);
    
    // Create empty vault structure
    const emptyVault = {
      docs: {},
      photos: {},
      files: {},
      auth: authData
    };
    
    // Save the vault to secure storage
    const saved = await saveToSecureStorage(emptyVault);
    console.log("Empty vault created:", saved);
    
    // Dispatch login event
    window.dispatchEvent(new CustomEvent(AUTH_EVENTS.LOGIN));
    console.log("Login event dispatched");
    
    return true;
  } catch (error) {
    console.error("Error creating user:", error.message);
    console.error("Error stack:", error.stack);
    return false;
  }
}

/**
 * Authenticate a user
 * @param {string} password - The password to authenticate with
 * @returns {boolean} True if authentication was successful
 */
export function authenticateUser(password) {
  if (!password) {
    console.error("Authentication error: Password is empty");
    return false;
  }
  
  try {
    console.log("Authenticating user...");
    
    // Get stored auth data
    const authDataStr = localStorage.getItem('auth');
    if (!authDataStr) {
      console.error("Authentication error: No auth data found in localStorage");
      return false;
    }
    
    const authData = JSON.parse(authDataStr);
    console.log("Auth data retrieved successfully");
    
    // Validate the password
    const isValid = validatePassword(password, authData);
    console.log("Password validation result:", isValid);
    
    if (isValid) {
      // Derive the key again
      const derivedKey = deriveKeyFromPassword(password, authData.salt);
      console.log("Key derived successfully");
      
      // Store session key in sessionStorage
      sessionStorage.setItem('sessionKey', derivedKey);
      console.log("Session key stored");
      
      // Set the encryption key for the database
      const encryptionKeySet = setEncryptionKey(derivedKey);
      console.log("Encryption key set:", encryptionKeySet);
      
      // Set authentication state
      isAuthenticated = true;
      
      // Dispatch login event
      window.dispatchEvent(new CustomEvent(AUTH_EVENTS.LOGIN));
      console.log("Login event dispatched");
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error authenticating user:", error.message);
    console.error("Error stack:", error.stack);
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
 * Import database with password (local implementation)
 * @param {File} file - The file to import
 * @param {string} password - The password for decryption
 * @returns {Promise<boolean>} True if import was successful
 */
export async function handleDatabaseImport(file, password) {
  if (!file || !password) {
    console.error("Import error: Missing file or password");
    return false;
  }
  
  try {
    console.log("Importing database with password...");
    
    // Create a new user with the password
    const created = await createUser(password);
    console.log("User created for import:", created);
    
    if (!created) return false;
    
    // Use the importDatabaseWithPassword function from database.js
    const imported = await importDatabaseWithPassword(file, password);
    console.log("Database imported:", imported);
    
    return imported;
  } catch (error) {
    console.error("Error importing database with password:", error.message);
    console.error("Error stack:", error.stack);
    return false;
  }
}

/**
 * Initialize authentication
 */
export function initializeAuth() {
  console.log('Initializing authentication...');
  
  // Create hidden file input for vault selection
  vaultFileInput = document.createElement('input');
  vaultFileInput.type = 'file';
  vaultFileInput.id = 'vault-file-input';
  vaultFileInput.accept = '.vault';
  vaultFileInput.style.display = 'none';
  document.body.appendChild(vaultFileInput);
  
  // Get authentication elements
  const authScreen = document.getElementById('auth-screen');
  const mainScreen = document.getElementById('main-screen');
  const passwordForm = document.getElementById('password-form');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const unlockBtn = document.getElementById('unlock-btn');
  const newUserFields = document.getElementById('new-user-fields');
  const logoutBtn = document.getElementById('logout-btn');
  const importDbBtn = document.getElementById('import-db-btn');
  const importFileInput = document.getElementById('import-file-input');
  
  // Check if user exists
  const hasUser = userExists();
  
  // Show/hide appropriate fields based on whether user exists
  if (hasUser) {
    logoutBtn.textContent = 'Logout';
    newUserFields.style.display = 'none';
    unlockBtn.textContent = 'Unlock Vault';
  } else {
    logoutBtn.textContent = 'Logout';
    newUserFields.style.display = 'block';
    unlockBtn.textContent = 'Create Vault';
  }
  
  // Add click handler for unlock button
  if (unlockBtn) {
    unlockBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      
      // Get values
      const password = passwordInput.value.trim();
      
      // If existing user, handle login
      if (hasUser) {
        // Validate
        if (!password) {
          showAuthMessage('Please enter your password', 'error');
          return;
        }
        
        // Disable button during authentication
        unlockBtn.disabled = true;
        unlockBtn.textContent = 'Unlocking...';
        
        try {
          // Prompt user to select their vault file
          vaultFileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) {
              showAuthMessage('No vault file selected', 'error');
              unlockBtn.disabled = false;
              unlockBtn.textContent = 'Unlock Vault';
              return;
            }
            
            // Set the vault file and attempt login
            const success = await login(password, file);
            
            if (success) {
              // Hide auth screen, show main screen
              authScreen.classList.remove('active');
              mainScreen.classList.add('active');
              
              // Clear password
              passwordInput.value = '';
              
              // Show welcome message
              showAuthMessage(`Login successful`, 'success');
            } else {
              showAuthMessage('Invalid password or corrupted vault file', 'error');
            }
            
            // Reset button
            unlockBtn.disabled = false;
            unlockBtn.textContent = 'Unlock Vault';
          };
          
          // Trigger file selection
          vaultFileInput.click();
        } catch (error) {
          console.error('Login error:', error);
          showAuthMessage('Login failed: ' + error.message, 'error');
          
          // Reset button
          unlockBtn.disabled = false;
          unlockBtn.textContent = 'Unlock Vault';
        }
      } else {
        // Handle signup for new user
        const confirmPassword = confirmPasswordInput.value.trim();
        
        // Validate
        if (!password) {
          showAuthMessage('Please enter a password', 'error');
          return;
        }
        
        if (password !== confirmPassword) {
          showAuthMessage('Passwords do not match', 'error');
          return;
        }
        
        if (password.length < 8) {
          showAuthMessage('Password must be at least 8 characters', 'error');
          return;
        }
        
        // Disable button during signup
        unlockBtn.disabled = true;
        unlockBtn.textContent = 'Creating Vault...';
        
        try {
          // Create a new vault
          const success = await signup(password);
          
          if (success) {
            // Hide auth screen, show main screen
            authScreen.classList.remove('active');
            mainScreen.classList.add('active');
            
            // Clear passwords
            passwordInput.value = '';
            confirmPasswordInput.value = '';
            
            // Show welcome message
            showAuthMessage('New vault created successfully! Your vault file has been downloaded.', 'success');
            showNotification('Remember to keep your vault file safe!', 'info');
          }
          
          // Reset button
          unlockBtn.disabled = false;
          unlockBtn.textContent = 'Create Vault';
        } catch (error) {
          console.error('Signup error:', error);
          showAuthMessage('Vault creation failed: ' + error.message, 'error');
          
          // Reset button
          unlockBtn.disabled = false;
          unlockBtn.textContent = 'Create Vault';
        }
      }
    });
  }
  
  // Password form submission - just prevent default since we use the button click handler
  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
    });
  }
  
  // Logout button
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      
      logout();
      
      // Hide main screen, show auth screen
      mainScreen.classList.remove('active');
      authScreen.classList.add('active');
      
      // Reset UI for login
      if (hasUser) {
        newUserFields.style.display = 'none';
        unlockBtn.textContent = 'Unlock Vault';
      } else {
        newUserFields.style.display = 'block';
        unlockBtn.textContent = 'Create Vault';
      }
      
      // Show logout message
      showAuthMessage('You have been logged out', 'success');
    });
  }
  
  // Import database button
  if (importDbBtn && importFileInput) {
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
  let selectedImportFile = null; // Store the selected file for import
  
  if (importFileInput) {
    importFileInput.addEventListener('change', async (e) => {
      selectedImportFile = e.target.files[0]; // Store the selected file
      
      if (!selectedImportFile) return;
      
      console.log('Import file selected:', selectedImportFile.name);
      
      // Show password modal for importing
      const importModal = document.getElementById('import-modal');
      if (importModal) {
        importModal.classList.add('active');
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
  
  // Add event listener for the import confirmation button
  const importConfirmBtn = document.getElementById('import-confirm-btn');
  if (importConfirmBtn) {
    importConfirmBtn.addEventListener('click', async () => {
      console.log('Import confirmation button clicked');
      
      // Use the stored selected file instead of trying to get it from db-import
      console.log('Selected file for import:', selectedImportFile ? selectedImportFile.name : 'None');
      
      const password = document.getElementById('import-password').value.trim();
      
      // Validate
      if (!selectedImportFile) {
        showAuthMessage('Please select a vault file', 'error');
        return;
      }
      
      if (!password) {
        showAuthMessage('Please enter a password', 'error');
        return;
      }
      
      // Show processing message
      showAuthMessage('Processing vault file...', 'info');
      
      // Disable button during import
      importConfirmBtn.disabled = true;
      importConfirmBtn.textContent = 'Importing...';
      
      try {
        // Ensure the file has the right extension
        const fileName = selectedImportFile.name.toLowerCase();
        if (!fileName.endsWith('.vault') && !fileName.endsWith('.json')) {
          showAuthMessage('Selected file must be a .vault file', 'error');
          importConfirmBtn.disabled = false;
          importConfirmBtn.textContent = 'Import';
          return;
        }
        
        // Use the imported function
        const imported = await importDatabaseWithPassword(selectedImportFile, password);
        console.log('Import result:', imported);
        
        if (imported) {
          // Clear the stored file reference
          selectedImportFile = null;
          
          // Close the modal
          document.getElementById('import-modal').classList.remove('active');
          
          // Hide auth screen, show main screen
          authScreen.classList.remove('active');
          mainScreen.classList.add('active');
          
          // Show success message
          showAuthMessage('Vault imported successfully', 'success');
          
          // Dispatch login event to trigger app initialization
          window.dispatchEvent(new CustomEvent(AUTH_EVENTS.LOGIN));
        } else {
          showAuthMessage('Error importing vault. Invalid password or corrupted file.', 'error');
        }
      } catch (error) {
        console.error('Import error:', error);
        showAuthMessage('Error importing vault: ' + error.message, 'error');
      } finally {
        // Reset button
        importConfirmBtn.disabled = false;
        importConfirmBtn.textContent = 'Import';
      }
    });
  }
  
  // Add event listeners for closing the import modal
  const importModal = document.getElementById('import-modal');
  const closeModalButtons = document.querySelectorAll('#import-modal .close-modal');
  if (closeModalButtons.length > 0) {
    closeModalButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Close the modal
        if (importModal) {
          importModal.classList.remove('active');
        }
      });
    });
  }
  
  // Check if user is already authenticated
  if (checkAuthentication()) {
    // Get the session key
    const sessionKey = sessionStorage.getItem('sessionKey');
    
    // Set the encryption key
    setEncryptionKey(sessionKey);
    
    // Show main screen
    authScreen.classList.remove('active');
    mainScreen.classList.add('active');
  }
  
  // Helper function to show auth messages
  function showAuthMessage(message, type) {
    const messageContainer = document.getElementById('auth-message');
    if (!messageContainer) {
      console.error('Auth message container not found');
      return;
    }
    
    messageContainer.textContent = message;
    messageContainer.className = 'message';
    messageContainer.classList.add(`${type}-message`);
    
    // Clear the message after 3 seconds
    setTimeout(() => {
      messageContainer.textContent = '';
      messageContainer.className = 'message';
    }, 3000);
  }
  
  // Helper function to clear auth messages
  function clearAuthMessages() {
    const messageContainer = document.getElementById('auth-message');
    if (messageContainer) {
      messageContainer.textContent = '';
      messageContainer.className = 'message';
    }
  }
  
  console.log('Authentication initialized');
}

/**
 * Login with password and vault file
 * @param {string} password - The password to use
 * @param {File} vaultFile - The vault file to use
 * @returns {Promise<boolean>} True if login was successful
 */
export async function login(password, vaultFile) {
  try {
    console.log('Attempting login...');
    
    // Use the imported function from database.js
    const success = await importDatabaseWithPassword(vaultFile, password);
    
    if (success) {
      // Set authentication state
      isAuthenticated = true;
      
      // Set the vault file
      setVaultFile(vaultFile);
      
      // Set the username (could be derived from the vault file name)
      username = vaultFile.name.split('.')[0];
      
      // Show the main screen, hide auth screen
      const authScreen = document.getElementById('auth-screen');
      const mainScreen = document.getElementById('main-screen');
      if (authScreen && mainScreen) {
        authScreen.classList.remove('active');
        mainScreen.classList.add('active');
      }
      
      // Dispatch login event to trigger app initialization
      window.dispatchEvent(new CustomEvent(AUTH_EVENTS.LOGIN));
      
      console.log('Login successful');
      return true;
    } else {
      console.error('Login failed: incorrect password or corrupted vault file');
      return false;
    }
  } catch (error) {
    console.error('Login error:', error);
    return false;
  }
}

/**
 * Sign up with a new password
 * @param {string} password - The password to use
 * @returns {Promise<boolean>} True if signup was successful
 */
export async function signup(password) {
  try {
    console.log('Creating new vault...');
    
    // Generate a salt
    const salt = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Derive key from password
    const key = deriveKeyFromPassword(password, salt);
    if (!key) {
      throw new Error('Failed to derive key from password');
    }
    
    // Set the encryption key
    setEncryptionKey(key);
    
    // Create auth data
    const keyHash = CryptoJS.SHA256(key).toString();
    authData = {
      salt,
      keyHash
    };
    
    // Create empty vault with structure
    const emptyVault = {
      docs: {},
      photos: {},
      files: {},
      auth: authData
    };
    
    // Save the vault
    const saved = await saveToSecureStorage(emptyVault);
    
    if (saved) {
      // Set authentication state
      isAuthenticated = true;
      
      // Show the main screen, hide auth screen
      const authScreen = document.getElementById('auth-screen');
      const mainScreen = document.getElementById('main-screen');
      if (authScreen && mainScreen) {
        authScreen.classList.remove('active');
        mainScreen.classList.add('active');
      }
      
      // Dispatch login event to trigger app initialization
      window.dispatchEvent(new CustomEvent(AUTH_EVENTS.LOGIN));
      
      console.log('New vault created successfully');
      return true;
    } else {
      throw new Error('Failed to save vault');
    }
  } catch (error) {
    console.error('Signup error:', error);
    return false;
  }
}

/**
 * Logout
 */
export function logout() {
  console.log('Logging out...');
  
  // Clear authentication state
  isAuthenticated = false;
  authData = null;
  username = null;
  
  // Clear encryption key
  setEncryptionKey(null);
  
  // Clear vault file
  setVaultFile(null);
  
  console.log('Logout successful');
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
  initializeAuth,
  login,
  signup,
  logout,
  isAuthenticated: () => isAuthenticated,
  getUsername: () => username,
  handleDatabaseImport
}; 