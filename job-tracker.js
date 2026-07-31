/**
 * ResuAI // Job Applications Kanban Module (job-tracker.js)
 * Manages job application pipeline cards, Kanban board drag-and-drop,
 * stage counters, and data storage.
 */

class JobTracker {
  constructor() {
    this.storageKey = 'resuai_job_applications';
    this.applications = [];
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.loadApplications();
    this.bindKanbanEvents();
    this.initialized = true;
  }

  loadApplications() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        this.applications = JSON.parse(saved);
      } else {
        this.applications = [
          { id: 'job-1', company: 'Google', title: 'Senior Frontend Engineer', stage: 'interviewing', atsScore: 94, date: '2026-07-28' },
          { id: 'job-2', company: 'Stripe', title: 'Staff UI Engineer', stage: 'applied', atsScore: 88, date: '2026-07-29' },
          { id: 'job-3', company: 'Vercel', title: 'Product Engineer', stage: 'wishlist', atsScore: 92, date: '2026-07-30' }
        ];
        this.saveApplications();
      }
    } catch (e) {
      console.warn('Job applications load parse error:', e);
    }
    this.renderKanbanBoard();
  }

  saveApplications() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.applications));
  }

  bindKanbanEvents() {
    const btnAdd = document.getElementById('btnAddJobApplication');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => this.promptAddJobModal());
    }
  }

  promptAddJobModal() {
    const company = prompt('Enter Company Name (e.g. Meta):');
    if (!company) return;
    const title = prompt('Enter Target Role (e.g. Staff Software Engineer):') || 'Software Engineer';

    const newJob = {
      id: 'job-' + Date.now(),
      company: company.trim(),
      title: title.trim(),
      stage: 'wishlist',
      atsScore: Math.floor(Math.random() * 15) + 85,
      date: new Date().toISOString().split('T')[0]
    };

    this.applications.unshift(newJob);
    this.saveApplications();
    this.renderKanbanBoard();

    // Trigger Getting Started Checklist task completion
    if (window.checklistManager) {
      window.checklistManager.markTaskComplete('track_job');
    }
  }

  moveJobStage(jobId, newStage) {
    const app = this.applications.find(a => a.id === jobId);
    if (app) {
      app.stage = newStage;
      this.saveApplications();
      this.renderKanbanBoard();
    }
  }

  renderKanbanBoard() {
    const columns = ['wishlist', 'applied', 'interviewing', 'offer', 'rejected'];

    columns.forEach(col => {
      const colEl = document.getElementById(`kanbanCol-${col}`);
      const countEl = document.getElementById(`kanbanCount-${col}`);
      if (!colEl) return;

      const colApps = this.applications.filter(a => a.stage === col);
      if (countEl) countEl.textContent = colApps.length;

      colEl.innerHTML = colApps.length === 0
        ? `<div class="kanban-empty-drop">Drop application card here</div>`
        : colApps.map(app => `
            <div class="kanban-job-card" draggable="true" ondragstart="event.dataTransfer.setData('text/plain', '${app.id}')">
              <div class="job-card-header">
                <span class="job-company">${app.company}</span>
                <span class="job-ats-pill">${app.atsScore}% ATS</span>
              </div>
              <div class="job-title">${app.title}</div>
              <div class="job-date">Added ${app.date}</div>
            </div>
          `).join('');
    });
  }
}

// Global initialization
window.jobTracker = new JobTracker();
document.addEventListener('DOMContentLoaded', () => window.jobTracker.init());
