// app.js
// ======
// Main application logic

// Check for secure context
if (window.isSecureContext) {
    console.log('Running in secure context - crypto APIs available');
} else {
    alert('This application requires a secure context (HTTPS) to function properly.');
}


window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 76+ from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show the install banner
    appInstallBanner.classList.remove('hidden');
});

//document.querySelector('.install-button').addEventListener('click', () => {
    // Hide the app install banner
    //appInstallBanner.classList.add('hidden');
    // Show the install prompt
    //deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    //deferredPrompt.userChoice.then((choiceResult) => {
        //if (choiceResult.outcome === 'accepted') {
            //console.log('User accepted the install prompt');
        //} else {
            //console.log('User dismissed the install prompt');
        //}
        // Clear the saved prompt since it can't be used again
        //deferredPrompt = null;
    //});
//});

//document.querySelector('.close-banner').addEventListener('click', () => {
//    appInstallBanner.classList.add('hidden');
//});

// Handle file sharing from other apps (when PWA is installed)
if (navigator.share) {
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'share-target' && event.data.files) {
            // Automatically switch to encrypt tab
            document.querySelector('[data-tab="encrypt"]').click();
            
            // Handle the shared files
            const app = window.secureVaultApp;
            if (app) {
                app.handleFiles(event.data.files, 'encrypt');
            }
        }
    });
}

// Export app instance for potential use in other scripts
window.addEventListener('DOMContentLoaded', () => {
    window.secureVaultApp = new SecureVaultUI();
    
    // Check file system access capabilities
    if ('showDirectoryPicker' in window) {
        // Enable folder selection on modern browsers
        document.getElementById('folder-select-btn').classList.remove('hidden');
        document.getElementById('folder-select-btn').addEventListener('click', async () => {
            try {
                const dirHandle = await window.showDirectoryPicker();
                const files = [];
                
                for await (const entry of dirHandle.values()) {
                    if (entry.kind === 'file') {
                        const file = await entry.getFile();
                        files.push(file);
                    }
                }
                
                if (files.length > 0) {
                    window.secureVaultApp.handleFiles(files, 'encrypt');
                }
            } catch (error) {
                console.error('Error accessing directory:', error);
            }
        });
    }
});

// Handle offline status
window.addEventListener('online', () => {
    document.body.classList.remove('offline');
});

window.addEventListener('offline', () => {
    document.body.classList.add('offline');
});

if (!navigator.onLine) {
    document.body.classList.add('offline');
}
