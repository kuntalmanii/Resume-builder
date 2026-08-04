/**
 * ResuAI // Editor Engine Module (editor-engine.js)
 * Manages paper document inline editing, floating formatting toolbar,
 * section focus mode, and template design switching.
 */

class EditorEngine {
  constructor() {
    this.initialized = false;
    this.focusedSectionEl = null;
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

    // Formatting keyboard shortcuts: ⌘B, ⌘I, ⌘U, ⌘Z
    document.addEventListener('keydown', (e) => {
      const isCmd = e.metaKey || e.ctrlKey;
      if (!isCmd) return;

      const activeEl = document.activeElement;
      if (!activeEl || !activeEl.isContentEditable) return;

      if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        this.execFormatting('bold');
      } else if (e.key.toLowerCase() === 'i') {
        e.preventDefault();
        this.execFormatting('italic');
      } else if (e.key.toLowerCase() === 'u') {
        e.preventDefault();
        this.execFormatting('underline');
      } else if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.execFormatting('undo');
      }
    });
  }

  execFormatting(command, value = null) {
    document.execCommand(command, false, value);
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
      field.addEventListener('input', () => {
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
