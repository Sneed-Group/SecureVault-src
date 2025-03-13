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
      // Get the data-section attribute
      const sectionId = tab.getAttribute('data-section');
      console.log(`Tab clicked: ${sectionId}`);
      
      // Remove active class from all tabs and content sections
      tabs.forEach(t => t.classList.remove('active'));
      contentSections.forEach(section => section.classList.remove('active'));
      
      // Add active class to current tab and content section
      tab.classList.add('active');
      const targetSection = document.getElementById(`${sectionId}-section`);
      if (targetSection) {
        targetSection.classList.add('active');
      } else {
        console.error(`Section not found: ${sectionId}-section`);
      }
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
        
        // Show a notification that export is starting
        showNotification('Preparing vault export...', 'info');
        
        // First trigger an autosave to ensure all components save their latest data
        window.dispatchEvent(new CustomEvent('vault:autosave'));
        
        // Wait a moment for the autosave to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Then export the database
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
 * Refresh the file list
 * @param {Object|Array} files - The files to display (can be object or array)
 * @param {HTMLElement} fileList - The file list element
 * @param {Function} onSelect - Callback for when a file is selected
 * @param {Function} onDelete - Callback for when a file is deleted
 */
export function refreshFileList(files, fileList, onSelect, onDelete) {
  if (!fileList) {
    fileList = document.getElementById('file-list');
    if (!fileList) {
      console.error('File list element not found');
      return;
    }
  }
  
  // Clear the list
  fileList.innerHTML = '';
  
  // Convert files object to array if needed
  let filesArray = files;
  if (files && typeof files === 'object' && !Array.isArray(files)) {
    filesArray = Object.values(files);
  }
  
  // Check if there are files
  if (!filesArray || filesArray.length === 0) {
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
  
  console.log('Refreshing file list:', filesArray);
  
  // Add files to the list
  filesArray.forEach(file => {
    const fileItem = createFileListItem(file, onSelect, onDelete);
    fileList.appendChild(fileItem);
  });
}

/**
 * Create a file list item
 * @param {object} file - The file data
 * @param {Function} onSelect - Callback for when the file is selected
 * @param {Function} onDelete - Callback for when the file is deleted
 * @returns {HTMLElement} The file list item element
 */
export function createFileListItem(file, onSelect, onDelete) {
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
    if (onSelect && typeof onSelect === 'function') {
      onSelect(file);
    }
  });
  
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn icon-btn';
  deleteBtn.innerHTML = '🗑️';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (onDelete && typeof onDelete === 'function') {
      onDelete(file);
    }
  });
  
  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);
  
  li.appendChild(icon);
  li.appendChild(name);
  li.appendChild(actions);
  
  // Add click handler for the entire row
  li.addEventListener('click', () => {
    if (onSelect && typeof onSelect === 'function') {
      onSelect(file);
    }
  });
  
  return li;
}

// Export UI module
export default {
  initializeUI,
  toggleTheme,
  showNotification,
  createFileListItem,
  refreshFileList
}; 