/**
 * ResuAI // Getting Started Checklist Module
 * Auto-updating onboarding checklist widget (0%-100%), progress bar, and confetti celebration
 */

class GettingStartedChecklistManager {
  constructor(options = {}) {
    this.storageKey = options.storageKey || 'resuai_getting_started_checklist';
    this.tasks = [
      { id: 'create_resume', label: 'Create Resume', icon: '📄', completed: false },
      { id: 'analyze_resume', label: 'Analyze Resume', icon: '📊', completed: false },
      { id: 'download_resume', label: 'Download Resume', icon: '📥', completed: false },
      { id: 'track_job', label: 'Track First Job', icon: '💼', completed: false },
      { id: 'complete_profile', label: 'Complete Profile', icon: '👤', completed: false }
    ];
    this.widgetEl = null;
    this.celebrated = false;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.loadState();
    this.injectWidgetDom();
    this.bindAutoUpdateListeners();
    this.initialized = true;
  }

  loadState() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.tasks.forEach(t => {
          if (parsed[t.id] === true) t.completed = true;
        });
        if (parsed.celebrated === true) this.celebrated = true;
      }
    } catch (e) {
      console.warn('Checklist state parse error:', e);
    }
  }

  saveState() {
    const stateObj = { celebrated: this.celebrated };
    this.tasks.forEach(t => {
      stateObj[t.id] = t.completed;
    });
    localStorage.setItem(this.storageKey, JSON.stringify(stateObj));
  }

  injectWidgetDom() {
    const existing = document.getElementById('gettingStartedWidget');
    if (existing) {
      existing.remove();
    }
    this.widgetEl = null;
  }

  renderWidget() {
    const existing = document.getElementById('gettingStartedWidget');
    if (existing) {
      existing.remove();
    }
    this.widgetEl = null;
    if (!this.widgetEl) return;

    const completedCount = this.tasks.filter(t => t.completed).length;
    const totalCount = this.tasks.length;
    const percentage = Math.round((completedCount / totalCount) * 100);
    const isFinished = completedCount === totalCount;

    if (isFinished) {
      this.widgetEl.classList.add('is-complete');
    } else {
      this.widgetEl.classList.remove('is-complete');
    }

    this.widgetEl.innerHTML = `
      <div class="checklist-widget-header">
        <div class="checklist-title-group">
          <div class="checklist-icon-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <div class="checklist-title-text">
            <h3>Getting Started Setup</h3>
            <p>${isFinished ? '🏆 Onboarding Completed! Workspace 100% active.' : 'Complete 5 quick steps to master your AI resume studio.'}</p>
          </div>
        </div>
        <span class="checklist-pct-badge">${percentage}% Complete</span>
      </div>

      <div class="checklist-progress-track">
        <div class="checklist-progress-fill" style="width: ${percentage}%;"></div>
      </div>

      <div class="checklist-items-grid">
        ${this.tasks.map(t => `
          <div class="checklist-item-row ${t.completed ? 'is-done' : ''}" onclick="window.checklistManager.toggleTask('${t.id}')">
            <div class="checklist-checkbox">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <span class="checklist-item-label">${t.icon} ${t.label}</span>
          </div>
        `).join('')}
      </div>
    `;

    if (isFinished && !this.celebrated) {
      this.celebrated = true;
      this.saveState();
      this.triggerCelebration();
    }
  }

  markTaskComplete(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task && !task.completed) {
      task.completed = true;
      this.saveState();
      this.renderWidget();
    }
  }

  toggleTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      this.saveState();
      this.renderWidget();
    }
  }

  bindAutoUpdateListeners() {
    // 1. Create Resume: Typing inside document editor body
    const docBody = document.querySelector('.doc-editor-body');
    if (docBody) {
      docBody.addEventListener('input', () => this.markTaskComplete('create_resume'), { once: true });
    }

    // 2. Analyze Resume: Clicking ATS scan button
    const btnAts = document.getElementById('btnRunAtsAnalysis');
    if (btnAts) {
      btnAts.addEventListener('click', () => this.markTaskComplete('analyze_resume'));
    }

    // 3. Download Resume: Exporting PDF
    const btnPdf = document.getElementById('btnPrintPdf');
    if (btnPdf) {
      btnPdf.addEventListener('click', () => this.markTaskComplete('download_resume'));
    }

    // 4. Track Job: Job Applications tab click
    const jobTab = document.querySelector('[data-tab="job-tracker"]');
    if (jobTab) {
      jobTab.addEventListener('click', () => this.markTaskComplete('track_job'));
    }

    // 5. Complete Profile: Profile Save button click
    const btnProfileSave = document.getElementById('profileSaveText');
    if (btnProfileSave) {
      const parentBtn = btnProfileSave.closest('button');
      if (parentBtn) parentBtn.addEventListener('click', () => this.markTaskComplete('complete_profile'));
    }
  }

  triggerCelebration() {
    const container = document.createElement('div');
    container.className = 'checklist-confetti-container';

    const colors = ['#2563EB', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#3B82F6'];

    for (let i = 0; i < 35; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-particle';
      p.style.left = `${Math.random() * 100}vw`;
      p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      p.style.width = `${Math.random() * 8 + 6}px`;
      p.style.height = `${Math.random() * 10 + 8}px`;
      p.style.animationDelay = `${Math.random() * 400}ms`;
      p.style.animationDuration = `${Math.random() * 1500 + 1500}ms`;
      container.appendChild(p);
    }

    document.body.appendChild(container);

    setTimeout(() => {
      if (container.parentNode) container.parentNode.removeChild(container);
    }, 3200);
  }
}

// Global initialization
window.GettingStartedChecklistManager = GettingStartedChecklistManager;

document.addEventListener('DOMContentLoaded', () => {
  if (!window.checklistManager) {
    window.checklistManager = new GettingStartedChecklistManager();
    window.checklistManager.init();
  }
});
