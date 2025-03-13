/**
 * Main application file for SecureVault
 * Initializes the application and handles service worker registration
 */

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('SecureVault Service Worker registered:', registration);
      })
      .catch(error => {
        console.error('SecureVault Service Worker registration failed:', error);
      });
  });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  // Initialize components
  SecureVaultCrypto.init();
  SecureVaultStorage.init();
  SecureVaultUI.init();
  
  // Add keyboard shortcuts
  document.addEventListener('keydown', (event) => {
    // Only handle keyboard shortcuts when database is unlocked
    if (SecureVaultStorage.isLocked()) return;
    
    // Ctrl/Cmd + S to save current item
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      
      const currentSection = document.querySelector('.section:not(.hidden)');
      if (currentSection) {
        switch (currentSection.id) {
          case 'section-docs':
            document.getElementById('btn-save-doc').click();
            break;
          case 'section-photos':
            document.getElementById('btn-save-photo').click();
            break;
          case 'section-files':
            document.getElementById('btn-save-file').click();
            break;
        }
      }
    }
    
    // Ctrl/Cmd + L to lock database
    if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
      event.preventDefault();
      document.getElementById('btn-lock').click();
    }
  });
}); 