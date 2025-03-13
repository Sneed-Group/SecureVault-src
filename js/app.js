// Import necessary modules
import { initializeDatabase, closeDatabase, setEncryptionKey } from './database.js';
import { initializeUI, toggleTheme } from './ui.js';
import { initializeAuth, checkAuthentication, AUTH_EVENTS } from './auth.js';
import editorModule from './editor.js';
import fileManagerModule from './files.js';
import photoManagerModule from './photos.js';

// Extract module functions
const { initializeEditor } = editorModule;
const { initializeFileManager } = fileManagerModule;
const { initializePhotoManager } = photoManagerModule;

// Application state
const appState = {
  currentSection: 'docs',
  currentFile: null,
  isAuthenticated: false,
  dbInitialized: false,
  theme: 'light',
  editorFontSize: 'medium'
};

/**
 * Initialize the application
 */
export function initializeApp() {
  console.log('Initializing app...');
  
  // Load preferences first
  loadPreferences();
  
  // Initialize authentication first
  initializeAuth();
  
  // Check if already authenticated
  if (checkAuthentication()) {
    console.log('User is authenticated, initializing components...');
    
    // Get the session key
    const sessionKey = sessionStorage.getItem('sessionKey');
    
    // Initialize database with the key
    initializeDatabase();
    setEncryptionKey(sessionKey);
    
    // Initialize the rest of the application
    initializeAppComponents();
  }
  
  // Listen for authentication events
  window.addEventListener(AUTH_EVENTS.LOGIN, () => {
    console.log('Login event detected, initializing app components...');
    initializeAppComponents();
  });
  
  window.addEventListener(AUTH_EVENTS.LOGOUT, () => {
    console.log('Logout event detected, shutting down app components...');
    closeDatabase();
    // Show auth screen - handled in auth.js
  });
}

/**
 * Initialize all application components
 */
function initializeAppComponents() {
  // Only initialize if user is authenticated
  if (!checkAuthentication()) {
    console.warn('Attempted to initialize components without authentication');
    return;
  }
  
  console.log('Initializing UI components...');
  
  // Initialize UI
  initializeUI(appState);
  
  // Initialize content modules
  initializeEditor(appState);
  initializeFileManager(appState);
  initializePhotoManager(appState);
  
  // Show the first tab as active (docs)
  const defaultTab = document.querySelector('.nav-tabs li[data-tab="docs"]');
  if (defaultTab) {
    defaultTab.click();
  }
  
  console.log('App initialization complete');
}

// Load user preferences
function loadPreferences() {
  try {
    const savedTheme = localStorage.getItem('mdvault_theme');
    if (savedTheme) {
      appState.theme = savedTheme;
    }
    
    const savedFontSize = localStorage.getItem('mdvault_font_size');
    if (savedFontSize) {
      appState.editorFontSize = savedFontSize;
    }
  } catch (error) {
    console.error('Failed to load preferences:', error);
  }
}

// Save user preferences
function savePreferences() {
  try {
    localStorage.setItem('mdvault_theme', appState.theme);
    localStorage.setItem('mdvault_font_size', appState.editorFontSize);
  } catch (error) {
    console.error('Failed to save preferences:', error);
  }
}

// Apply theme
function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
  }
}

// Event listener for theme change
document.addEventListener('DOMContentLoaded', () => {
  const themeSelect = document.getElementById('theme-select');
  if (themeSelect) {
    themeSelect.addEventListener('change', (event) => {
      const newTheme = event.target.value;
      appState.theme = newTheme;
      applyTheme(newTheme);
      savePreferences();
    });
  }
  
  const fontSizeSelect = document.getElementById('font-size');
  if (fontSizeSelect) {
    fontSizeSelect.addEventListener('change', (event) => {
      appState.editorFontSize = event.target.value;
      document.getElementById('markdown-editor').classList.remove('small', 'medium', 'large');
      document.getElementById('markdown-editor').classList.add(appState.editorFontSize);
      savePreferences();
    });
  }
  
  // Handle save password button
  const savePasswordBtn = document.getElementById('save-password-btn');
  if (savePasswordBtn) {
    savePasswordBtn.addEventListener('click', () => {
      const currentPassword = document.getElementById('current-password').value;
      const newPassword = document.getElementById('new-password').value;
      const confirmNewPassword = document.getElementById('confirm-new-password').value;
      const passwordMessage = document.getElementById('password-message');
      
      // Validate inputs
      if (!currentPassword || !newPassword || !confirmNewPassword) {
        passwordMessage.textContent = 'Please fill in all fields';
        passwordMessage.className = 'message error';
        return;
      }
      
      if (newPassword !== confirmNewPassword) {
        passwordMessage.textContent = 'New passwords do not match';
        passwordMessage.className = 'message error';
        return;
      }
      
      // Import the changePassword function
      import('./auth.js').then(authModule => {
        const success = authModule.changePassword(currentPassword, newPassword);
        
        if (success) {
          passwordMessage.textContent = 'Password changed successfully';
          passwordMessage.className = 'message success';
          
          // Clear the form
          document.getElementById('current-password').value = '';
          document.getElementById('new-password').value = '';
          document.getElementById('confirm-new-password').value = '';
          
          // Close the modal after a delay
          setTimeout(() => {
            document.getElementById('password-modal').classList.remove('active');
            passwordMessage.textContent = '';
          }, 2000);
        } else {
          passwordMessage.textContent = 'Failed to change password. Make sure your current password is correct.';
          passwordMessage.className = 'message error';
        }
      }).catch(error => {
        console.error('Error importing auth module:', error);
        passwordMessage.textContent = 'An error occurred. Please try again.';
        passwordMessage.className = 'message error';
      });
    });
  }
});

// Clean up resources when the page is unloaded
window.addEventListener('beforeunload', () => {
  closeDatabase();
});

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Export app module
export default {
  initializeApp
};

// Export the app state
export { appState }; 