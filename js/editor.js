// Import dependencies
import { marked } from 'marked';
import { saveDatabase, encryptData, getEncryptionKey, saveToSecureStorage } from './database.js';
import { showNotification, refreshFileList } from './ui.js';
import hljs from 'highlight.js';

// Current editor state
let currentFile = null;
let isEditorDirty = false;
let db = null;

/**
 * Initialize the editor component
 * @param {Object} appState - Application state
 */
export function initializeEditor(appState) {
  console.log('Initializing editor...');
  
  // Get DOM elements
  const editor = document.getElementById('markdown-editor');
  const preview = document.getElementById('preview');
  const saveButton = document.getElementById('save-doc-btn');
  const createNewButton = document.getElementById('create-new-btn');
  const fileList = document.getElementById('file-list');
  const editModeBtn = document.getElementById('edit-mode-btn');
  const splitModeBtn = document.getElementById('split-mode-btn');
  const previewModeBtn = document.getElementById('preview-mode-btn');
  const editorContainer = document.querySelector('.editor-container');
  const formatTools = document.querySelectorAll('.tool-btn');
  
  // Configure marked for syntax highlighting
  marked.setOptions({
    highlight: function(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    },
    gfm: true,
    breaks: true,
    sanitize: false
  });
  
  // Try to load existing data from localStorage
  try {
    const savedData = localStorage.getItem('markdown_vault_data');
    if (savedData) {
      db = JSON.parse(savedData);
      console.log('Loaded data from localStorage');
    }
  } catch (error) {
    console.error('Error loading data from localStorage:', error);
  }
  
  // Initialize the database structure if needed
  if (!db) {
    db = {};
  }
  
  // Initialize documents section if needed
  if (!db.docs) {
    db.docs = {};
  }
  
  // Update the file list
  refreshFileList(db.docs, fileList, selectFile, confirmDeleteFile);
  
  // View mode buttons
  if (editModeBtn) {
    editModeBtn.addEventListener('click', () => {
      editorContainer.classList.remove('split-mode', 'preview-mode');
      
      // Update active button state
      document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
      editModeBtn.classList.add('active');
    });
  }
  
  if (splitModeBtn) {
    splitModeBtn.addEventListener('click', () => {
      editorContainer.classList.remove('preview-mode');
      editorContainer.classList.add('split-mode');
      
      // Update active button state
      document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
      splitModeBtn.classList.add('active');
      
      // Update preview
      updatePreview();
    });
  }
  
  if (previewModeBtn) {
    previewModeBtn.addEventListener('click', () => {
      editorContainer.classList.remove('split-mode');
      editorContainer.classList.add('preview-mode');
      
      // Update active button state
      document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
      previewModeBtn.classList.add('active');
      
      // Update preview
      updatePreview();
    });
  }
  
  // Format tools
  formatTools.forEach(tool => {
    tool.addEventListener('click', () => {
      const format = tool.getAttribute('data-format');
      applyFormat(format);
    });
  });
  
  // Editor input event for real-time preview
  if (editor) {
    editor.addEventListener('input', () => {
      // Mark as dirty (unsaved changes)
      isEditorDirty = true;
      
      // Update preview in split or preview mode
      if (editorContainer.classList.contains('split-mode') || 
          editorContainer.classList.contains('preview-mode')) {
        updatePreview();
      }
    });
    
    // Handle keyboard shortcuts
    editor.addEventListener('keydown', event => {
      // Save (Ctrl+S)
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        saveCurrentFile();
      }
      
      // Bold (Ctrl+B)
      if (event.ctrlKey && event.key === 'b') {
        event.preventDefault();
        applyFormat('bold');
      }
      
      // Italic (Ctrl+I)
      if (event.ctrlKey && event.key === 'i') {
        event.preventDefault();
        applyFormat('italic');
      }
    });
  }
  
  // Save button
  if (saveButton) {
    saveButton.addEventListener('click', () => {
      console.log('Save button clicked');
      saveCurrentFile();
    });
  }
  
  // Create new button
  if (createNewButton) {
    createNewButton.addEventListener('click', createNewDocument);
  }
  
  // Window unload event - warn if unsaved changes
  window.addEventListener('beforeunload', event => {
    if (isEditorDirty) {
      const message = 'You have unsaved changes. Are you sure you want to leave?';
      event.returnValue = message;
      return message;
    }
  });
  
  console.log('Editor initialized');
}

// Update the preview panel with rendered Markdown
function updatePreview() {
  const editor = document.getElementById('markdown-editor');
  const preview = document.getElementById('preview');
  
  if (!editor || !preview) {
    console.error('Editor or preview element not found');
    return;
  }
  
  try {
    const markdown = editor.value;
    const html = marked.parse(markdown);
    preview.innerHTML = html;
    console.log('Preview updated');
  } catch (error) {
    console.error('Error updating preview:', error);
    preview.innerHTML = '<div class="error">Error rendering preview</div>';
  }
}

// Apply formatting to the editor text
function applyFormat(format) {
  const editor = document.getElementById('markdown-editor');
  if (!editor) return;
  
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const selectedText = editor.value.substring(start, end);
  let replacement = '';
  
  switch (format) {
    case 'bold':
      replacement = `**${selectedText}**`;
      break;
    case 'italic':
      replacement = `*${selectedText}*`;
      break;
    case 'heading':
      replacement = `\n# ${selectedText}`;
      break;
    case 'link':
      replacement = `[${selectedText}](url)`;
      break;
    case 'list':
      replacement = selectedText.split('\n').map(line => `- ${line}`).join('\n');
      break;
    case 'code':
      if (selectedText.includes('\n')) {
        replacement = '```\n' + selectedText + '\n```';
      } else {
        replacement = '`' + selectedText + '`';
      }
      break;
    default:
      replacement = selectedText;
  }
  
  // Insert the replacement
  editor.focus();
  document.execCommand('insertText', false, replacement);
  
  // Mark as dirty
  isEditorDirty = true;
}

/**
 * Save the current file
 */
async function saveCurrentFile() {
  if (!currentFile) {
    console.error('No file selected');
    showNotification('No file selected to save', 'error');
    return false;
  }
  
  if (!db || !db.docs) {
    console.error('Database not initialized');
    showNotification('Error: Database not initialized', 'error');
    return false;
  }
  
  try {
    const editor = document.getElementById('markdown-editor');
    if (!editor) return false;
    
    const content = editor.value;
    
    // Update the document in the database
    currentFile.content = content;
    currentFile.modified = new Date().toISOString();
    db.docs[currentFile.id] = currentFile;
    
    // Save to secure storage if encryption key is available
    const encryptionKey = getEncryptionKey();
    if (encryptionKey) {
      // Use saveToSecureStorage to properly save to the secure database
      await saveToSecureStorage(db);
      console.log('Saved to secure database');
    }
    
    // Save to localStorage (temporary solution until we implement proper saving)
    try {
      localStorage.setItem('markdown_vault_data', JSON.stringify(db));
      console.log('Saved to localStorage');
    } catch (localStorageError) {
      console.error('Failed to save to localStorage:', localStorageError);
      // Continue anyway as we've already saved to secure database
    }
    
    // Reset dirty flag
    isEditorDirty = false;
    
    // Update UI
    document.getElementById('save-btn').classList.remove('dirty');
    
    showNotification('Document saved', 'success');
    
    return true;
  } catch (error) {
    console.error('Failed to save document:', error);
    showNotification('Failed to save document: ' + error.message, 'error');
    return false;
  }
}

/**
 * Create a new document
 */
function createNewDocument() {
  // Check if there are unsaved changes
  if (isEditorDirty) {
    const confirmLeave = confirm('You have unsaved changes. Do you want to discard them?');
    if (!confirmLeave) {
      return false;
    }
  }
  
  // Clear the editor
  const editor = document.getElementById('markdown-editor');
  const preview = document.getElementById('preview');
  
  if (editor) {
    editor.value = '';
  }
  
  if (preview) {
    preview.innerHTML = '';
  }
  
  // Prompt for document name
  const name = prompt('Enter a name for your new document:');
  if (!name) {
    return false; // User cancelled
  }
  
  // Create a new document object
  const newDoc = {
    id: generateId(),
    name: name,
    type: 'markdown',
    content: '',
    created: new Date().toISOString(),
    modified: new Date().toISOString()
  };
  
  // Set as current file
  currentFile = newDoc;
  
  // Save to database
  if (!db) {
    db = {};
  }
  
  if (!db.docs) {
    db.docs = {};
  }
  
  db.docs[newDoc.id] = newDoc;
  
  // Save to secure storage if encryption key is available
  const encryptionKey = getEncryptionKey();
  if (encryptionKey) {
    // Use saveToSecureStorage to properly save to the secure database
    saveToSecureStorage(db);
    console.log('New document saved to secure database');
  }
  
  // Save to localStorage
  try {
    localStorage.setItem('markdown_vault_data', JSON.stringify(db));
    console.log('New document saved to localStorage');
  } catch (error) {
    console.error('Failed to save new document to localStorage:', error);
    // Continue anyway as we've already saved to secure database
  }
  
  // Update the UI
  document.getElementById('file-title').textContent = name;
  
  // Update file list
  refreshFileList();
  
  showNotification('New document created', 'success');
  
  return true;
}

// Select a file to edit
function selectFile(file) {
  console.log('Selecting file:', file);
  // Check for unsaved changes
  if (isEditorDirty) {
    if (!confirm('You have unsaved changes. Open another document anyway?')) {
      return;
    }
  }
  
  // Set current file
  currentFile = file;
  
  // Load content into editor
  const editor = document.getElementById('markdown-editor');
  if (editor) {
    editor.value = file.content || '';
  }
  
  // Update preview
  updatePreview();
  
  // Clear dirty flag
  isEditorDirty = false;
  
  // Update active file in list
  document.querySelectorAll('.file-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-id') === file.id) {
      item.classList.add('active');
    }
  });
  
  console.log('File selected:', file.name);
}

// Confirm file deletion
function confirmDeleteFile(file) {
  console.log('Confirming file deletion:', file);
  if (confirm(`Are you sure you want to delete "${file.name}"? This action cannot be undone.`)) {
    deleteFile(file);
  }
}

/**
 * Delete the current file
 */
async function deleteFile(file) {
  if (!file || !file.id) {
    console.error('Invalid file to delete');
    showNotification('Error: Invalid file to delete', 'error');
    return false;
  }
  
  try {
    // Remove from database
    delete db.docs[file.id];
    
    // Save to secure storage if encryption key is available
    const encryptionKey = getEncryptionKey();
    if (encryptionKey) {
      // Use saveToSecureStorage to properly save to the secure database
      await saveToSecureStorage(db);
      console.log('Database saved to secure storage after deletion');
    }
    
    // Save to localStorage
    try {
      localStorage.setItem('markdown_vault_data', JSON.stringify(db));
      console.log('Database saved to localStorage after deletion');
    } catch (localStorageError) {
      console.error('Failed to save to localStorage after deletion:', localStorageError);
      // Continue anyway as we've already saved to secure database
    }
    
    // Clear editor if this was the current file
    if (currentFile && currentFile.id === file.id) {
      currentFile = null;
      document.getElementById('markdown-editor').value = '';
      document.getElementById('preview').innerHTML = '';
      document.getElementById('file-title').textContent = 'No file selected';
    }
    
    // Update file list
    refreshFileList();
    
    showNotification('Document deleted', 'success');
    
    return true;
  } catch (error) {
    console.error('Failed to delete document:', error);
    showNotification('Failed to delete document: ' + error.message, 'error');
    return false;
  }
}

// Generate a unique ID for a file
function generateId() {
  return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Export the editor module
export default {
  initializeEditor
}; 