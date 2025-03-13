// Import crypto functionality
import {
  deriveKeyFromPassword,
  validatePassword,
  setEncryptionKey,
  loadDatabase,
  importDatabase
} from './database.js';

// Check if a user exists
async function userExists() {
  try {
    // Check if auth data exists in localStorage
    const authData = localStorage.getItem('mdvault_auth');
    return !!authData;
  } catch (error) {
    console.error('Error checking if user exists:', error);
    return false;
  }
}

// Check if user is authenticated
async function checkAuthentication() {
  try {
    // Check if a key is stored in sessionStorage (for current session)
    const sessionKey = sessionStorage.getItem('mdvault_session_key');
    if (sessionKey) {
      // Set the encryption key from the session
      setEncryptionKey(sessionKey);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}

// Create a new user
async function createUser(password) {
  try {
    // Derive a key from the password
    const keyData = await deriveKeyFromPassword(password);
    
    // Store auth data in localStorage
    const authData = {
      key: keyData.key,
      salt: keyData.salt,
      iterations: keyData.iterations
    };
    
    localStorage.setItem('mdvault_auth', JSON.stringify(authData));
    
    // Store session key in sessionStorage
    sessionStorage.setItem('mdvault_session_key', keyData.key);
    
    // Set the encryption key
    setEncryptionKey(keyData.key);
    
    return true;
  } catch (error) {
    console.error('Error creating user:', error);
    return false;
  }
}

// Authenticate a user
async function authenticateUser(password) {
  try {
    // Get auth data from localStorage
    const authDataJson = localStorage.getItem('mdvault_auth');
    if (!authDataJson) {
      return false;
    }
    
    const authData = JSON.parse(authDataJson);
    
    // Validate the password
    const isValid = await validatePassword(
      password,
      authData.key,
      authData.salt,
      authData.iterations
    );
    
    if (isValid) {
      // Store session key in sessionStorage
      sessionStorage.setItem('mdvault_session_key', authData.key);
      
      // Set the encryption key
      setEncryptionKey(authData.key);
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error authenticating user:', error);
    return false;
  }
}

// Change user password
async function changePassword(currentPassword, newPassword) {
  try {
    // Get auth data from localStorage
    const authDataJson = localStorage.getItem('mdvault_auth');
    if (!authDataJson) {
      return { success: false, message: 'No user found' };
    }
    
    const authData = JSON.parse(authDataJson);
    
    // Validate the current password
    const isValid = await validatePassword(
      currentPassword,
      authData.key,
      authData.salt,
      authData.iterations
    );
    
    if (!isValid) {
      return { success: false, message: 'Current password is incorrect' };
    }
    
    // Derive a new key from the new password
    const newKeyData = await deriveKeyFromPassword(newPassword);
    
    // Update auth data in localStorage
    const newAuthData = {
      key: newKeyData.key,
      salt: newKeyData.salt,
      iterations: newKeyData.iterations
    };
    
    localStorage.setItem('mdvault_auth', JSON.stringify(newAuthData));
    
    // Update the session key
    sessionStorage.setItem('mdvault_session_key', newKeyData.key);
    
    // Update the encryption key (this will reencrypt the database)
    const result = await setEncryptionKey(newKeyData.key);
    
    return { success: result, message: result ? 'Password changed successfully' : 'Failed to change password' };
  } catch (error) {
    console.error('Error changing password:', error);
    return { success: false, message: 'An error occurred: ' + error.message };
  }
}

// Log out the user
function logoutUser() {
  // Remove the session key
  sessionStorage.removeItem('mdvault_session_key');
  
  return true;
}

// Import a database with a password
async function importDatabaseWithPassword(fileContent, password) {
  try {
    // Parse the file content
    const importData = JSON.parse(fileContent);
    
    // Create a new user with the provided password
    const created = await createUser(password);
    if (!created) {
      return { success: false, message: 'Failed to set up encryption' };
    }
    
    // Import the database
    const imported = await importDatabase(fileContent);
    
    return {
      success: imported,
      message: imported ? 'Database imported successfully' : 'Failed to import database'
    };
  } catch (error) {
    console.error('Error importing database with password:', error);
    return { success: false, message: 'An error occurred: ' + error.message };
  }
}

// Initialize authentication
function initializeAuth(appState) {
  const unlockBtn = document.getElementById('unlock-btn');
  const importDbBtn = document.getElementById('import-db-btn');
  const authScreen = document.getElementById('auth-screen');
  const mainScreen = document.getElementById('main-screen');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const newUserFields = document.getElementById('new-user-fields');
  const authMessage = document.getElementById('auth-message');
  const dbImportInput = document.getElementById('db-import');
  
  // Check if user exists
  userExists().then(exists => {
    if (!exists) {
      // Show fields for new user
      newUserFields.style.display = 'block';
      unlockBtn.textContent = 'Create Vault';
    }
  });
  
  // Unlock button click
  if (unlockBtn) {
    unlockBtn.addEventListener('click', async () => {
      const password = passwordInput.value;
      
      if (!password) {
        authMessage.textContent = 'Please enter a password';
        authMessage.className = 'message error-message';
        return;
      }
      
      // Check if creating a new user
      const isNewUser = newUserFields.style.display !== 'none';
      
      if (isNewUser) {
        const confirmPassword = confirmPasswordInput.value;
        
        if (password !== confirmPassword) {
          authMessage.textContent = 'Passwords do not match';
          authMessage.className = 'message error-message';
          return;
        }
        
        // Create a new user
        const created = await createUser(password);
        
        if (created) {
          authMessage.textContent = 'Vault created successfully';
          authMessage.className = 'message success-message';
          
          // Show main screen
          authScreen.classList.remove('active');
          mainScreen.classList.add('active');
          appState.isAuthenticated = true;
          
          // Initialize app components
          window.dispatchEvent(new CustomEvent('auth:login'));
        } else {
          authMessage.textContent = 'Failed to create vault';
          authMessage.className = 'message error-message';
        }
      } else {
        // Authenticate existing user
        const authenticated = await authenticateUser(password);
        
        if (authenticated) {
          authMessage.textContent = 'Authentication successful';
          authMessage.className = 'message success-message';
          
          // Show main screen
          authScreen.classList.remove('active');
          mainScreen.classList.add('active');
          appState.isAuthenticated = true;
          
          // Initialize app components
          window.dispatchEvent(new CustomEvent('auth:login'));
        } else {
          authMessage.textContent = 'Incorrect password';
          authMessage.className = 'message error-message';
        }
      }
    });
  }
  
  // Import database button
  if (importDbBtn) {
    importDbBtn.addEventListener('click', () => {
      // Trigger file input
      dbImportInput.click();
    });
  }
  
  // File input change
  if (dbImportInput) {
    dbImportInput.addEventListener('change', event => {
      const file = event.target.files[0];
      
      if (file) {
        const reader = new FileReader();
        
        reader.onload = async e => {
          const content = e.target.result;
          
          // Check if password is entered
          const password = passwordInput.value;
          
          if (!password) {
            authMessage.textContent = 'Please enter a password for the imported database';
            authMessage.className = 'message error-message';
            return;
          }
          
          // Import database with password
          const result = await importDatabaseWithPassword(content, password);
          
          authMessage.textContent = result.message;
          authMessage.className = result.success ? 'message success-message' : 'message error-message';
          
          if (result.success) {
            // Show main screen
            authScreen.classList.remove('active');
            mainScreen.classList.add('active');
            appState.isAuthenticated = true;
            
            // Initialize app components
            window.dispatchEvent(new CustomEvent('auth:login'));
          }
        };
        
        reader.readAsText(file);
      }
    });
  }
  
  // Password change
  const changePasswordBtn = document.getElementById('change-password-btn');
  const savePasswordBtn = document.getElementById('save-password-btn');
  const passwordModal = document.getElementById('password-modal');
  const currentPasswordInput = document.getElementById('current-password');
  const newPasswordInput = document.getElementById('new-password');
  const confirmNewPasswordInput = document.getElementById('confirm-new-password');
  const passwordMessage = document.getElementById('password-message');
  
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', () => {
      // Show password modal
      passwordModal.classList.add('active');
    });
  }
  
  if (savePasswordBtn) {
    savePasswordBtn.addEventListener('click', async () => {
      const currentPassword = currentPasswordInput.value;
      const newPassword = newPasswordInput.value;
      const confirmNewPassword = confirmNewPasswordInput.value;
      
      if (!currentPassword || !newPassword || !confirmNewPassword) {
        passwordMessage.textContent = 'All fields are required';
        passwordMessage.className = 'message error-message';
        return;
      }
      
      if (newPassword !== confirmNewPassword) {
        passwordMessage.textContent = 'New passwords do not match';
        passwordMessage.className = 'message error-message';
        return;
      }
      
      // Change password
      const result = await changePassword(currentPassword, newPassword);
      
      passwordMessage.textContent = result.message;
      passwordMessage.className = result.success ? 'message success-message' : 'message error-message';
      
      if (result.success) {
        // Clear inputs
        currentPasswordInput.value = '';
        newPasswordInput.value = '';
        confirmNewPasswordInput.value = '';
        
        // Close modal after a delay
        setTimeout(() => {
          passwordModal.classList.remove('active');
        }, 2000);
      }
    });
  }
  
  // Close modal buttons
  const closeButtons = document.querySelectorAll('.close-modal');
  closeButtons.forEach(button => {
    button.addEventListener('click', () => {
      const modal = button.closest('.modal');
      modal.classList.remove('active');
    });
  });
}

// Export functions
export {
  initializeAuth,
  checkAuthentication,
  userExists,
  createUser,
  authenticateUser,
  changePassword,
  logoutUser
}; 