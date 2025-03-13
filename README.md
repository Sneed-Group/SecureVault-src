# SecureVault

SecureVault is a secure, local, encrypted document and file storage Progressive Web App (PWA). It allows you to create, edit, and store markdown documents, photos, and files in an encrypted database that is saved locally on your device.

## Features

- 🔒 Secure AES-256 encryption
- 💾 Local storage - no server required
- 📝 Markdown editor with preview
- 📸 Photo storage and viewer
- 📁 General file storage
- 🌐 Works offline
- 📱 Mobile-friendly PWA

## How It Works

1. Create a new encrypted database or load an existing one with your password
2. Add and edit documents, photos, and files
3. All data is encrypted using AES-256 before being stored locally
4. Export your encrypted database for backup or transfer
5. Import and decrypt your database on any device using your password

## Security

- All encryption/decryption happens in your browser
- Uses the CryptoJS library for AES-256 encryption
- Password never leaves your device
- No server communication - everything stays local

## Getting Started

1. Open SecureVault in a modern browser
2. Create a new database with a strong password
3. Start adding your documents, photos, and files
4. Use the export feature to backup your encrypted database

## Keyboard Shortcuts

- `Ctrl/Cmd + S` - Save current item
- `Ctrl/Cmd + L` - Lock database

## Browser Support

SecureVault works in all modern browsers that support:
- IndexedDB
- Service Workers
- Web Crypto API
- File API

## Development

1. Clone the repository
2. Open `index.html` in your browser
3. For the best experience, use a local server (e.g., `python -m http.server` or `node server.js`)

## License

MIT

## Disclaimer

While SecureVault uses strong encryption, no security system is perfect. Always maintain backups of your important data and use strong, unique passwords. 