/**
 * UI utility functions for SecureVault
 * Handles UI interactions and updates
 */

const SecureVaultUI = (function() {
  // Private variables
  let _markdownEditor = null;
  let _currentSection = 'auth';
  let _currentDocId = null;
  let _currentPhotoId = null;
  let _currentFileId = null;
  
  // DOM Elements cache
  const _elements = {
    // Navigation
    navButtons: {
      docs: document.getElementById('nav-docs'),
      photos: document.getElementById('nav-photos'),
      files: document.getElementById('nav-files')
    },
    authControls: {
      loadBtn: document.getElementById('btn-load'),
      saveBtn: document.getElementById('btn-save'),
      lockBtn: document.getElementById('btn-lock')
    },
    
    // Sections
    sections: {
      auth: document.getElementById('section-auth'),
      docs: document.getElementById('section-docs'),
      photos: document.getElementById('section-photos'),
      files: document.getElementById('section-files')
    },
    
    // Auth section
    auth: {
      passwordInput: document.getElementById('password'),
      createNewBtn: document.getElementById('btn-create-new'),
      dbFileInput: document.getElementById('db-file')
    },
    
    // Docs section
    docs: {
      list: document.getElementById('docs-list'),
      newBtn: document.getElementById('btn-new-doc'),
      titleInput: document.getElementById('doc-title'),
      saveBtn: document.getElementById('btn-save-doc'),
      editorContainer: document.getElementById('markdown-editor')
    },
    
    // Photos section
    photos: {
      list: document.getElementById('photos-list'),
      newBtn: document.getElementById('btn-new-photo'),
      display: document.getElementById('photo-display'),
      titleInput: document.getElementById('photo-title'),
      saveBtn: document.getElementById('btn-save-photo')
    },
    
    // Files section
    files: {
      list: document.getElementById('files-list'),
      newBtn: document.getElementById('btn-new-file'),
      titleInput: document.getElementById('file-title'),
      typeSpan: document.getElementById('file-type'),
      sizeSpan: document.getElementById('file-size'),
      saveBtn: document.getElementById('btn-save-file'),
      downloadBtn: document.getElementById('btn-download-file')
    },
    
    // Modals
    modals: {
      overlay: document.getElementById('modal-overlay'),
      newItem: document.getElementById('modal-new-item'),
      password: document.getElementById('modal-password'),
      saveDb: document.getElementById('modal-save-db')
    },
    
    // Modal controls
    modalControls: {
      newItemTitle: document.getElementById('new-item-title'),
      newItemFile: document.getElementById('new-item-file'),
      newItemFileGroup: document.querySelector('.file-input-group'),
      modalCancelBtn: document.getElementById('btn-modal-cancel'),
      modalCreateBtn: document.getElementById('btn-modal-create'),
      modalPasswordInput: document.getElementById('modal-password-input'),
      modalPasswordCancelBtn: document.getElementById('btn-modal-password-cancel'),
      modalPasswordConfirmBtn: document.getElementById('btn-modal-password-confirm'),
      savePasswordInput: document.getElementById('save-password'),
      modalSaveCancelBtn: document.getElementById('btn-modal-save-cancel'),
      modalSaveConfirmBtn: document.getElementById('btn-modal-save-confirm')
    }
  };
  
  // Event handler types
  const _eventTypes = {
    NEW_ITEM: 'new-item',
    SAVE_DB: 'save-db',
    PASSWORD: 'password'
  };
  
  // Current modal callback
  let _modalCallback = null;
  let _modalType = null;
  
  // Private methods
  const _showSection = function(sectionName) {
    // Hide all sections
    Object.values(_elements.sections).forEach(section => {
      section.classList.add('hidden');
    });
    
    // Show selected section
    _elements.sections[sectionName].classList.remove('hidden');
    
    // Update nav buttons
    Object.keys(_elements.navButtons).forEach(key => {
      _elements.navButtons[key].classList.remove('active');
    });
    
    if (sectionName !== 'auth') {
      _elements.navButtons[sectionName].classList.add('active');
    }
    
    _currentSection = sectionName;
  };
  
  const _updateAuthControls = function() {
    const isLocked = SecureVaultStorage.isLocked();
    
    // Show/hide nav buttons based on locked state
    Object.values(_elements.navButtons).forEach(btn => {
      btn.disabled = isLocked;
    });
    
    // Update auth control buttons
    _elements.authControls.loadBtn.classList.toggle('hidden', !isLocked);
    _elements.authControls.saveBtn.classList.toggle('hidden', isLocked);
    _elements.authControls.lockBtn.classList.toggle('hidden', isLocked);
    
    // Show auth section if locked, otherwise show docs
    if (isLocked) {
      _showSection('auth');
    } else if (_currentSection === 'auth') {
      _showSection('docs');
    }
  };
  
  const _initMarkdownEditor = function() {
    if (!_markdownEditor) {
      _markdownEditor = new SimpleMDE({
        element: _elements.docs.editorContainer,
        spellChecker: false,
        autofocus: false,
        toolbar: [
          'bold', 'italic', 'strikethrough', 'heading', '|',
          'unordered-list', 'ordered-list', 'link', 'image', '|',
          'preview', 'side-by-side', 'fullscreen', '|',
          'guide'
        ]
      });
    }
  };
  
  const _clearEditor = function() {
    if (_markdownEditor) {
      _markdownEditor.value('');
    }
    _elements.docs.titleInput.value = '';
    _currentDocId = null;
  };
  
  const _clearPhotoViewer = function() {
    _elements.photos.display.src = '';
    _elements.photos.titleInput.value = '';
    _currentPhotoId = null;
  };
  
  const _clearFileViewer = function() {
    _elements.files.titleInput.value = '';
    _elements.files.typeSpan.textContent = '';
    _elements.files.sizeSpan.textContent = '';
    _currentFileId = null;
  };
  
  const _loadDocs = function() {
    SecureVaultStorage.getItems('docs')
      .then(docs => {
        _elements.docs.list.innerHTML = '';
        
        const docIds = Object.keys(docs);
        if (docIds.length === 0) {
          _elements.docs.list.innerHTML = '<li class="no-items">No documents yet</li>';
          return;
        }
        
        // Sort by updatedAt (newest first)
        docIds.sort((a, b) => docs[b].updatedAt - docs[a].updatedAt);
        
        docIds.forEach(id => {
          const doc = docs[id];
          const li = document.createElement('li');
          li.className = 'item';
          li.textContent = doc.title || 'Untitled Document';
          li.dataset.id = id;
          
          li.addEventListener('click', () => {
            _loadDoc(id);
            
            // Set active class
            document.querySelectorAll('#docs-list .item').forEach(item => {
              item.classList.remove('active');
            });
            li.classList.add('active');
          });
          
          _elements.docs.list.appendChild(li);
        });
      })
      .catch(error => {
        console.error('Error loading docs:', error);
        alert('Failed to load documents: ' + error.message);
      });
  };
  
  const _loadDoc = function(id) {
    SecureVaultStorage.getItem('docs', id)
      .then(doc => {
        _currentDocId = id;
        _elements.docs.titleInput.value = doc.title || '';
        _markdownEditor.value(doc.content || '');
      })
      .catch(error => {
        console.error(`Error loading doc ${id}:`, error);
        alert('Failed to load document: ' + error.message);
      });
  };
  
  const _saveDoc = function() {
    const title = _elements.docs.titleInput.value.trim() || 'Untitled Document';
    const content = _markdownEditor.value();
    
    const docData = {
      title,
      content
    };
    
    SecureVaultStorage.saveItem('docs', _currentDocId, docData)
      .then(savedDoc => {
        _currentDocId = savedDoc.id;
        alert('Document saved successfully');
        _loadDocs(); // Refresh the list
      })
      .catch(error => {
        console.error('Error saving doc:', error);
        alert('Failed to save document: ' + error.message);
      });
  };
  
  const _loadPhotos = function() {
    SecureVaultStorage.getItems('photos')
      .then(photos => {
        _elements.photos.list.innerHTML = '';
        
        const photoIds = Object.keys(photos);
        if (photoIds.length === 0) {
          _elements.photos.list.innerHTML = '<li class="no-items">No photos yet</li>';
          return;
        }
        
        // Sort by updatedAt (newest first)
        photoIds.sort((a, b) => photos[b].updatedAt - photos[a].updatedAt);
        
        photoIds.forEach(id => {
          const photo = photos[id];
          const li = document.createElement('li');
          li.className = 'item';
          li.textContent = photo.title || 'Untitled Photo';
          li.dataset.id = id;
          
          li.addEventListener('click', () => {
            _loadPhoto(id);
            
            // Set active class
            document.querySelectorAll('#photos-list .item').forEach(item => {
              item.classList.remove('active');
            });
            li.classList.add('active');
          });
          
          _elements.photos.list.appendChild(li);
        });
      })
      .catch(error => {
        console.error('Error loading photos:', error);
        alert('Failed to load photos: ' + error.message);
      });
  };
  
  const _loadPhoto = function(id) {
    SecureVaultStorage.getItem('photos', id)
      .then(photo => {
        _currentPhotoId = id;
        _elements.photos.titleInput.value = photo.title || '';
        _elements.photos.display.src = photo.data;
        _elements.photos.display.alt = photo.title || 'Photo';
      })
      .catch(error => {
        console.error(`Error loading photo ${id}:`, error);
        alert('Failed to load photo: ' + error.message);
      });
  };
  
  const _savePhoto = function() {
    const title = _elements.photos.titleInput.value.trim() || 'Untitled Photo';
    
    // Check if we have a photo loaded
    if (!_elements.photos.display.src) {
      alert('No photo to save');
      return;
    }
    
    const photoData = {
      title,
      data: _elements.photos.display.src
    };
    
    SecureVaultStorage.saveItem('photos', _currentPhotoId, photoData)
      .then(savedPhoto => {
        _currentPhotoId = savedPhoto.id;
        alert('Photo saved successfully');
        _loadPhotos(); // Refresh the list
      })
      .catch(error => {
        console.error('Error saving photo:', error);
        alert('Failed to save photo: ' + error.message);
      });
  };
  
  const _loadFiles = function() {
    SecureVaultStorage.getItems('files')
      .then(files => {
        _elements.files.list.innerHTML = '';
        
        const fileIds = Object.keys(files);
        if (fileIds.length === 0) {
          _elements.files.list.innerHTML = '<li class="no-items">No files yet</li>';
          return;
        }
        
        // Sort by updatedAt (newest first)
        fileIds.sort((a, b) => files[b].updatedAt - files[a].updatedAt);
        
        fileIds.forEach(id => {
          const file = files[id];
          const li = document.createElement('li');
          li.className = 'item';
          li.textContent = file.title || 'Untitled File';
          li.dataset.id = id;
          
          li.addEventListener('click', () => {
            _loadFile(id);
            
            // Set active class
            document.querySelectorAll('#files-list .item').forEach(item => {
              item.classList.remove('active');
            });
            li.classList.add('active');
          });
          
          _elements.files.list.appendChild(li);
        });
      })
      .catch(error => {
        console.error('Error loading files:', error);
        alert('Failed to load files: ' + error.message);
      });
  };
  
  const _loadFile = function(id) {
    SecureVaultStorage.getItem('files', id)
      .then(file => {
        _currentFileId = id;
        _elements.files.titleInput.value = file.title || '';
        _elements.files.typeSpan.textContent = file.type || 'Unknown type';
        _elements.files.sizeSpan.textContent = file.size ? _formatFileSize(file.size) : '';
      })
      .catch(error => {
        console.error(`Error loading file ${id}:`, error);
        alert('Failed to load file: ' + error.message);
      });
  };
  
  const _saveFile = function() {
    const title = _elements.files.titleInput.value.trim() || 'Untitled File';
    
    SecureVaultStorage.getItem('files', _currentFileId)
      .then(file => {
        file.title = title;
        
        return SecureVaultStorage.saveItem('files', _currentFileId, file);
      })
      .then(savedFile => {
        _currentFileId = savedFile.id;
        alert('File saved successfully');
        _loadFiles(); // Refresh the list
      })
      .catch(error => {
        console.error('Error saving file:', error);
        alert('Failed to save file: ' + error.message);
      });
  };
  
  const _downloadFile = function() {
    if (!_currentFileId) {
      alert('No file selected');
      return;
    }
    
    SecureVaultStorage.getItem('files', _currentFileId)
      .then(file => {
        const a = document.createElement('a');
        a.href = file.data;
        a.download = file.title || 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      })
      .catch(error => {
        console.error('Error downloading file:', error);
        alert('Failed to download file: ' + error.message);
      });
  };
  
  const _formatFileSize = function(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const _showModal = function(type, callback) {
    _elements.modals.overlay.classList.remove('hidden');
    _modalType = type;
    _modalCallback = callback;
    
    // Hide all modals first
    _elements.modals.newItem.classList.add('hidden');
    _elements.modals.password.classList.add('hidden');
    _elements.modals.saveDb.classList.add('hidden');
    
    // Show the appropriate modal
    switch (type) {
      case _eventTypes.NEW_ITEM:
        _elements.modals.newItem.classList.remove('hidden');
        _elements.modalControls.newItemTitle.value = '';
        _elements.modalControls.newItemFile.value = '';
        
        // Show/hide file input based on section
        const showFileInput = _currentSection === 'photos' || _currentSection === 'files';
        _elements.modalControls.newItemFileGroup.classList.toggle('hidden', !showFileInput);
        break;
      
      case _eventTypes.PASSWORD:
        _elements.modals.password.classList.remove('hidden');
        _elements.modalControls.modalPasswordInput.value = '';
        break;
      
      case _eventTypes.SAVE_DB:
        _elements.modals.saveDb.classList.remove('hidden');
        _elements.modalControls.savePasswordInput.value = '';
        break;
    }
  };
  
  const _hideModal = function() {
    _elements.modals.overlay.classList.add('hidden');
    _modalType = null;
    _modalCallback = null;
  };
  
  // Initialize event listeners
  const _initEvents = function() {
    // Nav button events
    Object.keys(_elements.navButtons).forEach(section => {
      _elements.navButtons[section].addEventListener('click', () => {
        if (!SecureVaultStorage.isLocked()) {
          _showSection(section);
        }
      });
    });
    
    // Auth control events
    _elements.authControls.loadBtn.addEventListener('click', () => {
      _showSection('auth');
    });
    
    _elements.authControls.saveBtn.addEventListener('click', () => {
      _showModal(_eventTypes.SAVE_DB, (password) => {
        if (password) {
          SecureVaultStorage.saveDatabase()
            .then(encrypted => {
              const blob = new Blob([encrypted], { type: 'application/securevault' });
              const url = URL.createObjectURL(blob);
              
              const a = document.createElement('a');
              a.href = url;
              a.download = 'securevault_database.securevault';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              
              URL.revokeObjectURL(url);
            })
            .catch(error => {
              console.error('Error saving database:', error);
              alert('Failed to save database: ' + error.message);
            });
        }
      });
    });
    
    _elements.authControls.lockBtn.addEventListener('click', () => {
      SecureVaultStorage.lockDatabase()
        .then(() => {
          _updateAuthControls();
          _clearEditor();
          _clearPhotoViewer();
          _clearFileViewer();
        })
        .catch(error => {
          console.error('Error locking database:', error);
          alert('Failed to lock database: ' + error.message);
        });
    });
    
    // Auth section events
    _elements.auth.createNewBtn.addEventListener('click', () => {
      const password = _elements.auth.passwordInput.value;
      
      if (!password) {
        alert('Please enter a password');
        return;
      }
      
      SecureVaultStorage.createDatabase(password)
        .then(() => {
          _updateAuthControls();
          _elements.auth.passwordInput.value = '';
        })
        .catch(error => {
          console.error('Error creating database:', error);
          alert('Failed to create database: ' + error.message);
        });
    });
    
    _elements.auth.dbFileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = function(e) {
        const encryptedData = e.target.result;
        
        _showModal(_eventTypes.PASSWORD, (password) => {
          if (password) {
            SecureVaultStorage.unlockDatabase(encryptedData, password)
              .then(() => {
                _updateAuthControls();
                _loadDocs();
                _loadPhotos();
                _loadFiles();
              })
              .catch(error => {
                console.error('Error unlocking database:', error);
                alert('Failed to unlock database: ' + error.message);
              });
          }
        });
      };
      
      reader.readAsText(file);
    });
    
    // Docs section events
    _elements.docs.newBtn.addEventListener('click', () => {
      _showModal(_eventTypes.NEW_ITEM, (title) => {
        if (title) {
          _clearEditor();
          _elements.docs.titleInput.value = title;
        }
      });
    });
    
    _elements.docs.saveBtn.addEventListener('click', _saveDoc);
    
    // Photos section events
    _elements.photos.newBtn.addEventListener('click', () => {
      _showModal(_eventTypes.NEW_ITEM, (title, file) => {
        if (file) {
          _clearPhotoViewer();
          _elements.photos.titleInput.value = title || 'Untitled Photo';
          
          SecureVaultCrypto.fileToBase64(file)
            .then(base64 => {
              _elements.photos.display.src = base64;
              
              // Auto-save the new photo
              const photoData = {
                title: title || 'Untitled Photo',
                data: base64,
                type: file.type,
                size: file.size
              };
              
              return SecureVaultStorage.saveItem('photos', null, photoData);
            })
            .then(savedPhoto => {
              _currentPhotoId = savedPhoto.id;
              _loadPhotos(); // Refresh the list
            })
            .catch(error => {
              console.error('Error adding new photo:', error);
              alert('Failed to add photo: ' + error.message);
            });
        }
      });
    });
    
    _elements.photos.saveBtn.addEventListener('click', _savePhoto);
    
    // Files section events
    _elements.files.newBtn.addEventListener('click', () => {
      _showModal(_eventTypes.NEW_ITEM, (title, file) => {
        if (file) {
          _clearFileViewer();
          _elements.files.titleInput.value = title || file.name;
          _elements.files.typeSpan.textContent = file.type || 'Unknown type';
          _elements.files.sizeSpan.textContent = _formatFileSize(file.size);
          
          SecureVaultCrypto.fileToBase64(file)
            .then(base64 => {
              // Auto-save the new file
              const fileData = {
                title: title || file.name,
                data: base64,
                type: file.type,
                size: file.size,
                originalName: file.name
              };
              
              return SecureVaultStorage.saveItem('files', null, fileData);
            })
            .then(savedFile => {
              _currentFileId = savedFile.id;
              _loadFiles(); // Refresh the list
            })
            .catch(error => {
              console.error('Error adding new file:', error);
              alert('Failed to add file: ' + error.message);
            });
        }
      });
    });
    
    _elements.files.saveBtn.addEventListener('click', _saveFile);
    _elements.files.downloadBtn.addEventListener('click', _downloadFile);
    
    // Modal events
    _elements.modalControls.modalCancelBtn.addEventListener('click', _hideModal);
    
    _elements.modalControls.modalCreateBtn.addEventListener('click', () => {
      const title = _elements.modalControls.newItemTitle.value.trim();
      const file = _elements.modalControls.newItemFile.files[0];
      
      if (_modalCallback) {
        _modalCallback(title, file);
        _hideModal();
      }
    });
    
    _elements.modalControls.modalPasswordCancelBtn.addEventListener('click', _hideModal);
    
    _elements.modalControls.modalPasswordConfirmBtn.addEventListener('click', () => {
      const password = _elements.modalControls.modalPasswordInput.value;
      
      if (_modalCallback) {
        _modalCallback(password);
        _hideModal();
      }
    });
    
    _elements.modalControls.modalSaveCancelBtn.addEventListener('click', _hideModal);
    
    _elements.modalControls.modalSaveConfirmBtn.addEventListener('click', () => {
      const password = _elements.modalControls.savePasswordInput.value;
      
      if (_modalCallback) {
        _modalCallback(password);
        _hideModal();
      }
    });
  };
  
  // Public API
  return {
    /**
     * Initialize the UI
     */
    init: function() {
      _initMarkdownEditor();
      _initEvents();
      _updateAuthControls();
    },
    
    /**
     * Update the UI when the database is loaded or created
     */
    onDatabaseLoaded: function() {
      _updateAuthControls();
      _loadDocs();
      _loadPhotos();
      _loadFiles();
    }
  };
})();

// Initialize the UI when the page loads
window.addEventListener('DOMContentLoaded', function() {
  SecureVaultUI.init();
}); 