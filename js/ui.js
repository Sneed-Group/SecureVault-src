// Import modules
import { exportDatabase } from './database.js';
import { logoutUser, checkAuthentication } from './auth.js';

/**
 * Initialize the UI
 */
export function initializeUI() {
  initializeTabs();
  initializeSettings();
  initializeModals();
  
  // Add notification container if it doesn't exist
  if (!document.querySelector('.notification-container')) {
    const container = document.createElement('div');
    container.className = 'notification-container';
    document.body.appendChild(container);
  }
}

/**
 * Initialize tab navigation
 */
function initializeTabs() {
  const tabs = document.querySelectorAll('.nav-tabs li');
  const contentSections = document.querySelectorAll('.content-section');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Get the data-tab attribute
      const tabId = tab.getAttribute('data-tab');
      
      // Remove active class from all tabs and content sections
      tabs.forEach(t => t.classList.remove('active'));
      contentSections.forEach(section => section.classList.remove('active'));
      
      // Add active class to current tab and content section
      tab.classList.add('active');
      document.getElementById(`${tabId}-section`).classList.add('active');
    });
  });
}

/**
 * Initialize settings
 */
function initializeSettings() {
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModal = document.getElementById('settings-modal');
  const exportDbBtn = document.getElementById('export-db-btn');
  const importDbBtn = document.getElementById('import-db-btn');
  const importFileInput = document.getElementById('import-file-input');
  const changePasswordBtn = document.getElementById('change-password-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const themeToggle = document.getElementById('theme-toggle');
  
  // Handle settings button click
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      settingsModal.classList.add('active');
    });
  }
  
  // Handle export database button click
  if (exportDbBtn) {
    exportDbBtn.addEventListener('click', async () => {
      try {
        // Check if authenticated
        if (!checkAuthentication()) {
          showNotification('You must be logged in to export', 'error');
          return;
        }
        
        const success = await exportDatabase();
        
        if (success) {
          showNotification('Vault exported successfully', 'success');
        } else {
          showNotification('Error exporting vault', 'error');
        }
      } catch (error) {
        console.error('Error exporting database:', error);
        showNotification('Error exporting vault: ' + error.message, 'error');
      }
    });
  }
  
  // Handle import database button click
  if (importDbBtn && importFileInput) {
    importDbBtn.addEventListener('click', () => {
      importFileInput.click();
    });
    
    importFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        // Show import confirmation modal
        document.getElementById('import-modal').classList.add('active');
      }
    });
  }
  
  // Handle change password button click
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', () => {
      document.getElementById('password-modal').classList.add('active');
    });
  }
  
  // Handle logout button click
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      logoutUser();
    });
  }
  
  // Handle theme toggle
  if (themeToggle) {
    themeToggle.addEventListener('change', () => {
      toggleTheme();
    });
    
    // Set initial state
    const darkMode = localStorage.getItem('darkMode') === 'true';
    themeToggle.checked = darkMode;
    if (darkMode) {
      document.body.classList.add('dark-theme');
    }
  }
}

/**
 * Initialize modals
 */
function initializeModals() {
  const modals = document.querySelectorAll('.modal');
  const closeButtons = document.querySelectorAll('.close-modal');
  
  // Close modal when close button is clicked
  closeButtons.forEach(button => {
    button.addEventListener('click', () => {
      const modal = button.closest('.modal');
      modal.classList.remove('active');
    });
  });
  
  // Close modal when clicking outside the modal content
  modals.forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });
}

/**
 * Toggle dark/light theme
 */
export function toggleTheme() {
  const body = document.body;
  body.classList.toggle('dark-theme');
  
  // Save preference to localStorage
  const isDarkMode = body.classList.contains('dark-theme');
  localStorage.setItem('darkMode', isDarkMode);
}

/**
 * Show a notification
 * @param {string} message - The notification message
 * @param {string} type - The notification type (info, success, error, warning)
 * @param {number} duration - Duration in milliseconds
 */
export function showNotification(message, type = 'info', duration = 3000) {
  const container = document.querySelector('.notification-container');
  
  if (!container) {
    console.error('Notification container not found');
    return;
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Add notification to container
  container.appendChild(notification);
  
  // Make the notification visible after a short delay (for animation)
  setTimeout(() => {
    notification.classList.add('visible');
  }, 10);
  
  // Remove the notification after the specified duration
  setTimeout(() => {
    notification.classList.remove('visible');
    
    // Remove the element after the transition
    setTimeout(() => {
      container.removeChild(notification);
    }, 300);
  }, duration);
}

/**
 * Create a file list item
 * @param {object} file - The file data
 * @returns {HTMLElement} The file list item element
 */
export function createFileListItem(file) {
  const li = document.createElement('li');
  li.className = 'file-item';
  li.setAttribute('data-id', file.id);
  
  const icon = document.createElement('span');
  icon.className = 'file-icon';
  icon.textContent = '📄';
  
  const name = document.createElement('span');
  name.className = 'file-name';
  name.textContent = file.name;
  
  const actions = document.createElement('div');
  actions.className = 'file-actions';
  
  const editBtn = document.createElement('button');
  editBtn.className = 'btn icon-btn';
  editBtn.innerHTML = '✏️';
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Handle edit action
  });
  
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn icon-btn';
  deleteBtn.innerHTML = '🗑️';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Handle delete action
  });
  
  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);
  
  li.appendChild(icon);
  li.appendChild(name);
  li.appendChild(actions);
  
  return li;
}

/**
 * Refresh the file list
 * @param {array} files - The files to display
 */
export function refreshFileList(files) {
  const fileList = document.getElementById('file-list');
  
  // Clear the list
  fileList.innerHTML = '';
  
  if (!files || files.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    
    const message = document.createElement('p');
    message.textContent = 'No files found';
    
    const createButton = document.createElement('button');
    createButton.className = 'btn primary';
    createButton.textContent = 'Create New File';
    
    emptyState.appendChild(message);
    emptyState.appendChild(createButton);
    
    fileList.appendChild(emptyState);
    return;
  }
  
  // Add files to the list
  files.forEach(file => {
    const fileItem = createFileListItem(file);
    fileList.appendChild(fileItem);
  });
}

// Export UI module
export default {
  initializeUI,
  toggleTheme,
  showNotification,
  createFileListItem,
  refreshFileList
}; 