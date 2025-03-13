// Import dependencies
import { showNotification } from './ui.js';
import { 
  saveToSecureStorage,
  loadFromSecureStorage,
  getEncryptionKey
} from './database.js';

// Current state
let db = { files: {} };
let pendingChanges = false;

// Initialize file manager
export function initializeFileManager(appState) {
  console.log('Initializing file manager...');
  
  // Get DOM elements
  const uploadFileBtn = document.getElementById('upload-file-btn');
  const fileUploadInput = document.getElementById('file-upload');
  const filesContainer = document.getElementById('files-container');
  const sortFilesSelect = document.getElementById('sort-files');
  
  // Check if we have an encryption key
  const encryptionKey = getEncryptionKey();
  if (!encryptionKey) {
    console.error('No encryption key available, file manager initialization deferred');
    return;
  }
  
  // Load data from secure storage
  loadFromSecureStorage()
    .then(data => {
      if (data) {
        // Initialize db with the loaded data
        db = data;
        if (!db.files) {
          db.files = {};
        }
        console.log('Loaded files from secure storage');
        
        // Render files list
        renderFilesList(db.files);
      } else {
        console.log('No data found in secure storage, initializing empty file store');
        db = { files: {} };
        renderFilesList(db.files);
      }
    })
    .catch(error => {
      console.error('Error loading data from secure storage:', error);
      // Initialize with empty database if loading fails
      db = { files: {} };
      renderFilesList(db.files);
    });
  
  // Upload button click
  if (uploadFileBtn) {
    uploadFileBtn.addEventListener('click', () => {
      if (fileUploadInput) {
        fileUploadInput.click();
      }
    });
  }
  
  // File input change
  if (fileUploadInput) {
    fileUploadInput.addEventListener('change', async (event) => {
      const files = event.target.files;
      
      if (files.length > 0) {
        try {
          await uploadFiles(files);
          fileUploadInput.value = ''; // Clear the input
        } catch (error) {
          console.error('Failed to upload files:', error);
          showNotification('Failed to upload files: ' + error.message, 'error');
        }
      }
    });
  }
  
  // Sort select change
  if (sortFilesSelect) {
    sortFilesSelect.addEventListener('change', () => {
      const sortBy = sortFilesSelect.value;
      renderFilesList(db.files, sortBy);
    });
  }
  
  // Listen for autosave events
  window.addEventListener('vault:autosave', async () => {
    console.log('Autosave triggered for file manager');
    if (pendingChanges) {
      try {
        const saveResult = await saveToSecureStorage(db);
        
        if (saveResult) {
          console.log('Files autosaved successfully');
          pendingChanges = false;
        } else {
          console.error('Failed to autosave files');
        }
      } catch (error) {
        console.error('Error during file autosave:', error);
      }
    }
  });
  
  console.log('File manager initialized');
}

// Upload files
async function uploadFiles(fileList) {
  // Check for encryption key
  const encryptionKey = getEncryptionKey();
  if (!encryptionKey) {
    showNotification('Cannot upload files - you must be logged in', 'error');
    return false;
  }
  
  const promises = [];
  
  // Process each file
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    promises.push(processFile(file));
  }
  
  // Wait for all files to be processed
  const results = await Promise.all(promises);
  const successCount = results.filter(result => result).length;
  
  // Save to secure storage (without downloading the file)
  try {
    const saveResult = await saveToSecureStorage(db, false);
    
    if (!saveResult) {
      throw new Error('Failed to save to secure storage');
    }
    
    console.log('Files saved to secure storage');
    pendingChanges = false;
  } catch (error) {
    console.error('Failed to save files:', error);
    showNotification('Error saving files. Please try again.', 'error');
    return false;
  }
  
  // Render the updated file list
  renderFilesList(db.files);
  
  // Show notification
  showNotification(`Uploaded ${successCount} of ${fileList.length} files`, 'success');
  
  return successCount === fileList.length;
}

// Process a single file
async function processFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        // Get the content as a data URL
        const content = e.target.result;
        
        // Create a file object
        const fileObj = {
          id: generateId(),
          name: file.name,
          type: 'file',
          size: file.size,
          contentType: file.type,
          content: content,  // This will be base64 encoded
          created: new Date().toISOString(),
          modified: new Date().toISOString()
        };
        
        console.log(`Processing file: ${file.name}, size: ${formatFileSize(file.size)}, type: ${file.type}`);
        
        // Add to database
        db.files[fileObj.id] = fileObj;
        pendingChanges = true;
        
        resolve(true);
      } catch (error) {
        console.error('Failed to process file:', error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      console.error('Error reading file:', error);
      reject(error);
    };
    
    // Read the file as a data URL (base64 encoded)
    reader.readAsDataURL(file);
  });
}

// Render the files list
function renderFilesList(files, sortBy = 'name') {
  const filesContainer = document.getElementById('files-container');
  if (!filesContainer) return;
  
  // Clear the container
  filesContainer.innerHTML = '';
  
  // Sort files
  const filesList = Object.values(files);
  
  switch (sortBy) {
    case 'name':
      filesList.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'date':
      filesList.sort((a, b) => new Date(b.modified) - new Date(a.modified));
      break;
    case 'size':
      filesList.sort((a, b) => b.size - a.size);
      break;
    case 'type':
      filesList.sort((a, b) => a.contentType.localeCompare(b.contentType));
      break;
  }
  
  // Add files to the container
  filesList.forEach(file => {
    const fileElement = createFileElement(file);
    filesContainer.appendChild(fileElement);
  });
  
  // Show empty state if no files
  if (filesList.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <p>No files uploaded yet.</p>
      <p>Click "Upload Files" to add some.</p>
    `;
    filesContainer.appendChild(emptyState);
  }
}

// Create a file element
function createFileElement(file) {
  const fileRow = document.createElement('div');
  fileRow.className = 'file-row';
  fileRow.dataset.id = file.id;
  
  // File type icon
  const iconType = getFileTypeIcon(file.contentType);
  
  fileRow.innerHTML = `
    <div class="file-type-icon">${iconType}</div>
    <div class="file-details">
      <div class="file-title">${file.name}</div>
      <div class="file-metadata">
        <span class="file-size">${formatFileSize(file.size)}</span>
        <span class="file-date">${formatDate(file.modified)}</span>
        <span class="file-type">${formatFileType(file.contentType)}</span>
      </div>
    </div>
    <div class="file-actions">
      <button class="file-action-btn download-btn" title="Download">📥</button>
      <button class="file-action-btn delete-btn" title="Delete">🗑️</button>
    </div>
  `;
  
  // Add event listeners
  const downloadBtn = fileRow.querySelector('.download-btn');
  const deleteBtn = fileRow.querySelector('.delete-btn');
  
  // Download button click
  downloadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    downloadFile(file);
  });
  
  // Delete button click
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    confirmDeleteFile(file);
  });
  
  // Row click for file preview
  fileRow.addEventListener('click', () => {
    previewFile(file);
  });
  
  return fileRow;
}

// Get file type icon
function getFileTypeIcon(contentType) {
  if (contentType.startsWith('image/')) {
    return '🖼️';
  } else if (contentType.startsWith('video/')) {
    return '🎬';
  } else if (contentType.startsWith('audio/')) {
    return '🎵';
  } else if (contentType.includes('pdf')) {
    return '📄';
  } else if (contentType.includes('word') || contentType.includes('document')) {
    return '📝';
  } else if (contentType.includes('excel') || contentType.includes('spreadsheet')) {
    return '📊';
  } else if (contentType.includes('powerpoint') || contentType.includes('presentation')) {
    return '📑';
  } else if (contentType.includes('zip') || contentType.includes('compressed')) {
    return '📦';
  } else if (contentType.includes('text/')) {
    return '📄';
  } else {
    return '📁';
  }
}

// Format file size
function formatFileSize(size) {
  if (size < 1024) {
    return size + ' B';
  } else if (size < 1024 * 1024) {
    return (size / 1024).toFixed(1) + ' KB';
  } else if (size < 1024 * 1024 * 1024) {
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
  } else {
    return (size / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

// Format file type
function formatFileType(contentType) {
  if (!contentType) return 'Unknown';
  
  // Extract the main part (e.g., "image/jpeg" -> "jpeg")
  const parts = contentType.split('/');
  if (parts.length > 1) {
    return parts[1].toUpperCase();
  }
  
  return contentType;
}

// Download file
function downloadFile(file) {
  // Create a temporary anchor element
  const a = document.createElement('a');
  a.href = file.content;
  a.download = file.name;
  a.style.display = 'none';
  
  // Add to body, click, and remove
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  showNotification(`Downloading ${file.name}`, 'info');
}

// Confirm and delete file
function confirmDeleteFile(file) {
  if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
    deleteFile(file);
  }
}

// Delete file
async function deleteFile(file) {
  // Check for encryption key
  const encryptionKey = getEncryptionKey();
  if (!encryptionKey) {
    showNotification('Cannot delete file - you must be logged in', 'error');
    return false;
  }
  
  try {
    // Remove from database
    delete db.files[file.id];
    pendingChanges = true;
    
    // Save to secure storage
    const saveResult = await saveToSecureStorage(db);
    
    if (!saveResult) {
      throw new Error('Failed to save changes to secure storage');
    }
    
    // Update file list
    renderFilesList(db.files);
    
    // Show notification
    showNotification('File deleted successfully', 'success');
    
    pendingChanges = false;
    return true;
  } catch (error) {
    console.error('Failed to delete file:', error);
    showNotification('Failed to delete file: ' + error.message, 'error');
    return false;
  }
}

// Preview file
function previewFile(file) {
  // Create a modal for file preview
  const modal = document.createElement('div');
  modal.className = 'modal active';
  
  let previewContent = '';
  
  // Generate preview based on file type
  if (file.contentType.startsWith('image/')) {
    previewContent = `<img src="${file.content}" alt="${file.name}" style="max-width: 100%; max-height: 80vh;">`;
  } else if (file.contentType.startsWith('video/')) {
    previewContent = `
      <video controls style="max-width: 100%; max-height: 80vh;">
        <source src="${file.content}" type="${file.contentType}">
        Your browser does not support the video tag.
      </video>
    `;
  } else if (file.contentType.startsWith('audio/')) {
    previewContent = `
      <audio controls style="width: 100%;">
        <source src="${file.content}" type="${file.contentType}">
        Your browser does not support the audio tag.
      </audio>
    `;
  } else if (file.contentType.includes('pdf')) {
    previewContent = `
      <iframe src="${file.content}" style="width: 100%; height: 80vh; border: none;"></iframe>
    `;
  } else {
    previewContent = `
      <div style="text-align: center; padding: 2rem;">
        <p>Preview not available for this file type.</p>
        <button id="preview-download-btn" class="btn primary">Download File</button>
      </div>
    `;
  }
  
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 90%; width: auto;">
      <div class="modal-header">
        <h2>${file.name}</h2>
        <button class="close-modal">&times;</button>
      </div>
      <div class="modal-body">
        ${previewContent}
      </div>
    </div>
  `;
  
  // Add to body
  document.body.appendChild(modal);
  
  // Close button click
  const closeButton = modal.querySelector('.close-modal');
  closeButton.addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  // Click outside to close
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      document.body.removeChild(modal);
    }
  });
  
  // Download button click (for non-previewable files)
  const downloadBtn = modal.querySelector('#preview-download-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      downloadFile(file);
    });
  }
}

// Generate a unique ID
function generateId() {
  return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Export the file manager module
export default {
  initializeFileManager
}; 