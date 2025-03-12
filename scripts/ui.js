const UIService = {
  currentSection: "docs",
  currentFile: null,

  /**
   * Initialize the UI
   */
  init: function () {
    // Authentication controls
    document
      .getElementById("unlock-btn")
      .addEventListener("click", this.unlockVault.bind(this));
    document
      .getElementById("create-vault-btn")
      .addEventListener("click", this.createVault.bind(this));
    document
      .getElementById("lock-btn")
      .addEventListener("click", this.lockVault.bind(this));
    document
      .getElementById("export-btn")
      .addEventListener("click", this.exportVault.bind(this));
    document.getElementById("import-btn").addEventListener("click", () => {
      document.getElementById("import-file").click();
    });
    document
      .getElementById("import-file")
      .addEventListener("change", this.importVault.bind(this));

    // Section tabs
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.switchSection(btn.dataset.section);
      });
    });

    // File operations
    document
      .getElementById("new-file-btn")
      .addEventListener("click", this.createNewFile.bind(this));
    document
      .getElementById("save-btn")
      .addEventListener("click", this.saveCurrentFile.bind(this));
    document
      .getElementById("delete-btn")
      .addEventListener("click", this.deleteCurrentFile.bind(this));

    // File upload for photos and files
    const dropArea = document.getElementById("drop-area");
    const fileInput = document.getElementById("file-input");

    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    ["dragenter", "dragover"].forEach((eventName) => {
      dropArea.addEventListener(eventName, highlight, false);
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
      dropArea.classList.add("highlight");
    }

    function unhighlight() {
      dropArea.classList.remove("highlight");
    }

    dropArea.addEventListener("drop", this.handleFileDrop.bind(this), false);
    fileInput.addEventListener("change", (e) => {
      this.handleFiles(e.target.files);
    });

    // Initialize Markdown editor
    if (
      !MarkdownService.editor &&
      document.getElementById("editor-container")
    ) {
      setTimeout(() => {
        const editorContainer = document.getElementById("editor-container");
        if (editorContainer) {
          MarkdownService.initEditor(editorContainer);
        }
      }, 100); // Small delay to ensure DOM is ready
    }
  },

  /**
   * Unlock the vault
   */
  async unlockVault() {
    const password = document.getElementById("password").value;
    if (!password) {
      alert("Please enter a password");
      return;
    }

    const success = await DatabaseService.unlockVault(password);
    if (success) {
      this.showMainContent();
      this.loadFiles();
    } else {
      alert("Failed to unlock vault. Incorrect password or corrupted data.");
    }
  },

  /**
   * Create a new vault
   */
  async createVault() {
    const password = document.getElementById("password").value;
    if (!password) {
      alert("Please enter a password for your new vault");
      return;
    }

    const confirmed = confirm(
      "This will create a new vault. Any existing vault will be overwritten. Continue?",
    );
    if (!confirmed) return;

    const success = await DatabaseService.createVault(password);
    if (success) {
      this.showMainContent();
      this.loadFiles();
    } else {
      alert("Failed to create vault");
    }
  },

  /**
   * Lock the vault
   */
  lockVault() {
    DatabaseService.lockVault();
    this.hideMainContent();
  },

  /**
   * Export the vault
   */
  exportVault() {
    try {
      const downloadUrl = DatabaseService.exportVault();
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `markdown-vault-${new Date().toISOString().split("T")[0]}.vault`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      alert("Failed to export vault: " + error.message);
    }
  },

  /**
   * Import a vault
   */
  async importVault(e) {
    const file = e.target.files[0];
    if (!file) return;

    const password = prompt("Enter the password for this vault:");
    if (!password) return;

    try {
      await DatabaseService.importVault(file, password);
      this.loadFiles();
      alert("Vault imported successfully");
    } catch (error) {
      alert("Failed to import vault: " + error.message);
    }

    // Reset the file input
    e.target.value = null;
  },

  /**
   * Show the main content area
   */
  showMainContent() {
    document.getElementById("not-logged-in").style.display = "none";
    document.getElementById("logged-in").style.display = "flex";
    document.getElementById("main-content").style.display = "flex";
    document.getElementById("password").value = "";
  },

  /**
   * Hide the main content area
   */
  hideMainContent() {
    document.getElementById("not-logged-in").style.display = "flex";
    document.getElementById("logged-in").style.display = "none";
    document.getElementById("main-content").style.display = "none";
  },

  /**
   * Switch between sections (docs, photos, files)
   */
  switchSection: function (section) {
    if (!["docs", "photos", "files"].includes(section)) {
      console.error("Invalid section:", section);
      return;
    }

    this.currentSection = section;

    // Update active tab
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      if (btn.dataset.section === section) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Show/hide appropriate sections
    const editorSection = document.getElementById("editor-section");
    const previewSection = document.getElementById("preview-section");
    const uploadSection = document.getElementById("upload-section");

    if (section === "docs") {
      editorSection.classList.remove("hidden");
      previewSection.classList.add("hidden");
      uploadSection.classList.add("hidden");

      // Re-initialize editor if needed
      if (
        !MarkdownService.editor &&
        document.getElementById("editor-container")
      ) {
        setTimeout(() => {
          MarkdownService.initEditor(
            document.getElementById("editor-container"),
          );
        }, 100);
      }
    } else {
      editorSection.classList.add("hidden");
      previewSection.classList.remove("hidden");
      uploadSection.classList.remove("hidden");
    }

    // Load files for section
    this.loadFiles();

    // Clear current file
    this.currentFile = null;
    document.getElementById("file-title").value = "";
    if (MarkdownService.editor) {
      MarkdownService.setContent("");
    }
  },

  /**
   * Load files for the current section
   */
  loadFiles() {
    try {
      const files = DatabaseService.getFiles(this.currentSection);
      const fileList = document.getElementById("file-list");
      fileList.innerHTML = "";

      files.forEach((file) => {
        const fileItem = document.createElement("div");
        fileItem.className = "file-item";
        fileItem.dataset.id = file.id;
        fileItem.textContent = file.title || "Untitled";

        fileItem.addEventListener("click", () => {
          this.openFile(file.id);
        });

        fileList.appendChild(fileItem);
      });
    } catch (error) {
      console.error("Error loading files:", error);
    }
  },

  /**
   * Open a file
   */
  async openFile(id) {
    try {
      const file = DatabaseService.getFile(this.currentSection, id);
      if (!file) {
        console.error("File not found:", id);
        return;
      }

      this.currentFile = file;

      // Update UI to show active file
      document.querySelectorAll(".file-item").forEach((item) => {
        if (item.dataset.id === id) {
          item.classList.add("active");
        } else {
          item.classList.remove("active");
        }
      });

      document.getElementById("file-title").value = file.title || "";

      if (this.currentSection === "docs") {
        MarkdownService.setContent(file.content || "");
      } else {
        // For photos and files
        const previewContent = document.getElementById("preview-content");

        if (file.type.startsWith("image/")) {
          previewContent.innerHTML = `
                        <h2>${file.title || "Untitled"}</h2>
                        <img src="${file.content}" alt="${file.title}" style="max-width: 100%;">
                    `;
        } else {
          previewContent.innerHTML = `
                        <h2>${file.title || "Untitled"}</h2>
                        <p>File type: ${file.type}</p>
                        <p>Size: ${this.formatFileSize(file.size)}</p>
                        <a href="${file.content}" download="${file.originalName || file.title}">Download File</a>
                    `;
        }
      }
    } catch (error) {
      console.error("Error opening file:", error);
    }
  },

  /**
   * Create a new file
   */
  createNewFile() {
    this.currentFile = {
      title: "Untitled",
      content: "",
      created: new Date().toISOString(),
    };

    document.getElementById("file-title").value = "Untitled";

    if (this.currentSection === "docs") {
      MarkdownService.setContent("");

      // Clear active class from other files
      document.querySelectorAll(".file-item").forEach((item) => {
        item.classList.remove("active");
      });
    } else {
      // For photos and files, focus the file input
      document.getElementById("file-input").click();
    }
  },

  /**
   * Save the current file
   */
  async saveCurrentFile() {
    if (!this.currentFile) {
      alert("No file is currently open");
      return;
    }

    try {
      const title = document.getElementById("file-title").value || "Untitled";

      let content;
      if (this.currentSection === "docs") {
        content = MarkdownService.getContent();
      } else {
        content = this.currentFile.content;
      }

      const fileData = {
        ...this.currentFile,
        title,
        content,
        lastModified: new Date().toISOString(),
      };

      const id = await DatabaseService.saveFile(this.currentSection, fileData);

      // Update current file with saved ID
      this.currentFile.id = id;

      // Refresh file list
      this.loadFiles();

      // Select the saved file
      setTimeout(() => {
        this.openFile(id);
      }, 100);
    } catch (error) {
      console.error("Error saving file:", error);
      alert("Failed to save file: " + error.message);
    }
  },

  /**
   * Delete the current file
   */
  async deleteCurrentFile() {
    if (!this.currentFile || !this.currentFile.id) {
      alert("No file is currently open");
      return;
    }

    const confirmed = confirm("Are you sure you want to delete this file?");
    if (!confirmed) return;

    try {
      await DatabaseService.deleteFile(
        this.currentSection,
        this.currentFile.id,
      );

      // Clear current file
      this.currentFile = null;
      document.getElementById("file-title").value = "";

      if (this.currentSection === "docs") {
        MarkdownService.setContent("");
      } else {
        document.getElementById("preview-content").innerHTML = "";
      }

      // Refresh file list
      this.loadFiles();
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Failed to delete file: " + error.message);
    }
  },

  /**
   * Handle file drop for uploads
   */
  handleFileDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    this.handleFiles(files);
  },

  /**
   * Process uploaded files
   */
  async handleFiles(files) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        // Convert file to Base64
        const base64Content = await EncryptionService.fileToBase64(file);

        // Create file object
        const fileData = {
          title: file.name,
          originalName: file.name,
          type: file.type,
          size: file.size,
          content: base64Content,
          created: new Date().toISOString(),
          lastModified: new Date().toISOString(),
        };

        // Determine section based on file type
        let targetSection = this.currentSection;
        if (this.currentSection === "docs") {
          // If in docs section but uploading non-text files, put them in the appropriate section
          if (file.type.startsWith("image/")) {
            targetSection = "photos";
          } else if (!file.type.includes("text/")) {
            targetSection = "files";
          } else if (!file.type.includes("text/")) {
            targetSection = "files";
          }
        }

        // Save the file
        const id = await DatabaseService.saveFile(targetSection, fileData);

        // If we're in the correct section, refresh and open
        if (targetSection === this.currentSection) {
          this.loadFiles();
          this.openFile(id);
        } else {
          // Let the user know we saved it to a different section
          alert(`File saved to ${targetSection} section`);
        }
      } catch (error) {
        console.error("Error processing file:", error);
        alert("Failed to process file: " + error.message);
      }
    }
  },

  /**
   * Format file size in human-readable format
   */
  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  },
};
