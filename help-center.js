/**
 * ResuAI // Floating Help Center Module
 * FAB trigger, glassmorphic help drawer, live topic search, FAQ accordions & keyboard shortcuts modal
 */

class HelpCenter {
  constructor() {
    this.fabEl = null;
    this.drawerEl = null;
    this.shortcutsModalEl = null;
    this.isOpen = false;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.createDomElements();
    this.createShortcutsModalDom();
    this.bindEvents();
    this.initialized = true;
  }

  createDomElements() {
    if (document.getElementById('helpCenterFab')) return;

    // Floating Action Button
    const fab = document.createElement('button');
    fab.className = 'help-center-fab';
    fab.id = 'helpCenterFab';
    fab.setAttribute('aria-label', 'Open Help Center');
    fab.setAttribute('title', 'Help Center & Tutorials');
    fab.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    `;

    // Help Drawer
    const drawer = document.createElement('div');
    drawer.className = 'help-center-drawer';
    drawer.id = 'helpCenterDrawer';
    drawer.innerHTML = `
      <div class="help-drawer-header">
        <div class="help-header-top">
          <div class="help-header-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>ResuAI Help Center</span>
          </div>
          <button class="help-close-btn" id="btnHelpClose" aria-label="Close Help Drawer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="help-search-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" class="help-search-input" id="helpSearchInput" placeholder="Search guides, FAQs & shortcuts..." autocomplete="off" />
        </div>
      </div>

      <div class="help-drawer-body" id="helpDrawerBody">
        <!-- Quick Start -->
        <div class="help-section-label">Quick Start</div>
        <div class="help-topics-grid">
          <div class="help-topic-card" onclick="window.helpCenter.triggerTour()">
            <div class="help-topic-icon">🚀</div>
            <div class="help-topic-title">Interactive Tour</div>
          </div>
          <div class="help-topic-card" onclick="window.helpCenter.showShortcutsModal()">
            <div class="help-topic-icon">⌨️</div>
            <div class="help-topic-title">Shortcuts</div>
          </div>
        </div>

        <!-- Documentation Guides -->
        <div class="help-section-label">Feature Guides</div>
        <div class="help-topics-grid">
          <div class="help-topic-card" onclick="window.helpCenter.scrollToSection('.doc-editor-body')">
            <div class="help-topic-icon">📄</div>
            <div class="help-topic-title">Paper Builder</div>
          </div>
          <div class="help-topic-card" onclick="window.helpCenter.scrollToSection('.editor-right-panel')">
            <div class="help-topic-icon">📊</div>
            <div class="help-topic-title">ATS Analyzer</div>
          </div>
          <div class="help-topic-card" onclick="window.helpCenter.triggerExportPdf()">
            <div class="help-topic-icon">📥</div>
            <div class="help-topic-title">Export PDF</div>
          </div>
          <div class="help-topic-card" onclick="window.helpCenter.scrollToSection('[data-tab=\\'analytics\\']')">
            <div class="help-topic-icon">📈</div>
            <div class="help-topic-title">Analytics</div>
          </div>
        </div>

        <!-- Frequently Asked Questions -->
        <div class="help-section-label">Frequently Asked Questions</div>
        <div class="help-faq-list" id="helpFaqList">
          <div class="help-faq-item">
            <button class="help-faq-question">
              <span>How does Section Focus Mode work?</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="help-faq-answer">Clicking inside any section block highlights it with a blue focus accent and ambiently dims surrounding sections to 42% opacity for a distraction-free experience.</div>
          </div>
          <div class="help-faq-item">
            <div class="help-faq-question">
              <span>How do I transform bullets to Google XYZ?</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div class="help-faq-answer">Hover over Work Experience and click '✦ Convert to XYZ' or click any preset chip to structure your bullet into [Action Verb] + [Metric] + [Outcome].</div>
          </div>
          <div class="help-faq-item">
            <div class="help-faq-question">
              <span>Is my resume data private?</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div class="help-faq-answer">Yes! All edits are isolate-stored in your local browser storage. No candidate personal data is sent to external servers without consent.</div>
          </div>
          <div class="help-faq-item">
            <div class="help-faq-question">
              <span>How do I export 100% ATS-friendly PDF?</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            <div class="help-faq-answer">Click 'Download PDF' in the topbar. ResuAI generates pure text-selectable PDFs that pass ATS parsers with 98%+ keyword accuracy.</div>
          </div>
        </div>
      </div>

      <div class="help-drawer-footer">
        <button class="help-footer-btn" onclick="window.helpCenter.contactSupport()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Contact Support
        </button>
        <span style="font-size:11px;color:#94A3B8;">ResuAI v2.5</span>
      </div>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(drawer);

    this.fabEl = fab;
    this.drawerEl = drawer;
  }

  createShortcutsModalDom() {
    if (document.getElementById('helpShortcutsModal')) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'helpShortcutsModal';
    overlay.style.display = 'none';

    overlay.innerHTML = `
      <div class="modal-card glass-card shortcuts-modal-card">
        <div class="modal-header">
          <div class="modal-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 16h8"/></svg>
            <h3>Keyboard Shortcuts</h3>
          </div>
          <button class="modal-close-btn" onclick="document.getElementById('helpShortcutsModal').style.display='none'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="shortcuts-grid">
          <div class="shortcut-row"><span class="shortcut-label">Bold Selection</span><span class="kbd-badge"><kbd>⌘</kbd> + <kbd>B</kbd></span></div>
          <div class="shortcut-row"><span class="shortcut-label">Italicize Selection</span><span class="kbd-badge"><kbd>⌘</kbd> + <kbd>I</kbd></span></div>
          <div class="shortcut-row"><span class="shortcut-label">Underline Selection</span><span class="kbd-badge"><kbd>⌘</kbd> + <kbd>U</kbd></span></div>
          <div class="shortcut-row"><span class="shortcut-label">Undo Edit</span><span class="kbd-badge"><kbd>⌘</kbd> + <kbd>Z</kbd></span></div>
          <div class="shortcut-row"><span class="shortcut-label">AI Bullet Optimization</span><span class="kbd-badge"><kbd>✦</kbd> Hover Action</span></div>
          <div class="shortcut-row"><span class="shortcut-label">Close Modal / Drawer</span><span class="kbd-badge"><kbd>ESC</kbd></span></div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.shortcutsModalEl = overlay;
  }

  bindEvents() {
    if (this.fabEl) {
      this.fabEl.addEventListener('click', () => this.toggle());
    }

    const btnClose = this.drawerEl.querySelector('#btnHelpClose');
    if (btnClose) {
      btnClose.addEventListener('click', () => this.toggle(false));
    }

    const searchInput = this.drawerEl.querySelector('#helpSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.search(e.target.value));
    }

    // FAQ Accordion Toggles
    const faqItems = this.drawerEl.querySelectorAll('.help-faq-item');
    faqItems.forEach(item => {
      const q = item.querySelector('.help-faq-question');
      if (q) {
        q.addEventListener('click', () => {
          const isOpen = item.classList.contains('is-open');
          faqItems.forEach(i => i.classList.remove('is-open'));
          if (!isOpen) item.classList.add('is-open');
        });
      }
    });

    // ESC Key listener to close drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.toggle(false);
      }
    });
  }

  toggle(forceState) {
    this.isOpen = (forceState !== undefined) ? forceState : !this.isOpen;
    if (this.drawerEl) {
      this.drawerEl.classList.toggle('is-active', this.isOpen);
    }
    if (this.fabEl) {
      this.fabEl.classList.toggle('is-active', this.isOpen);
    }
  }

  search(query) {
    const q = query.trim().toLowerCase();
    const topicCards = this.drawerEl.querySelectorAll('.help-topic-card');
    const faqItems = this.drawerEl.querySelectorAll('.help-faq-item');

    topicCards.forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = (!q || text.includes(q)) ? 'flex' : 'none';
    });

    faqItems.forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = (!q || text.includes(q)) ? 'block' : 'none';
    });
  }

  triggerTour() {
    this.toggle(false);
    if (window.onboardingManager) {
      window.onboardingManager.startProductTour();
    }
  }

  showShortcutsModal() {
    this.toggle(false);
    if (this.shortcutsModalEl) {
      this.shortcutsModalEl.style.display = 'flex';
    }
  }

  scrollToSection(selector) {
    this.toggle(false);
    const target = document.querySelector(selector);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  triggerExportPdf() {
    this.toggle(false);
    const btn = document.getElementById('btnPrintPdf');
    if (btn) btn.click();
  }

  contactSupport() {
    this.toggle(false);
    alert('ResuAI Support: Email support@resuai.dev or launch AI Copilot for live assistance.');
  }
}

// Global initialization
window.HelpCenter = HelpCenter;

document.addEventListener('DOMContentLoaded', () => {
  if (!window.helpCenter) {
    window.helpCenter = new HelpCenter();
    window.helpCenter.init();
  }
});
