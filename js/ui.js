// Import modules
import { exportDatabase } from './database.js';
import { logoutUser } from './auth.js';

// Initialize UI
function initializeUI(appState) {
  // Initialize tab navigation
  initializeTabs(appState);
  
  // Initialize settings
  initializeSettings(appState);
  
  // Initialize modal functionality
  initializeModals();
  
  // Listen for authentication events
  window.addEventListener('auth:login', () => {
    console.log('User authenticated, initializing app components');
  });
  
  console.log('UI initialized');
}

// Initialize tabs
function initializeTabs(appState) {
  const tabItems = document.querySelectorAll('.nav-tabs li');
  const contentSections = document.querySelectorAll('.content-section');
  
  tabItems.forEach(tab => {
    tab.addEventListener('click', () => {
      // Get section name from data attribute
      const sectionName = tab.getAttribute('data-section');
      
      // Set active tab
      tabItems.forEach(item => item.classList.remove('active'));
      tab.classList.add('active');
      
      // Set active content section
      contentSections.forEach(section => section.classList.remove('active'));
      document.getElementById(`${sectionName}-section`).classList.add('active');
      
      // Update app state
      appState.currentSection = sectionName;
    });
  });
}

// Initialize settings
function initializeSettings(appState) {
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const exportDbBtn = document.getElementById('export-db-btn');
  const themeSelect = document.getElementById('theme-select');
  const fontSizeSelect = document.getElementById('font-size');
  
  // Settings button click
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      settingsModal.classList.add('active');
    });
  }
  
  // Export database button
  if (exportDbBtn) {
    exportDbBtn.addEventListener('click', async () => {
      try {
        await exportDatabase();
      } catch (error) {
        console.error('Failed to export database:', error);
        alert('Failed to export database: ' + error.message);
      }
    });
  }
  
  // Load saved preferences
  if (themeSelect) {
    themeSelect.value = appState.theme || 'light';
  }
  
  if (fontSizeSelect) {
    fontSizeSelect.value = appState.editorFontSize || 'medium';
  }
}

// Initialize modals
function initializeModals() {
  const modals = document.querySelectorAll('.modal');
  const closeButtons = document.querySelectorAll('.close-modal');
  
  // Close when clicking the X button
  closeButtons.forEach(button => {
    button.addEventListener('click', () => {
      const modal = button.closest('.modal');
      modal.classList.remove('active');
    });
  });
  
  // Close when clicking outside the modal content
  modals.forEach(modal => {
    modal.addEventListener('click', event => {
      if (event.target === modal) {
        modal.classList.remove('active');
      }
    });
  });
  
  // Close with Escape key
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      modals.forEach(modal => {
        if (modal.classList.contains('active')) {
          modal.classList.remove('active');
        }
      });
    }
  });
}

// Toggle dark/light theme
function toggleTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
  } else if (theme === 'light') {
    document.body.classList.remove('dark-theme');
  } else if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }
}

// Show a notification
function showNotification(message, type = 'info', duration = 3000) {
  // Create notification element if it doesn't exist
  let notification = document.querySelector('.notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.className = 'notification';
    document.body.appendChild(notification);
  }
  
  // Set message and type
  notification.textContent = message;
  notification.className = `notification ${type}`;
  
  // Show notification
  notification.classList.add('show');
  
  // Hide after duration
  setTimeout(() => {
    notification.classList.remove('show');
  }, duration);
}

// Create a file list item
function createFileListItem(file, onSelect, onDelete) {
  const item = document.createElement('div');
  item.className = 'file-item';
  item.dataset.id = file.id;
  
  // Create icon based on file type
  const icon = document.createElement('span');
  icon.className = 'file-icon';
  
  if (file.type === 'markdown') {
    icon.textContent = '📝';
  } else if (file.type === 'image') {
    icon.textContent = '🖼️';
  } else {
    icon.textContent = '📄';
  }
  
  // Create file name
  const name = document.createElement('span');
  name.className = 'file-name';
  name.textContent = file.name;
  
  // Create actions
  const actions = document.createElement('div');
  actions.className = 'file-actions';
  
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'file-action-btn';
  deleteBtn.textContent = '🗑️';
  deleteBtn.title = 'Delete';
  deleteBtn.addEventListener('click', e => {
    e.stopPropagation();
    onDelete(file);
  });
  
  actions.appendChild(deleteBtn);
  
  // Add elements to item
  item.appendChild(icon);
  item.appendChild(name);
  item.appendChild(actions);
  
  // Add click event
  item.addEventListener('click', () => {
    // Remove active class from all items
    const items = document.querySelectorAll('.file-item');
    items.forEach(i => i.classList.remove('active'));
    
    // Add active class to this item
    item.classList.add('active');
    
    // Call select callback
    onSelect(file);
  });
  
  return item;
}

// Refresh the file list
function refreshFileList(files, container, onSelect, onDelete) {
  // Clear the container
  container.innerHTML = '';
  
  // Add files to the container
  Object.values(files).forEach(file => {
    const item = createFileListItem(file, onSelect, onDelete);
    container.appendChild(item);
  });
}

// Export functions
export {
  initializeUI,
  toggleTheme,
  showNotification,
  createFileListItem,
  refreshFileList
}; 