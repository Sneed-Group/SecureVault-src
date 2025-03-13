// Import dependencies
import { showNotification } from './ui.js';
import { 
  saveDatabase, 
  decryptData, 
  encryptData, 
  getEncryptionKey 
} from './database.js';

// Current state
let db = null;

// Initialize photo manager
export function initializePhotoManager(appState) {
  console.log('Initializing photo manager...');
  
  // Get DOM elements
  const uploadPhotoBtn = document.getElementById('upload-photo-btn');
  const photoUploadInput = document.getElementById('photo-upload');
  const photosContainer = document.getElementById('photos-container');
  const viewOptions = document.querySelectorAll('.view-option');
  

  
  // Initialize database structure if needed
  if (!db) {
    db = {};
  }
  
  // Initialize photos section if needed
  if (!db.photos) {
    db.photos = {};
  }
  
  // Render gallery
  renderPhotoGallery(db.photos);
  
  // Upload button click
  if (uploadPhotoBtn) {
    uploadPhotoBtn.addEventListener('click', () => {
      if (photoUploadInput) {
        photoUploadInput.click();
      }
    });
  }
  
  // Photo input change
  if (photoUploadInput) {
    photoUploadInput.addEventListener('change', async (event) => {
      const files = event.target.files;
      
      if (files.length > 0) {
        try {
          await uploadPhotos(files);
          photoUploadInput.value = ''; // Clear the input
        } catch (error) {
          console.error('Failed to upload photos:', error);
          showNotification('Failed to upload photos: ' + error.message, 'error');
        }
      }
    });
  }
  
  // View options
  if (viewOptions) {
    viewOptions.forEach(option => {
      option.addEventListener('click', () => {
        // Update active button
        viewOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        
        // Update view
        const viewType = option.getAttribute('data-view');
        if (photosContainer) {
          photosContainer.className = viewType === 'grid' ? 'grid-view' : 'list-view';
        }
      });
    });
  }
  
  console.log('Photo manager initialized');
}

// Upload photos
async function uploadPhotos(fileList) {
  const promises = [];
  
  // Check if all files are images
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    if (!file.type.startsWith('image/')) {
      showNotification(`${file.name} is not an image file`, 'error');
      continue;
    }
    
    promises.push(processPhoto(file));
  }
  
  // Wait for all photos to be processed
  const results = await Promise.all(promises);
  const successCount = results.filter(result => result).length;
  
  // Save to database
  try {
    // Then encrypt and save to secure storage if encryption key is available
    const encryptionKey = getEncryptionKey();
    if (encryptionKey) {
      const encrypted = encryptData(db);
      if (encrypted) {
        await saveDatabase();
        console.log('Saved photos to secure database');
      }
    }
  } catch (error) {
    console.error('Failed to save photos:', error);
    showNotification('Error saving photos. Please try again.', 'error');
  }
  
  // Render the updated gallery
  renderPhotoGallery(db.photos);
  
  // Show notification
  showNotification(`Uploaded ${successCount} of ${fileList.length} photos`, 'success');
  
  return successCount === fileList.length;
}

// Process a single photo
async function processPhoto(file) {
  return new Promise((resolve, reject) => {
    // Create an image element to get dimensions
    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      img.onload = async () => {
        try {
          // Create a photo object
          const photoObj = {
            id: generateId(),
            name: file.name,
            type: 'image',
            size: file.size,
            width: img.width,
            height: img.height,
            contentType: file.type,
            content: e.target.result, // Full-size image
            thumbnail: await createThumbnail(img), // Create thumbnail
            created: new Date().toISOString(),
            modified: new Date().toISOString()
          };
          
          // Add to database
          db.photos[photoObj.id] = photoObj;
          
          resolve(true);
        } catch (error) {
          console.error('Failed to process photo:', error);
          reject(error);
        }
      };
      
      img.onerror = (error) => {
        reject(error);
      };
      
      // Set source to loaded data URL
      img.src = e.target.result;
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    // Read the file as a data URL
    reader.readAsDataURL(file);
  });
}

// Create a thumbnail
async function createThumbnail(img, maxWidth = 200, maxHeight = 200) {
  return new Promise((resolve) => {
    // Create a canvas element
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Calculate thumbnail dimensions while maintaining aspect ratio
    let width = img.width;
    let height = img.height;
    
    if (width > height) {
      if (width > maxWidth) {
        height = Math.round(height * maxWidth / width);
        width = maxWidth;
      }
    } else {
      if (height > maxHeight) {
        width = Math.round(width * maxHeight / height);
        height = maxHeight;
      }
    }
    
    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;
    
    // Draw the image on the canvas
    ctx.drawImage(img, 0, 0, width, height);
    
    // Get the data URL from the canvas
    const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.7);
    
    resolve(thumbnailDataUrl);
  });
}

// Render the photo gallery
function renderPhotoGallery(photos) {
  const photosContainer = document.getElementById('photos-container');
  if (!photosContainer) return;
  
  // Clear the container
  photosContainer.innerHTML = '';
  
  // Get photos as array and sort by date (newest first)
  const photosList = Object.values(photos).sort((a, b) => {
    return new Date(b.created) - new Date(a.created);
  });
  
  // Add photos to the container
  photosList.forEach(photo => {
    const photoElement = createPhotoElement(photo);
    photosContainer.appendChild(photoElement);
  });
  
  // Show empty state if no photos
  if (photosList.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <p>No photos uploaded yet.</p>
      <p>Click "Upload Photos" to add some.</p>
    `;
    photosContainer.appendChild(emptyState);
  }
}

// Create a photo element
function createPhotoElement(photo) {
  const photoItem = document.createElement('div');
  photoItem.className = 'photo-item';
  photoItem.dataset.id = photo.id;
  
  photoItem.innerHTML = `
    <img src="${photo.thumbnail || photo.content}" alt="${photo.name}" loading="lazy">
    <div class="photo-info">
      <div class="photo-name">${photo.name}</div>
      <div class="photo-meta">
        <span class="photo-size">${formatFileSize(photo.size)}</span>
        <span class="photo-date">${formatDate(photo.created)}</span>
      </div>
    </div>
    <div class="photo-actions">
      <button class="photo-action-btn delete-btn" title="Delete">🗑️</button>
    </div>
  `;
  
  // Add event listeners
  const deleteBtn = photoItem.querySelector('.delete-btn');
  
  // Delete button click
  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmDeletePhoto(photo);
    });
  }
  
  // Photo click for larger view
  photoItem.addEventListener('click', () => {
    openPhotoViewer(photo);
  });
  
  return photoItem;
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

// Confirm and delete photo
function confirmDeletePhoto(photo) {
  if (confirm(`Are you sure you want to delete "${photo.name}"?`)) {
    deletePhoto(photo);
  }
}

// Delete photo
function deletePhoto(photo) {
  try {
    // Remove from database
    delete db.photos[photo.id];
    
    // Save database
    localStorage.setItem('markdown_vault_data', JSON.stringify(db));
    
    // Save to secure database if encryption key is available
    const encryptionKey = getEncryptionKey();
    if (encryptionKey) {
      const encrypted = encryptData(db);
      if (encrypted) {
        saveDatabase();
        console.log('Saved changes to secure database after photo deletion');
      }
    }
    
    // Update gallery
    renderPhotoGallery(db.photos);
    
    // Show notification
    showNotification('Photo deleted successfully', 'success');
    
    return true;
  } catch (error) {
    console.error('Failed to delete photo:', error);
    showNotification('Failed to delete photo: ' + error.message, 'error');
    return false;
  }
}

// Open photo viewer
function openPhotoViewer(photo) {
  // Create a modal for photo viewer
  const modal = document.createElement('div');
  modal.className = 'modal active';
  
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 90%; width: auto;">
      <div class="modal-header">
        <h2>${photo.name}</h2>
        <button class="close-modal">&times;</button>
      </div>
      <div class="modal-body" style="text-align: center;">
        <img src="${photo.content}" alt="${photo.name}" style="max-width: 100%; max-height: 80vh; object-fit: contain;">
        <div class="photo-details" style="margin-top: 1rem; text-align: left;">
          <p>Size: ${formatFileSize(photo.size)}</p>
          <p>Dimensions: ${photo.width} × ${photo.height}</p>
          <p>Date: ${new Date(photo.created).toLocaleString()}</p>
        </div>
        <div class="photo-actions" style="margin-top: 1rem;">
          <button id="download-photo-btn" class="btn primary">Download Original</button>
          <button id="delete-photo-btn" class="btn secondary">Delete</button>
        </div>
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
  
  // Download button click
  const downloadBtn = modal.querySelector('#download-photo-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      downloadPhoto(photo);
    });
  }
  
  // Delete button click
  const deleteBtn = modal.querySelector('#delete-photo-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (confirm(`Are you sure you want to delete "${photo.name}"?`)) {
        deletePhoto(photo);
        document.body.removeChild(modal);
      }
    });
  }
}

// Download photo
function downloadPhoto(photo) {
  // Create a temporary anchor element
  const a = document.createElement('a');
  a.href = photo.content;
  a.download = photo.name;
  a.style.display = 'none';
  
  // Add to body, click, and remove
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  showNotification(`Downloading ${photo.name}`, 'info');
}

// Generate a unique ID
function generateId() {
  return 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Export the photo manager module
export default {
  initializePhotoManager
}; 