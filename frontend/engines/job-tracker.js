/**
 * ResuAI // Job Application Pipeline Tracker (job-tracker.js)
 *
 * Features:
 *  - Table view  : searchable, filterable pipeline list with stage badges
 *  - Kanban view : drag-and-drop board across 5 pipeline stages
 *  - KPI cards   : total apps, active interviews, offers, avg ATS score
 *  - Add modal   : inline modal (no browser prompt())
 *  - Delete      : remove application with confirmation
 *  - Persistence : localStorage auto-save
 */

class JobTracker {
  constructor() {
    this.storageKey  = 'resuai_job_applications';
    this.applications = [];
    this.currentView  = 'table';   // 'table' | 'kanban'
    this.searchQuery  = '';
    this.stageFilter  = 'all';
    this.initialized  = false;
  }

  // ─── Init ────────────────────────────────────────────────────────────────

  init() {
    if (this.initialized) return;
    this._loadApplications();
    this._bindToolbarEvents();
    this._bindViewToggle();
    this._bindAddModal();
    this._bindKanbanDrop();
    this.renderAll();
    this.initialized = true;
  }

  // ─── Storage ─────────────────────────────────────────────────────────────

  _loadApplications() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      this.applications = saved ? JSON.parse(saved) : this._defaultApps();
    } catch (e) {
      console.warn('JobTracker: load error', e);
      this.applications = this._defaultApps();
    }
    if (!localStorage.getItem(this.storageKey)) this._save();
  }

  _save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.applications));
  }

  _defaultApps() {
    return [
      { id: 'job-1', company: 'Google',    title: 'Senior Frontend Engineer', stage: 'interviewing', salary: '$180k–$220k', location: 'Remote',       atsScore: 94, date: '2026-07-28' },
      { id: 'job-2', company: 'Stripe',    title: 'Staff UI Engineer',         stage: 'applied',       salary: '$200k–$240k', location: 'San Francisco', atsScore: 88, date: '2026-07-29' },
      { id: 'job-3', company: 'Vercel',    title: 'Product Engineer',          stage: 'wishlist',      salary: '$160k–$190k', location: 'Remote',       atsScore: 92, date: '2026-07-30' },
    ];
  }

  // ─── Event Binding ───────────────────────────────────────────────────────

  _bindToolbarEvents() {
    // Search input
    const searchInput = document.getElementById('jobSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase();
        this.renderAll();
      });
    }

    // Stage filter dropdown
    const stageFilter = document.getElementById('jobStageFilter');
    if (stageFilter) {
      stageFilter.addEventListener('change', (e) => {
        this.stageFilter = e.target.value;
        this.renderAll();
      });
    }

    // Quick filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        // chips are cosmetic for now — extend with tag-based filtering if needed
      });
    });
  }

  _bindViewToggle() {
    const btnTable  = document.getElementById('btnViewTable');
    const btnKanban = document.getElementById('btnViewKanban');
    const tableView  = document.getElementById('tableViewContainer');
    const kanbanView = document.getElementById('kanbanBoardContainer');

    if (!btnTable || !btnKanban) return;

    const showTable = () => {
      this.currentView = 'table';
      if (tableView)  tableView.style.display  = '';
      if (kanbanView) kanbanView.style.display  = 'none';
      btnTable.classList.add('active');
      btnKanban.classList.remove('active');
    };
    const showKanban = () => {
      this.currentView = 'kanban';
      if (tableView)  tableView.style.display  = 'none';
      if (kanbanView) kanbanView.style.display  = 'grid';
      btnKanban.classList.add('active');
      btnTable.classList.remove('active');
      this._renderKanban();
    };

    btnTable.addEventListener('click', showTable);
    btnKanban.addEventListener('click', showKanban);
    showTable(); // default
  }

  _bindKanbanDrop() {
    // Drop zones are rendered dynamically; use event delegation on the container
    const container = document.getElementById('kanbanBoardContainer');
    if (!container) return;

    container.addEventListener('dragover', e => e.preventDefault());
    container.addEventListener('drop', e => {
      e.preventDefault();
      const jobId  = e.dataTransfer.getData('text/plain');
      const colEl  = e.target.closest('[data-stage]');
      if (!colEl || !jobId) return;
      const newStage = colEl.dataset.stage;
      const app = this.applications.find(a => a.id === jobId);
      if (app && app.stage !== newStage) {
        app.stage = newStage;
        this._save();
        this.renderAll();
      }
    });
  }

  _bindAddModal() {
    // Wire both button IDs (toolbar + legacy sidebar)
    ['btnAddNewJob', 'btnAddJobApplication'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', () => this._showAddModal());
    });
  }

  // ─── Add Modal ───────────────────────────────────────────────────────────

  _showAddModal() {
    // Remove any existing modal
    document.getElementById('jobTrackerModal')?.remove();

    const STAGES = ['wishlist','applied','interviewing','offer','rejected'];
    const overlay = document.createElement('div');
    overlay.id = 'jobTrackerModal';
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);
      display:flex;align-items:center;justify-content:center;z-index:9999;
    `;

    overlay.innerHTML = `
      <div style="
        background:var(--bg-card,#1e1e2e);border:1px solid var(--border,#2d2d44);
        border-radius:16px;padding:32px;width:420px;max-width:92vw;
        box-shadow:0 24px 60px rgba(0,0,0,0.5);
      ">
        <h3 style="margin:0 0 20px;font-size:1.15rem;font-weight:700;color:var(--text-primary,#f1f5f9);">
          ➕ Add Job Application
        </h3>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <input id="modalCompany"  placeholder="Company (e.g. Stripe)" style="${this._inputStyle()}" />
          <input id="modalRole"     placeholder="Role (e.g. Staff Engineer)" style="${this._inputStyle()}" />
          <input id="modalSalary"   placeholder="Salary range (optional, e.g. $180k–$220k)" style="${this._inputStyle()}" />
          <input id="modalLocation" placeholder="Location (e.g. Remote)" style="${this._inputStyle()}" />
          <select id="modalStage" style="${this._inputStyle()}">
            ${STAGES.map(s => `<option value="${s}">${this._stageLabel(s)}</option>`).join('')}
          </select>
          <input id="modalAts" type="number" min="0" max="100" placeholder="ATS Match % (optional)" style="${this._inputStyle()}" />
        </div>
        <div style="display:flex;gap:10px;margin-top:24px;justify-content:flex-end;">
          <button id="modalCancelBtn" style="
            background:transparent;border:1px solid var(--border,#2d2d44);color:var(--text-muted,#94a3b8);
            padding:8px 18px;border-radius:8px;cursor:pointer;font-size:0.875rem;
          ">Cancel</button>
          <button id="modalSaveBtn" style="
            background:linear-gradient(135deg,#C98B4A,#e0a060);color:#fff;border:none;
            padding:8px 22px;border-radius:8px;cursor:pointer;font-size:0.875rem;font-weight:700;
          ">Add Application</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('modalCancelBtn').onclick = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    document.getElementById('modalSaveBtn').onclick = () => {
      const company  = document.getElementById('modalCompany').value.trim();
      const title    = document.getElementById('modalRole').value.trim();
      if (!company || !title) {
        document.getElementById('modalCompany').style.borderColor = '#ef4444';
        document.getElementById('modalRole').style.borderColor    = '#ef4444';
        return;
      }
      const atsRaw = parseInt(document.getElementById('modalAts').value);
      const newJob = {
        id:       'job-' + Date.now(),
        company,
        title,
        salary:   document.getElementById('modalSalary').value.trim()   || '—',
        location: document.getElementById('modalLocation').value.trim() || '—',
        stage:    document.getElementById('modalStage').value,
        atsScore: !isNaN(atsRaw) ? Math.min(100, Math.max(0, atsRaw)) : Math.floor(Math.random() * 15) + 80,
        date:     new Date().toISOString().split('T')[0],
      };
      this.applications.unshift(newJob);
      this._save();
      this.renderAll();
      overlay.remove();
      if (window.checklistManager) window.checklistManager.markTaskComplete('track_job');
      if (typeof showToast === 'function') showToast(`Added "${company}" to your pipeline!`, 'success');
    };

    setTimeout(() => document.getElementById('modalCompany')?.focus(), 50);
  }

  _inputStyle() {
    return `
      width:100%;box-sizing:border-box;padding:9px 12px;border-radius:8px;
      background:var(--bg-hover,#252540);border:1px solid var(--border,#2d2d44);
      color:var(--text-primary,#f1f5f9);font-size:0.875rem;outline:none;
    `;
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  renderAll() {
    this._updateKPIs();
    this._renderTable();
    if (this.currentView === 'kanban') this._renderKanban();
  }

  /** Filter helper — shared by table and kanban */
  _filteredApps() {
    return this.applications.filter(app => {
      const matchSearch = !this.searchQuery ||
        app.company.toLowerCase().includes(this.searchQuery) ||
        app.title.toLowerCase().includes(this.searchQuery)   ||
        (app.location || '').toLowerCase().includes(this.searchQuery);
      const matchStage = this.stageFilter === 'all' || app.stage === this.stageFilter ||
        (this.stageFilter === 'interview' && app.stage === 'interviewing') ||
        (this.stageFilter === 'interviewing' && app.stage === 'interview');
      return matchSearch && matchStage;
    });
  }

  // ─── KPI Cards ────────────────────────────────────────────────────────────

  _updateKPIs() {
    const apps       = this.applications;
    const interviews = apps.filter(a => a.stage === 'interviewing' || a.stage === 'interview').length;
    const offers     = apps.filter(a => a.stage === 'offer').length;
    const avgAts     = apps.length
      ? Math.round(apps.reduce((s, a) => s + (a.atsScore || 0), 0) / apps.length)
      : 0;

    this._setText('kpiTotalApps',       apps.length);
    this._setText('kpiActiveInterviews', interviews);
    this._setText('kpiOffersCount',      offers);
    this._setText('kpiAvgAtsScore',      avgAts + '%');
  }

  _setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // ─── Table View ───────────────────────────────────────────────────────────

  _renderTable() {
    const tbody = document.getElementById('pipelineTableBody');
    if (!tbody) return;

    const apps = this._filteredApps();

    if (apps.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted,#94a3b8);">
            No applications match your search. <a href="#" onclick="document.getElementById('btnAddNewJob')?.click();return false;" style="color:#C98B4A;">Add one →</a>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = apps.map(app => `
      <tr class="pipeline-table-row">
        <td>
          <div class="company-name-text">${this._esc(app.company)}</div>
          <div class="company-role-text">${this._esc(app.title)}</div>
        </td>
        <td class="text-center">
          <span class="stage-badge stage-${app.stage}">${this._stageLabel(app.stage)}</span>
        </td>
        <td class="text-center">
          <span class="date-text">${this._esc(app.date)}</span>
        </td>
        <td class="text-center">
          <span class="salary-text">${this._esc(app.salary || '—')}</span>
        </td>
        <td class="text-center">
          <span class="ats-score-pill ${app.atsScore >= 80 ? 'ats-high' : app.atsScore >= 60 ? 'ats-mid' : 'ats-low'}">
            ${app.atsScore}%
          </span>
        </td>
        <td class="text-right">
          <select class="stage-quick-select" data-id="${app.id}" title="Move stage"
            style="font-size:0.75rem;padding:4px 6px;border-radius:6px;
                   background:var(--bg-hover,#252540);border:1px solid var(--border,#2d2d44);
                   color:var(--text-primary,#f1f5f9);cursor:pointer;margin-right:6px;">
            ${['wishlist','applied','interviewing','offer','rejected'].map(s =>
              `<option value="${s}" ${app.stage === s ? 'selected' : ''}>${this._stageLabel(s)}</option>`
            ).join('')}
          </select>
          <button class="job-delete-btn" data-id="${app.id}" title="Delete"
            style="background:transparent;border:1px solid #ef4444;color:#ef4444;
                   border-radius:6px;padding:4px 8px;cursor:pointer;font-size:0.75rem;">✕</button>
        </td>
      </tr>
    `).join('');

    // Wire stage quick-select
    tbody.querySelectorAll('.stage-quick-select').forEach(sel => {
      sel.addEventListener('change', e => {
        const app = this.applications.find(a => a.id === e.target.dataset.id);
        if (app) { app.stage = e.target.value; this._save(); this.renderAll(); }
      });
    });

    // Wire delete buttons
    tbody.querySelectorAll('.job-delete-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = e.currentTarget.dataset.id;
        if (confirm('Remove this application?')) {
          this.applications = this.applications.filter(a => a.id !== id);
          this._save();
          this.renderAll();
        }
      });
    });
  }

  // ─── Kanban View ──────────────────────────────────────────────────────────

  _renderKanban() {
    const container = document.getElementById('kanbanBoardContainer');
    if (!container) return;

    const COLUMNS = [
      { id: 'wishlist',     label: '⭐ Wishlist'    },
      { id: 'applied',      label: '📤 Applied'      },
      { id: 'interviewing', label: '🎯 Interviewing' },
      { id: 'offer',        label: '🏆 Offer'        },
      { id: 'rejected',     label: '❌ Closed'       },
    ];

    const apps = this._filteredApps();

    container.innerHTML = COLUMNS.map(col => {
      const colApps = apps.filter(a => a.stage === col.id || (col.id === 'interviewing' && a.stage === 'interview') || (col.id === 'interview' && a.stage === 'interviewing'));
      return `
        <div class="kanban-column" data-stage="${col.id}"
          style="background:var(--bg-card,#1e1e2e);border:1px solid var(--border,#2d2d44);
                 border-radius:12px;padding:12px;min-height:200px;">
          <div style="font-size:0.75rem;font-weight:700;letter-spacing:0.06em;
                      color:var(--text-muted,#94a3b8);margin-bottom:12px;
                      display:flex;justify-content:space-between;align-items:center;">
            <span>${col.label}</span>
            <span style="background:var(--bg-hover,#252540);border-radius:20px;
                         padding:1px 8px;font-size:0.7rem;">${colApps.length}</span>
          </div>
          ${colApps.length === 0
            ? `<div style="text-align:center;padding:20px 0;color:var(--text-muted,#94a3b8);font-size:0.78rem;opacity:0.6;">Drop card here</div>`
            : colApps.map(app => `
                <div class="kanban-job-card" draggable="true" data-id="${app.id}"
                  style="background:var(--bg-hover,#252540);border:1px solid var(--border,#2d2d44);
                         border-radius:8px;padding:10px 12px;margin-bottom:8px;cursor:grab;">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                    <span style="font-weight:700;font-size:0.82rem;color:var(--text-primary,#f1f5f9);">${this._esc(app.company)}</span>
                    <span style="font-size:0.7rem;background:#C98B4A20;color:#C98B4A;
                                 border-radius:20px;padding:1px 7px;font-weight:700;">${app.atsScore}%</span>
                  </div>
                  <div style="font-size:0.78rem;color:var(--text-muted,#94a3b8);">${this._esc(app.title)}</div>
                  <div style="font-size:0.7rem;color:var(--text-muted,#94a3b8);margin-top:5px;opacity:0.7;">${this._esc(app.date)}</div>
                </div>
              `).join('')
          }
        </div>
      `;
    }).join('');

    // Wire drag start on cards
    container.querySelectorAll('.kanban-job-card').forEach(card => {
      card.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', card.dataset.id);
        card.style.opacity = '0.5';
      });
      card.addEventListener('dragend', () => { card.style.opacity = ''; });
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  _stageLabel(stage) {
    return { wishlist: 'Wishlist', applied: 'Applied', interviewing: 'Interviewing',
             offer: 'Offer', rejected: 'Closed' }[stage] || stage;
  }

  _esc(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
}

// Global initialization
window.jobTracker = new JobTracker();
document.addEventListener('DOMContentLoaded', () => window.jobTracker.init());

