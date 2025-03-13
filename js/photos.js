// Import dependencies
import { showNotification } from './ui.js';
import { 
  saveToSecureStorage, 
  loadFromSecureStorage, 
  getEncryptionKey 
} from './database.js';

// Current state
let db = { photos: {} };
let pendingChanges = false;

// Initialize photo manager
export function initializePhotoManager(appState) {
  console.log('Initializing photo manager...');
  
  // Get DOM elements
  const uploadPhotoBtn = document.getElementById('upload-photo-btn');
  const photoUploadInput = document.getElementById('photo-upload');
  const photosContainer = document.getElementById('photos-container');
  const viewOptions = document.querySelectorAll('.view-option');
  
  // Check if we have an encryption key
  const encryptionKey = getEncryptionKey();
  if (!encryptionKey) {
    console.error('No encryption key available, photo manager initialization deferred');
    return;
  }
  
  // Load data from secure storage
  loadFromSecureStorage()
    .then(data => {
      if (data) {
        // Initialize db with the loaded data
        db = data;
        if (!db.photos) {
          db.photos = {};
        }
        console.log('Loaded photos from secure storage');
        
        // Render gallery
        renderPhotoGallery(db.photos);
      } else {
        console.log('No data found in secure storage, initializing empty photo store');
        db = { photos: {} };
        renderPhotoGallery(db.photos);
      }
    })
    .catch(error => {
      console.error('Error loading data from secure storage:', error);
      // Initialize with empty database if loading fails
      db = { photos: {} };
      renderPhotoGallery(db.photos);
    });
  
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
  
  // Listen for autosave events
  window.addEventListener('vault:autosave', async () => {
    console.log('Autosave triggered for photo manager');
    if (pendingChanges) {
      try {
        const saveResult = await saveToSecureStorage(db);
        
        if (saveResult) {
          console.log('Photos autosaved successfully');
          pendingChanges = false;
        } else {
          console.error('Failed to autosave photos');
        }
      } catch (error) {
        console.error('Error during photo autosave:', error);
      }
    }
  });
  
  console.log('Photo manager initialized');
}

// Upload photos
async function uploadPhotos(fileList) {
  // Check for encryption key
  const encryptionKey = getEncryptionKey();
  if (!encryptionKey) {
    showNotification('Cannot upload photos - you must be logged in', 'error');
    return false;
  }
  
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
  
  // Save to secure storage
  try {
    const saveResult = await saveToSecureStorage(db);
    
    if (!saveResult) {
      throw new Error('Failed to save to secure storage');
    }
    
    console.log('Photos saved to secure storage');
    pendingChanges = false;
  } catch (error) {
    console.error('Failed to save photos:', error);
    showNotification('Error saving photos. Please try again.', 'error');
    return false;
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
          // Optimize large images to save storage space
          let optimizedContent = e.target.result;
          if (file.size > 2 * 1024 * 1024) { // If larger than 2MB
            optimizedContent = await optimizeImage(img, 1600); // Max width/height 1600px
          }
          
          // Create a photo object
          const photoObj = {
            id: generateId(),
            name: file.name,
            type: 'image',
            size: file.size,
            width: img.width,
            height: img.height,
            contentType: file.type,
            content: optimizedContent, // Full-size image (optimized if large)
            thumbnail: await createThumbnail(img, 200, 200, 0.7), // Create thumbnail with better quality
            created: new Date().toISOString(),
            modified: new Date().toISOString()
          };
          
          // Add to database
          db.photos[photoObj.id] = photoObj;
          pendingChanges = true;
          
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

// Create a thumbnail with better quality control
async function createThumbnail(img, maxWidth = 200, maxHeight = 200, quality = 0.7) {
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
    
    // Get the data URL from the canvas with specified quality
    const thumbnailDataUrl = canvas.toDataURL('image/jpeg', quality);
    
    resolve(thumbnailDataUrl);
  });
}

// Optimize an image by resizing it if needed
async function optimizeImage(img, maxDimension = 1600, quality = 0.85) {
  return new Promise((resolve) => {
    // Check if image needs optimization
    if (img.width <= maxDimension && img.height <= maxDimension) {
      // Create a canvas with original dimensions but optimize quality
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, img.width, img.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
      return;
    }
    
    // Create a canvas element
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Calculate new dimensions while maintaining aspect ratio
    let width = img.width;
    let height = img.height;
    
    if (width > height) {
      if (width > maxDimension) {
        height = Math.round(height * maxDimension / width);
        width = maxDimension;
      }
    } else {
      if (height > maxDimension) {
        width = Math.round(width * maxDimension / height);
        height = maxDimension;
      }
    }
    
    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;
    
    // Draw the image on the canvas
    ctx.drawImage(img, 0, 0, width, height);
    
    // Get the data URL from the canvas
    const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
    
    resolve(optimizedDataUrl);
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
async function deletePhoto(photo) {
  // Check for encryption key
  const encryptionKey = getEncryptionKey();
  if (!encryptionKey) {
    showNotification('Cannot delete photo - you must be logged in', 'error');
    return false;
  }
  
  try {
    // Remove from database
    delete db.photos[photo.id];
    pendingChanges = true;
    
    // Save to secure storage
    const saveResult = await saveToSecureStorage(db);
    
    if (!saveResult) {
      throw new Error('Failed to save changes to secure storage');
    }
    
    // Update gallery
    renderPhotoGallery(db.photos);
    
    // Show notification
    showNotification('Photo deleted successfully', 'success');
    
    pendingChanges = false;
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