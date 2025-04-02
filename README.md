# SecureVault

A Progressive Web App (PWA) for secure content management with encrypted local storage. This application allows users to securely store documents, photos, and files in an encrypted database that is stored locally on their device. *Good vibes are had by all, I hope!*

## Features

- **Encrypted Local Storage**: All data is stored in an encrypted format using AES
- **Password Protection**: User-provided password for encryption/decryption
- **Import/Export**: Securely export and import your encrypted database
- **Document Editor**: Full-featured editor with syntax highlighting and preview
- **Media Management**: Store and view photos and other files
- **Offline Support**: Works without an internet connection
- **Mobile-Friendly**: Responsive design for all device sizes

## Installation

1. Clone this repository
2. Install dependencies with `npm install`
3. Start the development server with `npm start`
4. Build for production with `npm run build`

## Security

- All encryption/decryption happens client-side (in your browser)
- Passwords are never transmitted to any server
- Password stretching is used (PBKDF2) for enhanced security
- Your data remains under your control at all times

## Usage

1. Set up a password when you first open the app
2. Create and edit documents
3. Upload and manage photos and files
4. Export your database regularly for backup
5. Import your database on another device if needed

## Technical Details

- Built with vanilla JavaScript, HTML, and CSS
- Uses CryptoJS for encryption
- Dexie.js for IndexedDB interaction
- Marked.js for content rendering
- Implements the PWA standard for offline capability 