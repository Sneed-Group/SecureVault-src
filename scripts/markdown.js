// kryptor/scripts/markdown.js - Updated version
const MarkdownService = {
  editor: null,

  /**
   * Initialize the markdown editor
   */
  initEditor: function (element) {
    if (!element) {
      console.error("Element for editor initialization is missing");
      return null;
    }

    try {
      this.editor = new EasyMDE({
        element: element,
        spellChecker: false,
        autofocus: true,
        toolbar: [
          "bold",
          "italic",
          "heading",
          "|",
          "quote",
          "unordered-list",
          "ordered-list",
          "|",
          "link",
          "image",
          "|",
          "preview",
          "side-by-side",
          "fullscreen",
          "|",
          "guide",
        ],
        placeholder: "Write something amazing...",
        status: ["lines", "words", "cursor"],
      });

      return this.editor;
    } catch (error) {
      console.error("Error initializing Markdown editor:", error);
      return null;
    }
  },

  /**
   * Get content from the editor
   */
  getContent: function () {
    return this.editor ? this.editor.value() : "";
  },

  /**
   * Set content in the editor
   */
  setContent: function (content) {
    if (this.editor) {
      this.editor.value(content || "");
    }
  },

  /**
   * Render markdown as HTML
   */
  renderMarkdown: function (markdown) {
    return marked.parse(markdown || "");
  },
};
