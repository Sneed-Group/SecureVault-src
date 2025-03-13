// Import necessary modules
import { initializeDatabase, closeDatabase } from './database.js';
import { initializeUI, toggleTheme } from './ui.js';
import { initializeAuth, checkAuthentication } from './auth.js';
import { initializeEditor } from './editor.js';
import { initializeFileManager } from './files.js';
import { initializePhotoManager } from './photos.js';

// Application state
const appState = {
  currentSection: 'docs',
  currentFile: null,
  isAuthenticated: false,
  dbInitialized: false,
  theme: 'light',
  editorFontSize: 'medium'
};

// Initialize the application
async function initializeApp() {
  console.log('Initializing app...');
  
  // Check if user is authenticated
  const isAuthenticated = await checkAuthentication();
  appState.isAuthenticated = isAuthenticated;
  
  // Initialize the UI
  initializeUI(appState);
  
  // Initialize authentication
  initializeAuth(appState);
  
  // If authenticated, initialize database and other components
  if (isAuthenticated) {
    await initializeAppComponents();
  }
  
  // Load user preferences
  loadPreferences();
  
  // Apply initial theme
  applyTheme(appState.theme);
}

// Initialize app components after authentication
async function initializeAppComponents() {
  try {
    // Initialize database
    await initializeDatabase();
    appState.dbInitialized = true;
    
    // Initialize editor
    initializeEditor(appState);
    
    // Initialize file manager
    initializeFileManager(appState);
    
    // Initialize photo manager
    initializePhotoManager(appState);
    
    console.log('App components initialized successfully');
  } catch (error) {
    console.error('Failed to initialize app components:', error);
  }
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
});

// Clean up resources when the page is unloaded
window.addEventListener('beforeunload', () => {
  closeDatabase();
});

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Export the app state
export { appState }; 