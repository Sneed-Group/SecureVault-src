const DatabaseService = {
  db: null,
  password: null,

  /**
   * Initialize empty database structure
   */
  createEmptyDB: function () {
    return {
      version: 1,
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      sections: {
        docs: {},
        photos: {},
        files: {},
      },
    };
  },

  /**
   * Create new vault with provided password
   */
  createVault: async function (password) {
    try {
      this.db = this.createEmptyDB();
      this.password = password;
      await this.saveDB();
      return true;
    } catch (error) {
      console.error("Error creating vault:", error);
      return false;
    }
  },

  /**
   * Unlock vault with password
   */
  unlockVault: async function (password) {
    try {
      const encryptedData = localStorage.getItem("encryptedVault");
      if (!encryptedData) {
        throw new Error("No vault found");
      }

      this.db = EncryptionService.decrypt(encryptedData, password);
      this.password = password;
      return true;
    } catch (error) {
      console.error("Error unlocking vault:", error);
      return false;
    }
  },

  /**
   * Lock the vault
   */
  lockVault: function () {
    this.db = null;
    this.password = null;
  },

  /**
   * Save database to localStorage
   */
  saveDB: async function () {
    if (!this.db || !this.password) {
      throw new Error("Database or password not set");
    }

    this.db.lastModified = new Date().toISOString();
    const encrypted = EncryptionService.encrypt(this.db, this.password);
    localStorage.setItem("encryptedVault", encrypted);
  },

  /**
   * Get files for a specific section
   */
  getFiles: function (section) {
    if (!this.db) throw new Error("Database not loaded");

    if (!this.db.sections[section]) {
      throw new Error(`Section ${section} does not exist`);
    }

    return Object.entries(this.db.sections[section]).map(([id, file]) => ({
      id,
      ...file,
    }));
  },

  /**
   * Get a specific file
   */
  getFile: function (section, id) {
    if (!this.db) throw new Error("Database not loaded");

    if (!this.db.sections[section] || !this.db.sections[section][id]) {
      return null;
    }

    return {
      id,
      ...this.db.sections[section][id],
    };
  },

  /**
   * Save a file to the database
   */
  saveFile: async function (section, file) {
    if (!this.db) throw new Error("Database not loaded");

    if (!this.db.sections[section]) {
      throw new Error(`Section ${section} does not exist`);
    }

    const id = file.id || this.generateID();

    this.db.sections[section][id] = {
      ...file,
      lastModified: new Date().toISOString(),
    };

    await this.saveDB();
    return id;
  },

  /**
   * Delete a file from the database
   */
  deleteFile: async function (section, id) {
    if (!this.db) throw new Error("Database not loaded");

    if (!this.db.sections[section] || !this.db.sections[section][id]) {
      return false;
    }

    delete this.db.sections[section][id];
    await this.saveDB();
    return true;
  },

  /**
   * Export the encrypted database
   */
  exportVault: function () {
    if (!this.db || !this.password) {
      throw new Error("Database or password not set");
    }

    const encrypted = localStorage.getItem("encryptedVault");
    const blob = new Blob([encrypted], { type: "application/json" });
    return URL.createObjectURL(blob);
  },

  /**
   * Import and decrypt a vault file
   */
  importVault: async function (file, password) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const encryptedData = e.target.result;
          const decrypted = EncryptionService.decrypt(encryptedData, password);

          // Validate database structure
          if (!decrypted.sections || !decrypted.version) {
            throw new Error("Invalid vault format");
          }

          this.db = decrypted;
          this.password = password;
          await this.saveDB();
          resolve(true);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      reader.readAsText(file);
    });
  },

  /**
   * Generate a unique ID
   */
  generateID: function () {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },
};
