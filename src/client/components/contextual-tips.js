/**
 * ResuAI // Smart Contextual Tips Module
 * Non-intrusive bottom-left floating tip cards displayed on first-time feature visits
 */

class ContextualTipManager {
  constructor(tipsConfig = {}) {
    this.tips = Object.keys(tipsConfig).length ? tipsConfig : ContextualTipManager.getDefaultTips();
    this.activeTipEl = null;
    this.currentTabId = null;
    this.initialized = false;
  }

  static getDefaultTips() {
    return {
      'resume-builder': {
        icon: '📄',
        text: 'Fill out the document editor on the left. The live preview paper sheet updates automatically in real-time!'
      },
      'ats-analyzer': {
        icon: '📊',
        text: 'Upload or paste your resume to receive an instant ATS score breakdown and targeted keyword suggestions.'
      },
      'analytics': {
        icon: '📈',
        text: 'Track score improvements, keyword density metrics, and competitive FAANG benchmarks over time.'
      },
      'job-tracker': {
        icon: '💼',
        text: 'Monitor every job application from Wishlist to Offer stage in one interactive dashboard.'
      }
    };
  }

  init() {
    if (this.initialized) return;
    this.bindTabClickListeners();
    this.initialized = true;

    // Show tip for default tab after render — only if the user is already logged in.
    // Fixes: Pro Tip card rendering over the auth/login screen on first load.
    setTimeout(() => {
      const authContainer = document.getElementById('authContainer');
      const isAuthVisible = authContainer && authContainer.style.display !== 'none';
      if (!isAuthVisible) {
        this.showTipForTab('resume-builder');
      }
    }, 1200);

  }

  bindTabClickListeners() {
    document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
      item.addEventListener('click', (e) => {
        const tabId = item.getAttribute('data-tab');
        if (tabId) {
          setTimeout(() => this.showTipForTab(tabId), 300);
        }
      });
    });
  }

  showTipForTab(tabId) {
    const tip = this.tips[tabId];
    if (!tip) return;

    const storageKey = `resuai_tip_seen_${tabId}`;
    if (localStorage.getItem(storageKey)) return;

    this.dismissActiveTip();

    const tipCard = document.createElement('div');
    tipCard.className = 'contextual-tip-card';
    tipCard.id = `contextualTipCard_${tabId}`;
    tipCard.setAttribute('role', 'status');
    tipCard.setAttribute('aria-live', 'polite');

    tipCard.innerHTML = `
      <div class="tip-card-header">
        <div class="tip-icon-badge">${tip.icon}</div>
        <span class="tip-tag">Pro Tip</span>
        <button class="tip-close-btn" onclick="window.contextualTipManager.dismiss('${tabId}')" aria-label="Dismiss tip">✕</button>
      </div>
      <div class="tip-card-body">
        <p>${tip.text}</p>
      </div>
      <div class="tip-card-footer">
        <button class="tip-action-btn" onclick="window.contextualTipManager.dismiss('${tabId}')">Got it!</button>
      </div>
    `;

    document.body.appendChild(tipCard);
    this.activeTipEl = tipCard;
    this.currentTabId = tabId;

    setTimeout(() => {
      if (this.activeTipEl) this.activeTipEl.classList.add('is-active');
    }, 50);
  }

  dismiss(tabId) {
    const targetTab = tabId || this.currentTabId;
    if (targetTab) {
      localStorage.setItem(`resuai_tip_seen_${targetTab}`, 'true');
    }
    this.dismissActiveTip();
  }

  dismissActiveTip() {
    if (this.activeTipEl) {
      this.activeTipEl.classList.remove('is-active');
      const el = this.activeTipEl;
      this.activeTipEl = null;
      setTimeout(() => {
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      }, 220);
    }
  }

  resetAllTips() {
    Object.keys(this.tips).forEach(tabId => {
      localStorage.removeItem(`resuai_tip_seen_${tabId}`);
    });
    this.showTipForTab('resume-builder');
  }
}

// Global initialization
window.ContextualTipManager = ContextualTipManager;

document.addEventListener('DOMContentLoaded', () => {
  if (!window.contextualTipManager) {
    window.contextualTipManager = new ContextualTipManager();
    window.contextualTipManager.init();
  }
});
