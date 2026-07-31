/**
 * ResuAI // Isolated Onboarding System Module
 * Object-oriented OnboardingManager for first-time user tour & step navigation
 */

class OnboardingManager {
  constructor(steps = [], options = {}) {
    this.steps = steps.length ? steps : OnboardingManager.getDefaultSteps();
    this.currentStepIndex = 0;
    this.storageKey = options.storageKey || 'resuai_onboarding_completed';
    this.onComplete = options.onComplete || null;
    this.overlayEl = null;
    this.cardEl = null;
    this.initialized = false;
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
    this.bindEvents();
    this.initialized = true;

    // Check if user is visiting for the first time
    if (!localStorage.getItem(this.storageKey)) {
      setTimeout(() => this.start(), 600);
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
