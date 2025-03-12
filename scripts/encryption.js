const EncryptionService = {
  /**
   * Encrypts data with the provided password
   */
  encrypt: function (data, password) {
    try {
      const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify(data),
        password,
      ).toString();
      return encrypted;
    } catch (error) {
      console.error("Encryption error:", error);
      throw new Error("Failed to encrypt data");
    }
  },

  /**
   * Decrypts data with the provided password
   */
  decrypt: function (encryptedData, password) {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, password).toString(
        CryptoJS.enc.Utf8,
      );
      return JSON.parse(decrypted);
    } catch (error) {
      console.error("Decryption error:", error);
      throw new Error(
        "Failed to decrypt data. Incorrect password or corrupted data.",
      );
    }
  },

  /**
   * Converts file to Base64
   */
  fileToBase64: function (file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  },
};
