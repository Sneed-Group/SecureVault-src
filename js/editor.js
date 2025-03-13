// Import dependencies
import { marked } from 'marked';
import { saveDatabase } from './database.js';
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
    db = { docs: {} };
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

// Save the current file
async function saveCurrentFile() {
  console.log('Saving current file...');
  const editor = document.getElementById('markdown-editor');
  const fileList = document.getElementById('file-list');
  
  if (!editor) {
    console.error('Editor not found');
    return false;
  }
  
  if (!db) {
    console.error('Database not initialized');
    db = { docs: {} };
  }
  
  try {
    // If no current file, create a new one
    if (!currentFile) {
      console.log('Creating new file...');
      
      // Prompt for a file name
      const fileName = prompt('Enter a name for your document:', 'Untitled Document');
      if (!fileName) {
        console.log('File name not provided, aborting save');
        return false;
      }
      
      currentFile = {
        id: generateId(),
        name: fileName,
        type: 'markdown',
        content: editor.value,
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      };
      
      console.log('New file created:', currentFile);
      
      // Add to database
      if (!db.docs) {
        db.docs = {};
      }
      
      db.docs[currentFile.id] = currentFile;
    } else {
      console.log('Updating existing file:', currentFile.id);
      // Update existing file
      currentFile.content = editor.value;
      currentFile.modified = new Date().toISOString();
      
      // Update in database
      db.docs[currentFile.id] = currentFile;
    }
    
    // Save to localStorage (temporary solution until we implement proper saving)
    try {
      localStorage.setItem('markdown_vault_data', JSON.stringify(db));
      console.log('Saved to localStorage');
    } catch (localStorageError) {
      console.error('Failed to save to localStorage:', localStorageError);
    }
    
    // Clear dirty flag
    isEditorDirty = false;
    
    // Update file list
    refreshFileList(
      db.docs,
      fileList,
      selectFile,
      confirmDeleteFile
    );
    
    // Show notification
    showNotification('Document saved successfully', 'success');
    
    console.log('File saved successfully');
    return true;
  } catch (error) {
    console.error('Failed to save document:', error);
    showNotification('Failed to save document: ' + error.message, 'error');
    return false;
  }
}

// Create a new document
function createNewDocument() {
  console.log('Creating new document...');
  // Check for unsaved changes
  if (isEditorDirty) {
    if (!confirm('You have unsaved changes. Create a new document anyway?')) {
      return;
    }
  }
  
  // Clear editor
  const editor = document.getElementById('markdown-editor');
  if (editor) {
    editor.value = '';
  }
  
  // Clear current file
  currentFile = null;
  
  // Clear dirty flag
  isEditorDirty = false;
  
  // Clear active file in list
  document.querySelectorAll('.file-item').forEach(item => {
    item.classList.remove('active');
  });
  
  console.log('New document created');
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

// Delete a file
async function deleteFile(file) {
  console.log('Deleting file:', file);
  try {
    // If this is the current file, clear the editor
    if (currentFile && currentFile.id === file.id) {
      const editor = document.getElementById('markdown-editor');
      if (editor) {
        editor.value = '';
      }
      currentFile = null;
      isEditorDirty = false;
    }
    
    // Remove from database
    if (db && db.docs && db.docs[file.id]) {
      delete db.docs[file.id];
      
      // Save to localStorage
      try {
        localStorage.setItem('markdown_vault_data', JSON.stringify(db));
        console.log('Database saved to localStorage after deletion');
      } catch (localStorageError) {
        console.error('Failed to save to localStorage after deletion:', localStorageError);
      }
      
      // Update file list
      refreshFileList(
        db.docs,
        document.getElementById('file-list'),
        selectFile,
        confirmDeleteFile
      );
      
      // Show notification
      showNotification('Document deleted successfully', 'success');
      console.log('File deleted successfully');
      return true;
    } else {
      console.error('File not found in database');
      showNotification('Error: File not found', 'error');
      return false;
    }
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