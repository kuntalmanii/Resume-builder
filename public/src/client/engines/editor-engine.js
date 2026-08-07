/**
 * ResuAI // Editor Engine Module (editor-engine.js)
 * Manages paper document inline editing, floating formatting toolbar,
 * section focus mode, and template design switching.
 *
 * NOTE: Uses modern Selection + Range APIs instead of the deprecated
 * document.execCommand() API for all rich-text formatting operations.
 */

/* ==========================================================================
   RichTextFormatter — Modern Selection/Range Formatting Engine
   Replaces deprecated document.execCommand('bold' | 'italic' | 'underline')
   ========================================================================== */
class RichTextFormatter {
  /**
   * Wraps the current user selection in a given inline HTML tag,
   * or unwraps it if the selection is already fully wrapped in that tag.
   * Uses the modern Selection + Range API (no execCommand).
   * @param {string} tagName - e.g. 'strong', 'em', 'u'
   */
  static toggleInlineFormat(tagName) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);

    // Check if the selection is already wrapped in this tag
    if (RichTextFormatter._isWrappedIn(range, tagName)) {
      RichTextFormatter._unwrap(range, tagName);
    } else {
      RichTextFormatter._wrap(range, tagName);
    }
  }

  /**
   * Checks if the entire range content is inside a given tag.
   * @param {Range} range
   * @param {string} tagName
   * @returns {boolean}
   */
  static _isWrappedIn(range, tagName) {
    let node = range.commonAncestorContainer;
    // Walk up from text node
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    while (node && node.isContentEditable === undefined) {
      if (node.nodeName.toLowerCase() === tagName.toLowerCase()) return true;
      node = node.parentNode;
    }
    return false;
  }

  /**
   * Wraps the selected range in a new element of tagName.
   * Handles partial-selection across multiple text nodes gracefully.
   * @param {Range} range
   * @param {string} tagName
   */
  static _wrap(range, tagName) {
    try {
      const wrapper = document.createElement(tagName);
      // surroundContents works only when the range does not partially contain nodes.
      // Use extractContents + wrap for robustness.
      const fragment = range.extractContents();
      wrapper.appendChild(fragment);
      range.insertNode(wrapper);

      // Re-select the newly wrapped content
      const selection = window.getSelection();
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(wrapper);
      selection.addRange(newRange);
    } catch (err) {
      console.warn('[EditorEngine] _wrap failed:', err);
    }
  }

  /**
   * Unwraps the innermost matching ancestor tag from the selection.
   * Replaces the tag with its child nodes in place.
   * @param {Range} range
   * @param {string} tagName
   */
  static _unwrap(range, tagName) {
    try {
      let node = range.commonAncestorContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;

      // Walk up to find the wrapping element
      let target = null;
      let cursor = node;
      while (cursor && cursor.isContentEditable === undefined) {
        if (cursor.nodeName.toLowerCase() === tagName.toLowerCase()) {
          target = cursor;
          break;
        }
        cursor = cursor.parentNode;
      }

      if (!target) return;

      const parent = target.parentNode;
      if (!parent) return;

      // Replace the wrapper element with its children
      while (target.firstChild) {
        parent.insertBefore(target.firstChild, target);
      }
      parent.removeChild(target);

      // Normalize to merge adjacent text nodes
      parent.normalize();
    } catch (err) {
      console.warn('[EditorEngine] _unwrap failed:', err);
    }
  }
}

/* ==========================================================================
   UndoRedoManager — Per-Element History Stack
   Replaces deprecated execCommand('undo') / execCommand('redo')
   ========================================================================== */
class UndoRedoManager {
  constructor() {
    // WeakMap<HTMLElement, { stack: string[], pointer: number }>
    this._histories = new WeakMap();
  }

  /**
   * Records the current innerHTML of a contenteditable element.
   * Call this before every mutation (on 'input' event).
   * @param {HTMLElement} el
   */
  record(el) {
    if (!el) return;
    if (!this._histories.has(el)) {
      this._histories.set(el, { stack: [el.innerHTML], pointer: 0 });
    }
    const hist = this._histories.get(el);
    // Discard any redo future if user typed something new
    hist.stack = hist.stack.slice(0, hist.pointer + 1);
    hist.stack.push(el.innerHTML);
    // Cap history at 100 snapshots to limit memory
    if (hist.stack.length > 100) {
      hist.stack.shift();
    } else {
      hist.pointer = hist.stack.length - 1;
    }
  }

  /**
   * Undoes the last change on a contenteditable element.
   * @param {HTMLElement} el
   */
  undo(el) {
    if (!el) return;
    const hist = this._histories.get(el);
    if (!hist || hist.pointer <= 0) return;
    hist.pointer--;
    el.innerHTML = hist.stack[hist.pointer];
  }

  /**
   * Redoes the last undone change on a contenteditable element.
   * @param {HTMLElement} el
   */
  redo(el) {
    if (!el) return;
    const hist = this._histories.get(el);
    if (!hist || hist.pointer >= hist.stack.length - 1) return;
    hist.pointer++;
    el.innerHTML = hist.stack[hist.pointer];
  }
}

class EditorEngine {
  constructor() {
    this.initialized = false;
    this.focusedSectionEl = null;
    /** @type {UndoRedoManager} */
    this._undoRedo = new UndoRedoManager();
  }

  init() {
    if (this.initialized) return;
    this.bindFormattingToolbar();
    this.bindSectionFocusMode();
    this.bindPaperFieldSync();
    this.initialized = true;
  }

  /* ------ Floating Formatting Toolbar Handlers ------ */
  bindFormattingToolbar() {
    const btnBold = document.getElementById('fmtBtnBold');
    const btnItalic = document.getElementById('fmtBtnItalic');
    const btnUnderline = document.getElementById('fmtBtnUnderline');
    const btnUndo = document.getElementById('fmtBtnUndo');
    const btnRedo = document.getElementById('fmtBtnRedo');

    if (btnBold) btnBold.addEventListener('click', () => this.execFormatting('bold'));
    if (btnItalic) btnItalic.addEventListener('click', () => this.execFormatting('italic'));
    if (btnUnderline) btnUnderline.addEventListener('click', () => this.execFormatting('underline'));
    if (btnUndo) btnUndo.addEventListener('click', () => this.execFormatting('undo'));
    if (btnRedo) btnRedo.addEventListener('click', () => this.execFormatting('redo'));

    // Formatting keyboard shortcuts: ⌘B, ⌘I, ⌘U, ⌘Z, ⌘⇧Z / ⌃Y
    document.addEventListener('keydown', (e) => {
      const isCmd = e.metaKey || e.ctrlKey;
      if (!isCmd) return;

      const activeEl = document.activeElement;
      if (!activeEl || !activeEl.isContentEditable) return;

      const key = e.key.toLowerCase();

      if (key === 'b') {
        e.preventDefault();
        this.execFormatting('bold');
      } else if (key === 'i') {
        e.preventDefault();
        this.execFormatting('italic');
      } else if (key === 'u') {
        e.preventDefault();
        this.execFormatting('underline');
      } else if (key === 'z' && !e.shiftKey) {
        // ⌘Z / Ctrl+Z — Undo
        e.preventDefault();
        this.execFormatting('undo');
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        // ⌘⇧Z / Ctrl+Y — Redo
        e.preventDefault();
        this.execFormatting('redo');
      }
    });
  }

  /**
   * Executes a rich-text formatting command using the modern Selection/Range
   * API. This fully replaces the deprecated document.execCommand() calls.
   *
   * Supported commands: 'bold', 'italic', 'underline', 'undo', 'redo'
   *
   * @param {string} command - The formatting command to execute.
   */
  execFormatting(command) {
    const activeEl = document.activeElement;

    switch (command) {
      case 'bold':
        RichTextFormatter.toggleInlineFormat('strong');
        break;

      case 'italic':
        RichTextFormatter.toggleInlineFormat('em');
        break;

      case 'underline':
        RichTextFormatter.toggleInlineFormat('u');
        break;

      case 'undo':
        // Undo on the currently focused contenteditable element
        if (activeEl && activeEl.isContentEditable) {
          this._undoRedo.undo(activeEl);
        }
        break;

      case 'redo':
        // Redo on the currently focused contenteditable element
        if (activeEl && activeEl.isContentEditable) {
          this._undoRedo.redo(activeEl);
        }
        break;

      default:
        console.warn(`[EditorEngine] Unknown formatting command: "${command}"`);
        break;
    }

    this.updatePreviewSilently();
  }

  /* ------ Section Focus Mode ------ */
  bindSectionFocusMode() {
    const editorBody = document.querySelector('.doc-editor-body');
    if (!editorBody) return;

    const sections = editorBody.querySelectorAll('.doc-section-block');
    sections.forEach(sec => {
      sec.addEventListener('focusin', () => {
        sections.forEach(s => s.classList.remove('is-focused'));
        sec.classList.add('is-focused');
        editorBody.classList.add('has-focused-section');
        this.focusedSectionEl = sec;
      });
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.doc-section-block') && !e.target.closest('.sticky-format-bar')) {
        sections.forEach(s => s.classList.remove('is-focused'));
        editorBody.classList.remove('has-focused-section');
        this.focusedSectionEl = null;
      }
    });
  }

  /* ------ Real-Time Input Field Validation ------ */
  validateField(el) {
    if (!el) return true;

    const val = (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')
      ? el.value.trim()
      : el.innerText.trim();

    const label = (el.getAttribute('aria-label') || el.getAttribute('data-placeholder') || el.placeholder || el.id || '').toLowerCase();

    let isValid = true;
    let errorMsg = '';

    if (label.includes('email')) {
      if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        isValid = false;
        errorMsg = 'Invalid email address format';
      }
    } else if (label.includes('phone')) {
      if (val && !/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]{6,15}$/.test(val)) {
        isValid = false;
        errorMsg = 'Invalid phone format (min 7 digits)';
      }
    } else if (label.includes('github') || label.includes('linkedin') || label.includes('portfolio') || label.includes('website')) {
      if (val && !/^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/.test(val)) {
        isValid = false;
        errorMsg = 'Invalid URL or web domain format';
      }
    } else if (label.includes('name') || el.id === 'docFieldName' || el.id === 'inputFullName') {
      if (val.length > 0 && val.length < 2) {
        isValid = false;
        errorMsg = 'Full name must be at least 2 characters';
      }
    } else if (label.includes('title') || el.id === 'docFieldTitle' || el.id === 'inputJobTitle') {
      if (val.length > 0 && val.length < 2) {
        isValid = false;
        errorMsg = 'Job title must be at least 2 characters';
      }
    }

    const parent = el.closest('.doc-contact-item') || el.parentNode;
    let tooltip = parent ? parent.querySelector('.field-validation-msg') : null;

    if (!isValid) {
      el.classList.add('field-invalid');
      el.classList.remove('field-valid');
      if (parent) {
        if (!tooltip) {
          tooltip = document.createElement('span');
          tooltip.className = 'field-validation-msg';
          parent.appendChild(tooltip);
        }
        tooltip.textContent = errorMsg;
        tooltip.style.display = 'block';
      }
    } else {
      el.classList.remove('field-invalid');
      if (val.length > 0) {
        el.classList.add('field-valid');
      } else {
        el.classList.remove('field-valid');
      }
      if (tooltip) {
        tooltip.style.display = 'none';
      }
    }

    return isValid;
  }

  /* ------ Paper Field Synchronization & Validation ------ */
  bindPaperFieldSync() {
    const fields = document.querySelectorAll('.doc-field[contenteditable="true"], .doc-contact-field[contenteditable="true"], .form-input, .form-textarea');
    fields.forEach(field => {
      // Record the initial state for contenteditable fields so undo works from page load
      if (field.isContentEditable) {
        this._undoRedo.record(field);
      }

      field.addEventListener('input', () => {
        // Record history snapshot for undo/redo on every change
        if (field.isContentEditable) {
          this._undoRedo.record(field);
        }

        const syncTargetId = field.getAttribute('data-syncs');
        if (syncTargetId) {
          const targetInput = document.getElementById(syncTargetId);
          if (targetInput) {
            targetInput.value = field.innerHTML;
          }
        }
        this.validateField(field);
        this.updatePreviewSilently();
      });

      field.addEventListener('blur', () => {
        this.validateField(field);
      });
    });
  }

  updatePreviewSilently() {
    if (typeof window.renderPaperPreview === 'function') {
      window.renderPaperPreview();
    }
  }

  /* ------ Template Design Token Switching ------ */
  setTemplateDesign(templateId) {
    const previewContainer = document.getElementById('paperPreviewContainer') || document.querySelector('.preview-paper-sheet');
    if (!previewContainer) return;

    previewContainer.classList.remove('template-faang', 'template-minimalist', 'template-classic');
    previewContainer.classList.add(`template-${templateId}`);
    localStorage.setItem('resuai_selected_template', templateId);
  }
}

// Global initialization
window.editorEngine = new EditorEngine();
document.addEventListener('DOMContentLoaded', () => window.editorEngine.init());
