// ui.js
// =====
// Handles user interface interactions

class SecureVaultUI {
    constructor() {
        // UI elements
        this.tabButtons = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        this.encryptDropArea = document.getElementById('encrypt-drop-area');
        this.decryptDropArea = document.getElementById('decrypt-drop-area');
        this.encryptFileInput = document.getElementById('encrypt-file-input');
        this.decryptFileInput = document.getElementById('decrypt-file-input');
        this.encryptFileList = document.getElementById('encrypt-file-list');
        this.decryptFileList = document.getElementById('decrypt-file-list');
        this.encryptPassword = document.getElementById('encrypt-password');
        this.encryptConfirmPassword = document.getElementById('encrypt-confirm-password');
        this.decryptPassword = document.getElementById('decrypt-password');
        this.passwordStrength = document.getElementById('password-strength');
        this.encryptButton = document.getElementById('encrypt-button');
        this.decryptButton = document.getElementById('decrypt-button');
        this.progressContainer = document.getElementById('progress-container');
        this.progressBar = document.getElementById('progress-bar');
        this.progressText = document.getElementById('progress-text');
        this.cancelButton = document.getElementById('cancel-button');
        this.resultContainer = document.getElementById('result-container');
        this.resultList = document.getElementById('result-list');
        this.downloadAllButton = document.getElementById('download-all-button');
        this.clearButton = document.getElementById('clear-button');
        
        // State
        this.selectedEncryptFiles = [];
        this.selectedDecryptFiles = [];
        this.processedFiles = [];
        this.currentOperation = null;
        
        // Initialize
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Tab switching
        this.tabButtons.forEach(button => {
            button.addEventListener('click', () => this.switchTab(button.dataset.tab));
        });
        
        // File selection
        this.encryptFileInput.addEventListener('change', (e) => this.handleFileSelection(e, 'encrypt'));
        this.decryptFileInput.addEventListener('change', (e) => this.handleFileSelection(e, 'decrypt'));
        
        // Drag and drop
        this.setupDragDrop(this.encryptDropArea, 'encrypt');
        this.setupDragDrop(this.decryptDropArea, 'decrypt');
        
        // Password strength check
        this.encryptPassword.addEventListener('input', () => this.checkPasswordStrength());
        this.encryptConfirmPassword.addEventListener('input', () => this.validatePasswordMatch());
        
        // Action buttons
        this.encryptButton.addEventListener('click', () => this.startEncryption());
        this.decryptButton.addEventListener('click', () => this.startDecryption());
        this.cancelButton.addEventListener('click', () => this.cancelOperation());
        this.downloadAllButton.addEventListener('click', () => this.downloadAllFiles());
        this.clearButton.addEventListener('click', () => this.clearResults());
    }
    
    switchTab(tabId) {
        this.tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === tabId);
        });
    }
    
    setupDragDrop(dropArea, type) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.add('highlight');
            });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.remove('highlight');
            });
        });
        
        dropArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (type === 'encrypt') {
                this.handleFiles(files, 'encrypt');
            } else {
                this.handleFiles(files, 'decrypt');
            }
        });
    }
    
    handleFileSelection(event, type) {
        const files = event.target.files;
        this.handleFiles(files, type);
    }
    
    handleFiles(files, type) {
        if (!files || files.length === 0) return;
        
        if (type === 'encrypt') {
            this.selectedEncryptFiles = Array.from(files);
            this.updateFileList(this.encryptFileList, this.selectedEncryptFiles);
            this.updateEncryptButtonState();
        } else {
            this.selectedDecryptFiles = Array.from(files);
            this.updateFileList(this.decryptFileList, this.selectedDecryptFiles);
            this.updateDecryptButtonState();
        }
    }
    
    updateFileList(container, files) {
        container.innerHTML = '';
        
        if (files.length === 0) {
            container.innerHTML = '<p>No files selected</p>';
            return;
        }
        
        const ul = document.createElement('ul');
        
        files.forEach((file, index) => {
            const li = document.createElement('li');
            
            const fileInfo = document.createElement('div');
            fileInfo.classList.add('file-info');
            
            const fileName = document.createElement('span');
            fileName.textContent = file.name;
            
            const fileSize = document.createElement('span');
            fileSize.classList.add('file-size');
            fileSize.textContent = this.formatFileSize(file.size);
            
            fileInfo.appendChild(fileName);
            fileInfo.appendChild(fileSize);
            
            const removeBtn = document.createElement('button');
            removeBtn.classList.add('remove-file');
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', () => this.removeFile(index, container === this.encryptFileList ? 'encrypt' : 'decrypt'));
            
            li.appendChild(fileInfo);
            li.appendChild(removeBtn);
            ul.appendChild(li);
        });
        
        container.appendChild(ul);
    }
    
    removeFile(index, type) {
        if (type === 'encrypt') {
            this.selectedEncryptFiles.splice(index, 1);
            this.updateFileList(this.encryptFileList, this.selectedEncryptFiles);
            this.updateEncryptButtonState();
        } else {
            this.selectedDecryptFiles.splice(index, 1);
            this.updateFileList(this.decryptFileList, this.selectedDecryptFiles);
            this.updateDecryptButtonState();
        }
    }
    
    checkPasswordStrength() {
        const password = this.encryptPassword.value;
        const strength = secureCrypto.calculatePasswordStrength(password);
        
        this.passwordStrength.className = 'password-strength';
        if (strength.score > 0) {
            this.passwordStrength.classList.add(`strength-${strength.score}`);
        }
        
        this.passwordStrength.textContent = strength.feedback || strength.strengthText;
        this.updateEncryptButtonState();
    }
    
    validatePasswordMatch() {
        const password = this.encryptPassword.value;
        const confirmPassword = this.encryptConfirmPassword.value;
        
        if (confirmPassword && password !== confirmPassword) {
            this.encryptConfirmPassword.classList.add('error');
        } else {
            this.encryptConfirmPassword.classList.remove('error');
        }
        
        this.updateEncryptButtonState();
    }
    
    updateEncryptButtonState() {
        const password = this.encryptPassword.value;
        const confirmPassword = this.encryptConfirmPassword.value;
        const filesSelected = this.selectedEncryptFiles.length > 0;
        const passwordsMatch = password === confirmPassword;
        const passwordStrength = secureCrypto.calculatePasswordStrength(password).score;
        
        this.encryptButton.disabled = !filesSelected || !password || !confirmPassword || !passwordsMatch || passwordStrength < 3;
    }
    
    updateDecryptButtonState() {
        const password = this.decryptPassword.value;
        const filesSelected = this.selectedDecryptFiles.length > 0;
        
        // this.decryptButton.disabled = !filesSelected || !password; // BUGSBUG: fix bug where decrypt button doesnt unlock!
    }
    
    async startEncryption() {
        if (this.selectedEncryptFiles.length === 0) return;
        
        const password = this.encryptPassword.value;
        
        this.showProgress('Preparing to encrypt...');
        this.currentOperation = 'encrypt';
        this.processedFiles = [];
        
        try {
            for (let i = 0; i < this.selectedEncryptFiles.length; i++) {
                const file = this.selectedEncryptFiles[i];
                const fileProgress = i / this.selectedEncryptFiles.length * 100;
                
                this.updateProgress({
                    status: `Encrypting ${i + 1}/${this.selectedEncryptFiles.length}: ${file.name}`,
                    progress: fileProgress
                });
                
                const encryptedFile = await secureCrypto.encryptFile(
                    file, 
                    password,
                    (progress) => {
                        const totalProgress = fileProgress + (progress.progress / this.selectedEncryptFiles.length);
                        this.updateProgress({
                            status: progress.status + ` (${i + 1}/${this.selectedEncryptFiles.length})`,
                            progress: totalProgress
                        });
                    }
                );
                
                this.processedFiles.push(encryptedFile);
            }
            
            this.showResults();
        } catch (error) {
            console.error('Encryption error:', error);
            this.updateProgress({
                status: `Error: ${error.message}`,
                progress: 100
            });
            
            setTimeout(() => {
                this.hideProgress();
            }, 3000);
        }
    }
    
    async startDecryption() {
        if (this.selectedDecryptFiles.length === 0) return;
        
        const password = this.decryptPassword.value;
        
        this.showProgress('Preparing to decrypt...');
        this.currentOperation = 'decrypt';
        this.processedFiles = [];
        
        try {
            for (let i = 0; i < this.selectedDecryptFiles.length; i++) {
                const file = this.selectedDecryptFiles[i];
                const fileProgress = i / this.selectedDecryptFiles.length * 100;
                
                this.updateProgress({
                    status: `Decrypting ${i + 1}/${this.selectedDecryptFiles.length}: ${file.name}`,
                    progress: fileProgress
                });
                
                const decryptedFile = await secureCrypto.decryptFile(
                    file, 
                    password,
                    (progress) => {
                        const totalProgress = fileProgress + (progress.progress / this.selectedDecryptFiles.length);
                        this.updateProgress({
                            status: progress.status + ` (${i + 1}/${this.selectedDecryptFiles.length})`,
                            progress: totalProgress
                        });
                    }
                );
                
                this.processedFiles.push(decryptedFile);
            }
            
            this.showResults();
        } catch (error) {
            console.error('Decryption error:', error);
            this.updateProgress({
                status: `Error: ${error.message || 'Wrong password or corrupted file'}`,
                progress: 100
            });
            
            setTimeout(() => {
                this.hideProgress();
            }, 3000);
        }
    }
    
    cancelOperation() {
        // Currently, we can't cancel Web Crypto operations mid-stream
        // But we can stop processing more files
        this.hideProgress();
    }
    
    showProgress(status) {
        this.progressContainer.classList.remove('hidden');
        this.resultContainer.classList.add('hidden');
        this.progressText.textContent = status;
        this.progressBar.style.width = '0%';
    }
    
    updateProgress(progress) {
        this.progressText.textContent = progress.status;
        this.progressBar.style.width = `${progress.progress}%`;
    }
    
    hideProgress() {
        this.progressContainer.classList.add('hidden');
    }
    
    showResults() {
        this.hideProgress();
        this.resultContainer.classList.remove('hidden');
        this.resultList.innerHTML = '';
        
        const operationType = this.currentOperation === 'encrypt' ? 'Encrypted' : 'Decrypted';
        
        if (this.processedFiles.length === 0) {
            this.resultList.innerHTML = '<p>No files were processed</p>';
            return;
        }
        
        const ul = document.createElement('ul');
        
        this.processedFiles.forEach(file => {
            const li = document.createElement('li');
            
            const fileInfo = document.createElement('div');
            fileInfo.classList.add('file-info');
            
            const fileName = document.createElement('span');
            fileName.textContent = file.name;
            
            const fileSize = document.createElement('span');
            fileSize.classList.add('file-size');
            fileSize.textContent = this.formatFileSize(file.size);
            
            fileInfo.appendChild(fileName);
            fileInfo.appendChild(fileSize);
            
            const downloadBtn = document.createElement('button');
            downloadBtn.classList.add('download-file');
            downloadBtn.textContent = 'Download';
            downloadBtn.addEventListener('click', () => this.downloadFile(file));
            
            li.appendChild(fileInfo);
            li.appendChild(downloadBtn);
            ul.appendChild(li);
        });
        
        this.resultList.appendChild(ul);
    }
    
    downloadFile(file) {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    downloadAllFiles() {
        // For multiple files, we need to create a zip
        // But for simplicity, let's just trigger downloads for each file
        this.processedFiles.forEach(file => {
            this.downloadFile(file);
        });
    }
    
    clearResults() {
        this.resultContainer.classList.add('hidden');
        this.processedFiles = [];
        
        if (this.currentOperation === 'encrypt') {
            this.selectedEncryptFiles = [];
            this.updateFileList(this.encryptFileList, this.selectedEncryptFiles);
            this.encryptPassword.value = '';
            this.encryptConfirmPassword.value = '';
            this.passwordStrength.textContent = '';
            this.passwordStrength.className = 'password-strength';
            this.updateEncryptButtonState();
        } else {
            this.selectedDecryptFiles = [];
            this.updateFileList(this.decryptFileList, this.selectedDecryptFiles);
            this.decryptPassword.value = '';
            this.updateDecryptButtonState();
        }
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}
