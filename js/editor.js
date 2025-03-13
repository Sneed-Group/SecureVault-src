// Import dependencies
import { marked } from 'marked';
import { loadDatabase, saveDatabase } from './database.js';
import { showNotification, refreshFileList } from './ui.js';
import hljs from 'highlight.js';

// Current editor state
let currentFile = null;
let isEditorDirty = false;
let db = null;

// Initialize the editor component
function initializeEditor(appState) {
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
  
  // Load database and initialize editor
  loadDatabase()
    .then(data => {
      db = data;
      
      // Populate file list
      if (db.docs) {
        refreshFileList(
          db.docs,
          fileList,
          selectFile,
          confirmDeleteFile
        );
      }
    })
    .catch(error => {
      console.error('Failed to load database:', error);
    });
  
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
    saveButton.addEventListener('click', saveCurrentFile);
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
  
  if (editor && preview) {
    const markdown = editor.value;
    const html = marked(markdown);
    preview.innerHTML = html;
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
  const editor = document.getElementById('markdown-editor');
  
  if (!editor || !db) return;
  
  try {
    // If no current file, create a new one
    if (!currentFile) {
      currentFile = {
        id: generateId(),
        name: 'Untitled Document',
        type: 'markdown',
        content: editor.value,
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      };
      
      // Add to database
      if (!db.docs) {
        db.docs = {};
      }
      
      db.docs[currentFile.id] = currentFile;
    } else {
      // Update existing file
      currentFile.content = editor.value;
      currentFile.modified = new Date().toISOString();
      
      // Update in database
      db.docs[currentFile.id] = currentFile;
    }
    
    // Save database
    await saveDatabase(db);
    
    // Clear dirty flag
    isEditorDirty = false;
    
    // Update file list
    refreshFileList(
      db.docs,
      document.getElementById('file-list'),
      selectFile,
      confirmDeleteFile
    );
    
    // Show notification
    showNotification('Document saved successfully', 'success');
    
    return true;
  } catch (error) {
    console.error('Failed to save document:', error);
    showNotification('Failed to save document: ' + error.message, 'error');
    return false;
  }
}

// Create a new document
function createNewDocument() {
  // Check for unsaved changes
  if (isEditorDirty) {
    if (!confirm('You have unsaved changes. Create a new document anyway?')) {
      return;
    }
  }
  
  // Clear editor
  const editor = document.getElementById('markdown-editor');
  editor.value = '';
  
  // Clear current file
  currentFile = null;
  
  // Clear dirty flag
  isEditorDirty = false;
  
  // Clear active file in list
  document.querySelectorAll('.file-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Focus editor
  editor.focus();
  
  // Show notification
  showNotification('New document created', 'info');
}

// Select a file to edit
function selectFile(file) {
  // Check for unsaved changes
  if (isEditorDirty) {
    if (!confirm('You have unsaved changes. Open another document anyway?')) {
      return;
    }
  }
  
  // Set current file
  currentFile = file;
  
  // Populate editor
  const editor = document.getElementById('markdown-editor');
  editor.value = file.content || '';
  
  // Clear dirty flag
  isEditorDirty = false;
  
  // Update preview if needed
  const editorContainer = document.querySelector('.editor-container');
  if (editorContainer.classList.contains('split-mode') || 
      editorContainer.classList.contains('preview-mode')) {
    updatePreview();
  }
  
  // Focus editor
  editor.focus();
}

// Confirm and delete a file
function confirmDeleteFile(file) {
  if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
    deleteFile(file);
  }
}

// Delete a file
async function deleteFile(file) {
  try {
    // Remove from database
    delete db.docs[file.id];
    
    // Save database
    await saveDatabase(db);
    
    // Update file list
    refreshFileList(
      db.docs,
      document.getElementById('file-list'),
      selectFile,
      confirmDeleteFile
    );
    
    // Clear editor if the current file was deleted
    if (currentFile && currentFile.id === file.id) {
      document.getElementById('markdown-editor').value = '';
      currentFile = null;
      isEditorDirty = false;
    }
    
    // Show notification
    showNotification('Document deleted successfully', 'success');
    
    return true;
  } catch (error) {
    console.error('Failed to delete document:', error);
    showNotification('Failed to delete document: ' + error.message, 'error');
    return false;
  }
}

// Generate a unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Export functions
export {
  initializeEditor,
  updatePreview,
  saveCurrentFile,
  createNewDocument
}; 