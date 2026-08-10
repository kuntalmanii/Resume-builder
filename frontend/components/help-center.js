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

  static getKnowledgeBase() {
    return [
      {
        id: 'getting-started',
        title: '🚀 Getting Started',
        articles: [
          { q: 'What is ResuAI Studio?', a: 'ResuAI Studio is an AI-powered developer resume builder and ATS diagnostic engine built to help software engineers format high-impact resumes and beat corporate ATS parsers with 98%+ keyword accuracy.' },
          { q: 'How do I complete setup?', a: 'Fill out your document details on the floating paper canvas, verify your target role keywords, and run a 1-Click ATS scan to achieve 90%+ recruiter pass readiness.' }
        ]
      },
      {
        id: 'resume-builder',
        title: '📄 Resume Builder',
        articles: [
          { q: 'How does paper inline editing work?', a: 'Your resume is rendered as a physical white floating paper sheet (#FFFFFF). Click any text element directly on the document paper sheet to edit text, experience bullets, and skills without clunky form inputs.' },
          { q: 'What is Section Focus Mode?', a: 'Clicking inside any section highlights it with a blue focus accent line and ambiently dims surrounding sections to 42% opacity for a distraction-free editing experience.' }
        ]
      },
      {
        id: 'ats-analyzer',
        title: '📊 ATS Analyzer',
        articles: [
          { q: 'How does real-time ATS scoring work?', a: 'Our Gemini 2.5 AI engine analyzes your candidate resume against target job description requirements, highlighting missing tech stack skills and computing an overall ATS pass score.' },
          { q: 'What is a good ATS score?', a: 'Target an ATS match score of 85%+ for corporate applications and 92%+ for FAANG tier software engineering roles.' }
        ]
      },
      {
        id: 'templates',
        title: '🎨 Templates',
        articles: [
          { q: 'Which resume templates pass ATS parsers?', a: 'All ResuAI templates (FAANG Executive, Modern Minimalist, and Engineering Classic) follow strict 1-column single-flow typography rules guaranteed to parse perfectly in Taleo, Workday, and Greenhouse.' },
          { q: 'Can I switch templates dynamically?', a: 'Yes! Select any template design token from the top bar to reformat your document instantaneously.' }
        ]
      },
      {
        id: 'job-tracker',
        title: '💼 Job Tracker',
        articles: [
          { q: 'How do I organize application stages?', a: 'Drag and drop application cards across Wishlist, Applied, Interviewing, Offer, and Rejected Kanban columns to track your job search pipeline.' },
          { q: 'Can I link ATS scores to job cards?', a: 'Yes! Run an ATS scan on any job card to attach target JD keywords and match percentage directly to the application.' }
        ]
      },
      {
        id: 'analytics',
        title: '📈 Analytics',
        articles: [
          { q: 'What metrics are tracked in Analytics?', a: 'Score progression line charts, keyword density percentages, gap resolution rates, and FAANG competitive benchmark scores over time.' },
          { q: 'How is keyword density calculated?', a: 'We measure exact skill frequency against industry standards for your selected software engineering domain.' }
        ]
      },
      {
        id: 'export-pdf',
        title: '📥 Export PDF',
        articles: [
          { q: 'How do I generate an ATS-compliant PDF?', a: 'Click "Export PDF" in the topbar or Command Palette (⌘P). ResuAI generates crisp, text-selectable vector PDFs without rasterization artifacts.' },
          { q: 'Why is my PDF page count splitting?', a: 'ResuAI automatically applies print page-break boundaries to prevent trailing single lines at page breaks.' }
        ]
      },
      {
        id: 'faq',
        title: '❓ Frequently Asked Questions',
        articles: [
          { q: 'Is ResuAI free to use?', a: 'Yes! ResuAI provides complete local document creation, ATS analysis, and PDF exporting free of charge.' },
          { q: 'Does ResuAI support custom sections?', a: 'Yes! Add custom sections for Open Source Contributions, Patents, Publications, and Speaking Engagements.' }
        ]
      },
      {
        id: 'shortcuts',
        title: '⌨️ Keyboard Shortcuts',
        articles: [
          { q: 'What is the Command Palette shortcut?', a: 'Press ⌘ + K (macOS) or Ctrl + K (Windows) to open the Command Palette.' },
          { q: 'What formatting shortcuts are supported?', a: '⌘B for Bold, ⌘I for Italic, ⌘U for Underline, ⌘Z for Undo, and ESC to close overlays.' }
        ]
      },
      {
        id: 'support',
        title: '💬 Contact & Support',
        articles: [
          { q: 'How do I get human developer support?', a: 'Email support@resuai.dev or launch the AI Copilot for live assistance with resume structuring.' },
          { q: 'How do I report a bug?', a: 'Email support@resuai.dev to submit logs directly to our core engineering team.' }
        ]
      }
    ];
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
            <span>ResuAI Knowledge Base</span>
          </div>
          <button class="help-close-btn" id="btnHelpClose" aria-label="Close Help Drawer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="help-search-wrapper">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" class="help-search-input" id="helpSearchInput" placeholder="Search 11 documentation sections & FAQs..." autocomplete="off" />
        </div>
      </div>

      <div class="help-category-pills" id="helpCategoryPills">
        <span class="help-pill is-active" data-cat="all">All Sections</span>
        ${HelpCenter.getKnowledgeBase().map(sec => `<span class="help-pill" data-cat="${sec.id}">${sec.title.split(' ')[1] || sec.title}</span>`).join('')}
      </div>

      <div class="help-drawer-body" id="helpDrawerBody">
        ${this.renderKnowledgeBaseHtml()}
      </div>

      <div class="help-drawer-footer">
        <button class="help-footer-btn" onclick="window.helpCenter.contactSupport()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Contact Support
        </button>
        <span style="font-size:11px;color:#94A3B8;">ResuAI v2.5 Docs</span>
      </div>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(drawer);

    this.fabEl = fab;
    this.drawerEl = drawer;

    // Restore persistent search query if present
    const savedQuery = localStorage.getItem('resuai_help_search');
    if (savedQuery) {
      const searchInput = drawer.querySelector('#helpSearchInput');
      if (searchInput) {
        searchInput.value = savedQuery;
        setTimeout(() => this.search(savedQuery), 100);
      }
    }
  }

  /**
   * Builds the keyboard shortcuts modal DOM and appends it to <body>.
   * Called once during init(). Fixes: TypeError this.createShortcutsModalDom is not a function.
   */
  createShortcutsModalDom() {
    if (document.getElementById('shortcutsModal')) {
      this.shortcutsModalEl = document.getElementById('shortcutsModal');
      return;
    }

    const shortcuts = [
      { keys: ['⌘', 'K'],        label: 'Open Command Palette' },
      { keys: ['⌘', 'P'],        label: 'Export PDF' },
      { keys: ['⌘', 'S'],        label: 'Save Draft' },
      { keys: ['⌘', 'Z'],        label: 'Undo' },
      { keys: ['⌘', '⇧', 'Z'],   label: 'Redo' },
      { keys: ['⌘', 'B'],        label: 'Bold' },
      { keys: ['⌘', 'I'],        label: 'Italic' },
      { keys: ['⌘', 'U'],        label: 'Underline' },
      { keys: ['ESC'],           label: 'Close overlay / drawer' },
      { keys: ['?'],             label: 'Open Help Center' },
    ];

    const rows = shortcuts.map(s => {
      const keysHtml = s.keys.map(k => `<kbd>${k}</kbd>`).join('<span style="margin:0 3px;color:#94A3B8;">+</span>');
      return `
        <div class="shortcuts-modal-row">
          <span class="shortcuts-modal-label">${s.label}</span>
          <span class="shortcuts-modal-keys">${keysHtml}</span>
        </div>`;
    }).join('');

    const modal = document.createElement('div');
    modal.id = 'shortcutsModal';
    modal.className = 'shortcuts-modal-overlay';
    modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);align-items:center;justify-content:center;';
    modal.innerHTML = `
      <div class="shortcuts-modal-card" style="background:var(--surface-card,#1E293B);border:1px solid var(--border-subtle,rgba(255,255,255,0.08));border-radius:16px;padding:28px 32px;min-width:380px;max-width:480px;box-shadow:0 24px 64px rgba(0,0,0,0.4);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
          <h3 style="font-family:var(--font-heading,'Inter');font-size:16px;font-weight:700;color:var(--text-primary,'#F8FAFC');margin:0;">⌨️ Keyboard Shortcuts</h3>
          <button id="btnShortcutsClose" aria-label="Close shortcuts" style="background:none;border:none;cursor:pointer;color:var(--text-muted,'#94A3B8');padding:4px;line-height:1;font-size:18px;">✕</button>
        </div>
        <div class="shortcuts-modal-body" style="display:flex;flex-direction:column;gap:10px;">
          ${rows}
        </div>
        <p style="margin:16px 0 0;font-size:11px;color:var(--text-muted,'#94A3B8');text-align:center;">Press <kbd style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:4px;padding:1px 5px;font-size:10px;">ESC</kbd> to close</p>
      </div>
    `;

    document.body.appendChild(modal);
    this.shortcutsModalEl = modal;

    // Close on overlay click or close button
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.shortcutsModalEl.style.display = 'none';
    });
    const closeBtn = modal.querySelector('#btnShortcutsClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => { this.shortcutsModalEl.style.display = 'none'; });
    }

    // Inject minimal inline styles for rows/keys (avoids needing a new CSS file)
    if (!document.getElementById('shortcutsModalStyle')) {
      const style = document.createElement('style');
      style.id = 'shortcutsModalStyle';
      style.textContent = `
        .shortcuts-modal-row { display:flex; align-items:center; justify-content:space-between; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05); }
        .shortcuts-modal-row:last-child { border-bottom:none; }
        .shortcuts-modal-label { font-size:13px; color:var(--text-secondary,#CBD5E1); }
        .shortcuts-modal-keys { display:flex; align-items:center; gap:2px; }
        .shortcuts-modal-keys kbd { background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.14); border-radius:5px; padding:2px 7px; font-size:11px; color:var(--text-primary,#F8FAFC); font-family:monospace; }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Toggles the help drawer open/closed.
   * @param {boolean|undefined} forceState - If boolean, forces open (true) or closed (false).
   */
  toggle(forceState) {
    const shouldOpen = typeof forceState === 'boolean' ? forceState : !this.isOpen;
    this.isOpen = shouldOpen;
    if (this.drawerEl) {
      this.drawerEl.classList.toggle('is-active', shouldOpen);
      this.drawerEl.classList.toggle('is-open', shouldOpen);
    }
    if (this.fabEl) {
      this.fabEl.classList.toggle('is-active', shouldOpen);
    }
  }

  renderKnowledgeBaseHtml(filterQuery = '', activeCat = 'all') {
    const kb = HelpCenter.getKnowledgeBase();
    const q = filterQuery.trim().toLowerCase();

    let html = '';

    kb.forEach(section => {
      if (activeCat !== 'all' && section.id !== activeCat) return;

      const matchingArticles = section.articles.filter(art =>
        !q || art.q.toLowerCase().includes(q) || art.a.toLowerCase().includes(q) || section.title.toLowerCase().includes(q)
      );

      if (matchingArticles.length > 0) {
        html += `<div class="help-section-label" data-cat-section="${section.id}">${section.title}</div>`;
        html += `<div class="help-accordion-wrapper" data-cat-section="${section.id}">`;
        matchingArticles.forEach(art => {
          html += `
            <div class="help-accordion-item">
              <button class="help-accordion-header">
                <span>${art.q}</span>
                <svg class="help-accordion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="help-accordion-content">
                ${art.a}
              </div>
            </div>
          `;
        });
        html += `</div>`;
      }
    });

    return html || `<div class="command-empty-state">No documentation articles found matching "${filterQuery}".</div>`;
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
      searchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        localStorage.setItem('resuai_help_search', val);
        this.search(val);
      });
    }

    // Category pills listener
    const pills = this.drawerEl.querySelectorAll('.help-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('is-active'));
        pill.classList.add('is-active');
        const cat = pill.getAttribute('data-cat');
        const searchVal = this.drawerEl.querySelector('#helpSearchInput')?.value || '';
        const bodyEl = this.drawerEl.querySelector('#helpDrawerBody');
        if (bodyEl) {
          bodyEl.innerHTML = this.renderKnowledgeBaseHtml(searchVal, cat);
          this.bindAccordionToggles();
        }
      });
    });

    this.bindAccordionToggles();

    // ESC Key listener to close drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.toggle(false);
      }
    });
  }

  bindAccordionToggles() {
    const items = this.drawerEl.querySelectorAll('.help-accordion-item');
    items.forEach(item => {
      const btn = item.querySelector('.help-accordion-header');
      if (btn) {
        btn.onclick = () => {
          const isOpen = item.classList.contains('is-open');
          items.forEach(i => i.classList.remove('is-open'));
          if (!isOpen) item.classList.add('is-open');
        };
      }
    });
  }

  search(query) {
    const bodyEl = this.drawerEl.querySelector('#helpDrawerBody');
    const activePill = this.drawerEl.querySelector('.help-pill.is-active');
    const activeCat = activePill ? activePill.getAttribute('data-cat') : 'all';
    if (bodyEl) {
      bodyEl.innerHTML = this.renderKnowledgeBaseHtml(query, activeCat);
      this.bindAccordionToggles();
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
