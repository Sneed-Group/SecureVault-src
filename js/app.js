// Import necessary modules
import { setEncryptionKey, getEncryptionKey } from './database.js';
import { initializeUI, toggleTheme, showNotification } from './ui.js';
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
  theme: 'light',
  editorFontSize: 'medium'
};

// Change the 'accept' attribute to allow only .vault files (HACK)
document.addEventListener("DOMContentLoaded", function() {
  // Get the file input element by ID
  var fileInput = document.getElementById("import-file-input");

  // Change the 'accept' attribute to allow only .vault files
  if (fileInput) {
      fileInput.accept = ".vault";
  }
});


/**
 * Initialize the application
 */
export function initializeApp() {
  console.log('Initializing app...');
  
  // Load preferences first
  loadPreferences();
  
  // Initialize authentication first
  initializeAuth();
  
  // Listen for authentication events
  window.addEventListener(AUTH_EVENTS.LOGIN, handleLogin);
  window.addEventListener(AUTH_EVENTS.LOGOUT, handleLogout);
  
  // Setup autosave feature
  setupAutosave();
  
  // Setup the rest of the application UI
  setupNavigationHandlers();
  setupSettingsHandlers();
  
  console.log('App initialization setup complete');
}

/**
 * Handle successful login
 */
function handleLogin(event) {
  console.log('Login event detected, initializing app components...');
  
  // Get the encryption key from the event detail if available
  if (event.detail && event.detail.key) {
    setEncryptionKey(event.detail.key);
  }
  
  // Initialize app components
  initializeAppComponents();
  
  // Show success message
  showNotification('Vault unlocked successfully', 'success');
}

/**
 * Handle logout
 */
function handleLogout() {
  console.log('Logout event detected, shutting down app components...');
  
  // Clear encryption key
  setEncryptionKey(null);
  
  // Show auth screen - handled in auth.js
  showNotification('You have been logged out', 'info');
}

/**
 * Initialize all application components
 */
function initializeAppComponents() {
  // Only initialize if we have a valid encryption key
  if (!getEncryptionKey()) {
    console.warn('Attempted to initialize components without encryption key');
    return;
  }
  
  console.log('Initializing UI components...');
  
  // Update app state
  appState.isAuthenticated = true;
  
  // Initialize UI
  initializeUI(appState);
  
  // Initialize content modules
  initializeEditor(appState);
  initializeFileManager(appState);
  initializePhotoManager(appState);
  
  // Show the first tab as active (docs)
  const defaultTab = document.querySelector('.nav-tabs li[data-section="docs"]');
  if (defaultTab) {
    defaultTab.click();
  }
  
  console.log('App initialization complete');
}

/**
 * Setup autosave functionality
 */
function setupAutosave() {
  // Setup periodic save of vault file (every 5 minutes)
  setInterval(() => {
    if (appState.isAuthenticated && document.visibilityState === 'visible') {
      console.log('Running autosave...');
      
      // Emit save event that components can listen for
      const saveEvent = new CustomEvent('vault:autosave');
      window.dispatchEvent(saveEvent);
    }
  }, 5 * 60 * 1000); // 5 minutes
  
  // Also save when user leaves the page
  window.addEventListener('beforeunload', () => {
    if (appState.isAuthenticated) {
      const saveEvent = new CustomEvent('vault:autosave');
      window.dispatchEvent(saveEvent);
    }
  });
}

/**
 * Setup navigation handlers
 */
function setupNavigationHandlers() {
  // Get navigation tabs
  const navTabs = document.querySelectorAll('.nav-tabs li');
  const contentSections = document.querySelectorAll('.content-section');
  
  // Add click event listeners to tabs
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Get the tab ID
      const tabId = tab.getAttribute('data-section');
      
      // Update active tab
      navTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Update active section
      contentSections.forEach(section => {
        if (section.id === tabId + '-section') {
          section.classList.add('active');
        } else {
          section.classList.remove('active');
        }
      });
      
      // Update app state
      appState.currentSection = tabId;
    });
  });
}

/**
 * Setup settings handlers
 */
function setupSettingsHandlers() {
  // Theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      // Toggle theme
      appState.theme = appState.theme === 'light' ? 'dark' : 'light';
      
      // Update UI
      toggleTheme(appState.theme);
      
      // Save preference
      localStorage.setItem('mdvault_theme', appState.theme);
    });
  }
  
  // Font size settings
  const fontSizeOptions = document.querySelectorAll('.font-size-option');
  if (fontSizeOptions) {
    fontSizeOptions.forEach(option => {
      option.addEventListener('click', () => {
        // Get the font size
        const fontSize = option.getAttribute('data-size');
        
        // Update app state
        appState.editorFontSize = fontSize;
        
        // Update UI
        updateEditorFontSize(fontSize);
        
        // Update active option
        fontSizeOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        
        // Save preference
        localStorage.setItem('mdvault_font_size', fontSize);
      });
    });
  }
}

// Load user preferences
function loadPreferences() {
  try {
    // Load theme
    const savedTheme = localStorage.getItem('mdvault_theme');
    if (savedTheme) {
      appState.theme = savedTheme;
    }
    
    // Apply theme
    toggleTheme(appState.theme);
    
    // Load font size
    const savedFontSize = localStorage.getItem('mdvault_font_size');
    if (savedFontSize) {
      appState.editorFontSize = savedFontSize;
      updateEditorFontSize(savedFontSize);
    }
    
    console.log('Preferences loaded:', { theme: appState.theme, fontSize: appState.editorFontSize });
  } catch (error) {
    console.error('Error loading preferences:', error);
  }
}

// Update editor font size
function updateEditorFontSize(size) {
  const editor = document.getElementById('markdown-editor');
  if (editor) {
    // Remove existing size classes
    editor.classList.remove('font-small', 'font-medium', 'font-large');
    
    // Add new size class
    editor.classList.add(`font-${size}`);
  }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

// Export app module
export default {
  initializeApp
};

// Export the app state
export { appState }; 