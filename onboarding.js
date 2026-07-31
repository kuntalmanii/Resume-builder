/**
 * ResuAI // Isolated Onboarding System Module
 * Object-oriented OnboardingManager for first-time user tour & step navigation
 */

class OnboardingManager {
  constructor(steps = [], options = {}) {
    this.steps = steps.length ? steps : OnboardingManager.getDefaultSteps();
    this.currentStepIndex = 0;
    this.storageKey = options.storageKey || 'resuai_onboarding_completed';
    this.welcomeStorageKey = options.welcomeStorageKey || 'resuai_welcome_modal_seen';
    this.onComplete = options.onComplete || null;
    this.overlayEl = null;
    this.cardEl = null;
    this.welcomeOverlayEl = null;
    this.initialized = false;
    this.welcomeKeyHandler = null;
  }

  static getDefaultSteps() {
    return [
      {
        icon: '📄',
        badgeBg: '#EFF6FF',
        badgeColor: '#2563EB',
        title: '1. Real Floating Paper Document',
        desc: 'Your resume is rendered as a physical floating paper sheet (#FFFFFF) over a warm studio canvas. Edit text inline directly on the paper — no clunky form inputs.'
      },
      {
        icon: '🎛️',
        badgeBg: '#F0FDF4',
        badgeColor: '#16A34A',
        title: '2. Sticky Glass Formatting Toolbar',
        desc: 'The formatting bar floats at the top of the editor. Use it for instant Bold, Italic, Bullet lists, Undo/Redo, and 1-Click AI Auto-Optimize without losing your place.'
      },
      {
        icon: '🎯',
        badgeBg: '#FAF5FF',
        badgeColor: '#9333EA',
        title: '3. Section Focus Mode',
        desc: 'Clicking into any section highlights it with a blue accent line and ambiently dims surrounding sections to 42% opacity for a distraction-free experience.'
      },
      {
        icon: '✦',
        badgeBg: '#FFF7ED',
        badgeColor: '#EA580C',
        title: '4. Context-Aware AI Action Bars',
        desc: 'Hover over any section to reveal custom AI tools: Executive Summary, XYZ Experience Bullets, AI Skill Suggestions, and ATS Formatting.'
      },
      {
        icon: '⚡',
        badgeBg: '#FEF2F2',
        badgeColor: '#DC2626',
        title: '5. Google XYZ Impact & ATS Diagnostics',
        desc: 'Format experience bullets into high-impact [Action Verb] + [Metric] + [Outcome] formulas and track your live ATS score in real time.'
      }
    ];
  }

  init() {
    if (this.initialized) return;
    this.createDomElements();
    this.createWelcomeDomElements();
    this.bindEvents();
    this.initialized = true;

    // Show Welcome Modal for first-time visitors
    if (!localStorage.getItem(this.welcomeStorageKey)) {
      setTimeout(() => this.showWelcomeModal(), 400);
    }
  }

  createWelcomeDomElements() {
    if (document.getElementById('resuaiWelcomeOverlay')) {
      this.welcomeOverlayEl = document.getElementById('resuaiWelcomeOverlay');
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'resuai-welcome-overlay';
    overlay.id = 'resuaiWelcomeOverlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'welcomeModalTitle');
    overlay.setAttribute('aria-hidden', 'true');

    overlay.innerHTML = `
      <div class="resuai-welcome-card" id="resuaiWelcomeCard">
        <div class="welcome-badge-row">
          <div class="welcome-logo-badge">
            <div class="welcome-logo-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
            <span>ResuAI Studio</span>
          </div>
          <div class="welcome-setup-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>Estimated setup: 2 Minutes</span>
          </div>
        </div>

        <div class="welcome-title-group">
          <h2 id="welcomeModalTitle">Welcome to ResuAI</h2>
          <p>The AI-powered developer resume studio built for high-impact software engineers.</p>
        </div>

        <div class="welcome-features-list">
          <div class="welcome-feature-item">
            <div class="welcome-feature-icon">📄</div>
            <div class="welcome-feature-text">
              <h4>Build professional resumes</h4>
              <p>Direct inline editing on physical paper with instant FAANG level formatting.</p>
            </div>
          </div>
          <div class="welcome-feature-item">
            <div class="welcome-feature-icon">📊</div>
            <div class="welcome-feature-text">
              <h4>Analyze ATS scores</h4>
              <p>Real-time 98%+ ATS parser match diagnostic engine powered by Gemini AI.</p>
            </div>
          </div>
          <div class="welcome-feature-item">
            <div class="welcome-feature-icon">💼</div>
            <div class="welcome-feature-text">
              <h4>Track job applications</h4>
              <p>Integrated career pipeline manager with Kanban board and application tracking.</p>
            </div>
          </div>
        </div>

        <div class="welcome-actions">
          <button class="welcome-btn welcome-btn-secondary" id="btnWelcomeSkip">Skip</button>
          <button class="welcome-btn welcome-btn-primary" id="btnWelcomeStart">
            <span>Start Tour</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.welcomeOverlayEl = overlay;
  }

  showWelcomeModal() {
    if (!this.welcomeOverlayEl) return;
    this.welcomeOverlayEl.classList.add('is-active');
    this.welcomeOverlayEl.setAttribute('aria-hidden', 'false');

    const btnStart = this.welcomeOverlayEl.querySelector('#btnWelcomeStart');
    if (btnStart) btnStart.focus();

    this.setupWelcomeKeyboardAndFocusTrap();
  }

  setupWelcomeKeyboardAndFocusTrap() {
    if (this.welcomeKeyHandler) {
      document.removeEventListener('keydown', this.welcomeKeyHandler);
    }

    this.welcomeKeyHandler = (e) => {
      if (!this.welcomeOverlayEl || !this.welcomeOverlayEl.classList.contains('is-active')) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        this.skipWelcome();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.startWelcomeTour();
      } else if (e.key === 'Tab') {
        const focusables = this.welcomeOverlayEl.querySelectorAll('#btnWelcomeStart, #btnWelcomeSkip');
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', this.welcomeKeyHandler);
  }

  startWelcomeTour() {
    localStorage.setItem(this.welcomeStorageKey, 'true');
    this.hideWelcomeModal();
    this.start();
  }

  skipWelcome() {
    localStorage.setItem(this.welcomeStorageKey, 'true');
    this.hideWelcomeModal();
  }

  hideWelcomeModal() {
    if (this.welcomeOverlayEl) {
      this.welcomeOverlayEl.classList.remove('is-active');
      this.welcomeOverlayEl.setAttribute('aria-hidden', 'true');
    }
    if (this.welcomeKeyHandler) {
      document.removeEventListener('keydown', this.welcomeKeyHandler);
    }
  }

  createDomElements() {
    if (document.getElementById('resuaiOnboardingOverlay')) {
      this.overlayEl = document.getElementById('resuaiOnboardingOverlay');
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'resuai-onboarding-overlay';
    overlay.id = 'resuaiOnboardingOverlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-hidden', 'true');

    overlay.innerHTML = `
      <div class="resuai-onboarding-card" id="resuaiOnboardingCard">
        <div class="onboarding-header">
          <div class="onboarding-brand">
            <div class="onboarding-icon-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
            <div class="onboarding-title-text">
              <h3>AI Studio Quick Guide</h3>
              <span>Master the resume document editor in 60 seconds</span>
            </div>
          </div>
          <button class="onboarding-close-btn" id="btnOnboardingClose" aria-label="Close Onboarding">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="onboarding-slide-body" id="onboardingSlideBody"></div>

        <div class="onboarding-footer">
          <div class="onboarding-dots" id="onboardingDotsWrapper"></div>
          <div class="onboarding-actions">
            <button class="onboarding-btn onboarding-btn-secondary" id="btnOnboardingPrev" style="display:none;">Back</button>
            <button class="onboarding-btn onboarding-btn-primary" id="btnOnboardingNext">Next →</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlayEl = overlay;
    this.cardEl = overlay.querySelector('#resuaiOnboardingCard');
  }

  bindEvents() {
    const btnClose = this.overlayEl.querySelector('#btnOnboardingClose');
    const btnNext = this.overlayEl.querySelector('#btnOnboardingNext');
    const btnPrev = this.overlayEl.querySelector('#btnOnboardingPrev');

    if (btnClose) btnClose.addEventListener('click', () => this.finish());
    if (btnNext) btnNext.addEventListener('click', () => this.nextStep());
    if (btnPrev) btnPrev.addEventListener('click', () => this.previousStep());

    this.overlayEl.addEventListener('click', (e) => {
      if (e.target === this.overlayEl) this.finish();
    });

    if (this.welcomeOverlayEl) {
      const btnStart = this.welcomeOverlayEl.querySelector('#btnWelcomeStart');
      const btnSkip = this.welcomeOverlayEl.querySelector('#btnWelcomeSkip');

      if (btnStart) btnStart.addEventListener('click', () => this.startWelcomeTour());
      if (btnSkip) btnSkip.addEventListener('click', () => this.skipWelcome());

      this.welcomeOverlayEl.addEventListener('click', (e) => {
        if (e.target === this.welcomeOverlayEl) this.skipWelcome();
      });
    }
  }

  start() {
    this.currentStepIndex = 0;
    this.renderCurrentStep();
    if (this.overlayEl) {
      this.overlayEl.classList.add('is-active');
      this.overlayEl.setAttribute('aria-hidden', 'false');
    }
  }

  nextStep() {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      this.renderCurrentStep();
    } else {
      this.finish();
    }
  }

  previousStep() {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.renderCurrentStep();
    }
  }

  renderCurrentStep() {
    const step = this.steps[this.currentStepIndex];
    if (!step) return;

    const bodyEl = this.overlayEl.querySelector('#onboardingSlideBody');
    if (bodyEl) {
      bodyEl.innerHTML = `
        <div class="onboarding-icon-badge" style="background:${step.badgeBg};color:${step.badgeColor};">${step.icon}</div>
        <h4 class="onboarding-step-title">${step.title}</h4>
        <p class="onboarding-step-desc">${step.desc}</p>
      `;
    }

    const dotsWrapper = this.overlayEl.querySelector('#onboardingDotsWrapper');
    if (dotsWrapper) {
      dotsWrapper.innerHTML = this.steps.map((_, idx) => `
        <span class="onboarding-dot ${idx === this.currentStepIndex ? 'is-active' : ''}" data-step="${idx}"></span>
      `).join('');

      dotsWrapper.querySelectorAll('.onboarding-dot').forEach(dot => {
        dot.addEventListener('click', (e) => {
          const targetStep = parseInt(e.target.getAttribute('data-step'));
          if (!isNaN(targetStep)) {
            this.currentStepIndex = targetStep;
            this.renderCurrentStep();
          }
        });
      });
    }

    const btnPrev = this.overlayEl.querySelector('#btnOnboardingPrev');
    const btnNext = this.overlayEl.querySelector('#btnOnboardingNext');
    if (btnPrev) btnPrev.style.display = (this.currentStepIndex > 0) ? 'inline-flex' : 'none';
    if (btnNext) btnNext.textContent = (this.currentStepIndex === this.steps.length - 1) ? 'Get Started 🚀' : 'Next →';
  }

  finish() {
    localStorage.setItem(this.storageKey, 'true');
    if (this.overlayEl) {
      this.overlayEl.classList.remove('is-active');
      this.overlayEl.setAttribute('aria-hidden', 'true');
    }
    if (typeof this.onComplete === 'function') {
      this.onComplete();
    }
  }

  reset() {
    localStorage.removeItem(this.storageKey);
    this.start();
  }
}

// Global initialization
window.OnboardingManager = OnboardingManager;

document.addEventListener('DOMContentLoaded', () => {
  if (!window.onboardingManager) {
    window.onboardingManager = new OnboardingManager();
    window.onboardingManager.init();
  }
});
