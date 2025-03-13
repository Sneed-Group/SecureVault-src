// Import necessary modules
import marked from 'marked';
import { saveToSecureStorage, loadFromSecureStorage, getEncryptionKey } from './database.js';
import { showNotification, refreshFileList } from './ui.js';
import hljs from 'highlight.js';

// Initialize marked with syntax highlighting
marked.setOptions({
  highlight: function(code, language) {
    if (language && hljs.getLanguage(language)) {
      return hljs.highlight(code, { language }).value;
    }
    return hljs.highlightAuto(code).value;
  }
});

// Module state
let currentFile = null;
let editorContent = null;
let fileList = [];

// DOM elements
let editor = null;
let preview = null;
let fileNameInput = null;

/**
 * Initialize the editor component
 */
export function initializeEditor() {
  console.log('Initializing editor...');
  
  // Get DOM elements
  editor = document.getElementById('markdown-editor');
  preview = document.getElementById('markdown-preview');
  fileNameInput = document.getElementById('file-name-input');
  
  // Check if we have an encryption key
  const encryptionKey = getEncryptionKey();
  if (!encryptionKey) {
    console.log('No encryption key available, editor initialization deferred');
    return;
  }
  
  // Load files from secure storage
  loadFromSecureStorage()
    .then(data => {
      if (data && data.files) {
        fileList = data.files || [];
        console.log(`Loaded ${fileList.length} files from secure storage`);
      } else {
        fileList = [];
        console.log('No files found in secure storage');
      }
      
      // Set up event listeners for the editor
      setupEventListeners();
    })
    .catch(error => {
      console.error('Error loading files from secure storage:', error);
      fileList = [];
      setupEventListeners();
    });
}

/**
 * Set up event listeners for the editor
 */
function setupEventListeners() {
  if (!editor) return;
  
  // Set up real-time preview
  editor.addEventListener('input', () => {
    const markdown = editor.value;
    preview.innerHTML = marked.parse(markdown);
    // Auto-save current file on change
    if (currentFile) {
      saveCurrentFile();
    }
  });
  
  // Set up file name input
  fileNameInput.addEventListener('blur', () => {
    if (currentFile) {
      const oldName = currentFile.name;
      const newName = fileNameInput.value.trim() || oldName;
      
      // Update the file name if changed
      if (oldName !== newName) {
        currentFile.name = newName;
        saveCurrentFile();
      }
    }
  });
  
  console.log('Editor event listeners set up');
}

/**
 * Save the current file to secure storage
 */
export function saveCurrentFile() {
  if (!currentFile) return;
  
  // Get encryption key
  const encryptionKey = getEncryptionKey();
  if (!encryptionKey) {
    showNotification('Cannot save file - you must be logged in', 'error');
    return;
  }
  
  // Update content
  currentFile.content = editor.value;
  currentFile.lastModified = new Date().toISOString();
  
  // Update file in list
  const fileIndex = fileList.findIndex(file => file.id === currentFile.id);
  if (fileIndex >= 0) {
    fileList[fileIndex] = currentFile;
  } else {
    fileList.push(currentFile);
  }
  
  // Save to secure storage
  saveToSecureStorage('files', fileList)
    .then(() => {
      console.log(`File "${currentFile.name}" saved to secure storage`);
      // Refresh the file list in the UI
      refreshFileList();
    })
    .catch(error => {
      console.error('Error saving file to secure storage:', error);
      showNotification('Error saving file. Please try again.', 'error');
    });
}

/**
 * Load a file for editing
 * @param {Object} file - The file to load
 */
export function loadFile(file) {
  if (!file) return;
  
  currentFile = file;
  fileNameInput.value = file.name;
  editor.value = file.content || '';
  
  // Render preview
  preview.innerHTML = marked.parse(editor.value);
  
  console.log(`Loaded file "${file.name}" for editing`);
}

/**
 * Create a new document
 */
export function createNewDocument() {
  const newFile = {
    id: Date.now().toString(),
    name: 'Untitled Document',
    content: '',
    created: new Date().toISOString(),
    lastModified: new Date().toISOString()
  };
  
  // Get encryption key
  const encryptionKey = getEncryptionKey();
  if (!encryptionKey) {
    showNotification('Cannot create file - you must be logged in', 'error');
    return;
  }
  
  // Add to file list
  fileList.push(newFile);
  
  // Save to secure storage
  saveToSecureStorage('files', fileList)
    .then(() => {
      console.log('New document created and saved to secure storage');
      
      // Load the new file for editing
      loadFile(newFile);
      
      // Refresh the file list in the UI
      refreshFileList();
    })
    .catch(error => {
      console.error('Error creating new document:', error);
      showNotification('Error creating new document. Please try again.', 'error');
    });
}

/**
 * Delete the current file
 */
export function deleteCurrentFile() {
  if (!currentFile) return;
  
  // Get encryption key
  const encryptionKey = getEncryptionKey();
  if (!encryptionKey) {
    showNotification('Cannot delete file - you must be logged in', 'error');
    return;
  }
  
  // Remove from file list
  const fileIndex = fileList.findIndex(file => file.id === currentFile.id);
  if (fileIndex >= 0) {
    fileList.splice(fileIndex, 1);
    
    // Save to secure storage
    saveToSecureStorage('files', fileList)
      .then(() => {
        console.log(`File "${currentFile.name}" deleted from secure storage`);
        
        // Clear editor
        currentFile = null;
        fileNameInput.value = '';
        editor.value = '';
        preview.innerHTML = '';
        
        // Refresh the file list in the UI
        refreshFileList();
      })
      .catch(error => {
        console.error('Error deleting file:', error);
        showNotification('Error deleting file. Please try again.', 'error');
      });
  }
}

// Export module
export default {
  initializeEditor,
  loadFile,
  createNewDocument,
  deleteCurrentFile,
  saveCurrentFile
}; 