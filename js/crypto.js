// Core crypto functionality using the Web Crypto API

class SecureVaultCrypto {
    constructor() {
        this.salt = new TextEncoder().encode('SecureVaultSalt');
    }

    // Generate a key from password
    async deriveKey(password) {
        const passwordBuffer = new TextEncoder().encode(password);
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            { name: 'PBKDF2' },
            false,
            ['deriveBits', 'deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: this.salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    // Encrypt a file
    async encryptFile(file, password, progressCallback) {
        try {
            // Generate a random IV
            const iv = crypto.getRandomValues(new Uint8Array(12));
            
            // Derive key from password
            const key = await this.deriveKey(password);
            
            // Read file
            const fileData = await this.readFileAsArrayBuffer(file, progressCallback);
            
            // Encrypt the file data
            progressCallback({ status: 'Encrypting...', progress: 50 });
            
            const encryptedData = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                key,
                fileData
            );
            
            // Combine IV and encrypted data
            const resultBuffer = new Uint8Array(iv.length + encryptedData.byteLength);
            resultBuffer.set(iv, 0);
            resultBuffer.set(new Uint8Array(encryptedData), iv.length);
            
            progressCallback({ status: 'Encryption complete', progress: 100 });
            
            // Create a new file with the encrypted data
            return new File([resultBuffer], file.name + '.enc', { type: 'application/octet-stream' });
        } catch (error) {
            console.error('Encryption error:', error);
            throw error;
        }
    }

    // Decrypt a file
    async decryptFile(file, password, progressCallback) {
        try {
            // Read file
            const fileData = await this.readFileAsArrayBuffer(file, progressCallback);
            
            // Extract IV from the beginning of the file
            const iv = fileData.slice(0, 12);
            const encryptedData = fileData.slice(12);
            
            // Derive key from password
            const key = await this.deriveKey(password);
            
            progressCallback({ status: 'Decrypting...', progress: 50 });
            
            // Decrypt the data
            const decryptedData = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: new Uint8Array(iv)
                },
                key,
                encryptedData
            );
            
            progressCallback({ status: 'Decryption complete', progress: 100 });
            
            // Create a new file with the decrypted data
            const fileName = file.name.endsWith('.enc') 
                ? file.name.substring(0, file.name.length - 4) 
                : file.name + '.decrypted';
                
            return new File([decryptedData], fileName, {
                type: 'application/octet-stream'
            });
        } catch (error) {
            console.error('Decryption error:', error);
            throw error;
        }
    }

    // Read file as ArrayBuffer with progress updates
    readFileAsArrayBuffer(file, progressCallback) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onprogress = (event) => {
                if (event.lengthComputable) {
                    const progress = Math.round((event.loaded / event.total) * 30);
                    progressCallback({ status: 'Reading file...', progress });
                }
            };
            
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            
            reader.readAsArrayBuffer(file);
        });
    }

    // Calculate password strength
    calculatePasswordStrength(password) {
        if (!password) return { score: 0, feedback: 'Enter a password' };
        
        let score = 0;
        const feedback = [];
        
        // Length check
        if (password.length < 8) {
            feedback.push('Password is too short');
        } else if (password.length >= 12) {
            score += 2;
        } else {
            score += 1;
        }
        
        // Complexity checks
        if (/[A-Z]/.test(password)) score += 1;
        else feedback.push('Add uppercase letters');
        
        if (/[a-z]/.test(password)) score += 1;
        else feedback.push('Add lowercase letters');
        
        if (/[0-9]/.test(password)) score += 1;
        else feedback.push('Add numbers');
        
        if (/[^A-Za-z0-9]/.test(password)) score += 1;
        else feedback.push('Add special characters');
        
        // Final score and feedback
        let strengthText = '';
        if (score < 3) strengthText = 'Weak';
        else if (score < 5) strengthText = 'Moderate';
        else strengthText = 'Strong';
        
        return {
            score,
            strengthText,
            feedback: feedback.join('. ')
        };
    }
}
secureCrypto = new SecureVaultCrypto();
