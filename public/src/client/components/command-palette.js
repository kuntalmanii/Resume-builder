/**
 * ResuAI // Command Palette Module
 * Raycast/Linear style ⌘K & Ctrl+K command palette with instant search & keyboard navigation
 */

class CommandPalette {
  constructor(options = {}) {
    this.commands = CommandPalette.getDefaultCommands();
    this.selectedIndex = 0;
    this.overlayEl = null;
    this.inputEl = null;
    this.resultsEl = null;
    this.filteredCommands = [];
    this.isOpen = false;
    this.initialized = false;
  }

  static getDefaultCommands() {
    return [
      // Navigation
      { id: 'nav-builder', group: 'Navigation', icon: '📄', title: 'Resume Builder Canvas', desc: 'Direct inline paper document editor', action: () => CommandPalette.navigateToTab('resume-builder'), shortcut: '↵' },
      { id: 'nav-ats', group: 'Navigation', icon: '📊', title: 'ATS Analyzer Engine', desc: 'Real-time ATS score & keyword match diagnostic', action: () => CommandPalette.navigateToTab('ats-analyzer'), shortcut: '↵' },
      { id: 'nav-analytics', group: 'Navigation', icon: '📈', title: 'Score Analytics', desc: 'FAANG benchmark scores & keyword density', action: () => CommandPalette.navigateToTab('analytics'), shortcut: '↵' },
      { id: 'nav-tracker', group: 'Navigation', icon: '💼', title: 'Job Applications Tracker', desc: 'Kanban application pipeline manager', action: () => CommandPalette.navigateToTab('job-tracker'), shortcut: '↵' },
      { id: 'nav-settings', group: 'Navigation', icon: '⚙️', title: 'System & Account Settings', desc: 'Platform configurations & candidate profile', action: () => CommandPalette.navigateToTab('settings'), shortcut: '↵' },

      // Quick Actions
      { id: 'act-pdf', group: 'Quick Actions', icon: '📥', title: 'Export ATS PDF', desc: 'Download high-resolution ATS resume PDF', action: () => CommandPalette.triggerExportPdf(), shortcut: '⌘P' },
      { id: 'act-optimize', group: 'Quick Actions', icon: '⚡', title: '1-Click AI Auto-Optimize', desc: 'AI keyword enhancement powered by Gemini 2.5', action: () => CommandPalette.triggerAutoOptimize(), shortcut: '⌘O' },
      { id: 'act-theme', group: 'Quick Actions', icon: '🎨', title: 'Cycle Studio Color Theme', desc: 'Toggle workspace theme styling', action: () => CommandPalette.cycleTheme(), shortcut: '⌘T' },
      { id: 'act-help', group: 'Quick Actions', icon: '❓', title: 'Open Help Center & FAQs', desc: 'Search documentation, guides & shortcuts', action: () => CommandPalette.triggerHelpCenter(), shortcut: '⌘H' }
    ];
  }

  init() {
    if (this.initialized) return;
    this.createDomElements();
    this.bindEvents();
    this.initialized = true;
  }

  createDomElements() {
    if (document.getElementById('commandPaletteOverlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'command-palette-overlay';
    overlay.id = 'commandPaletteOverlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    overlay.innerHTML = `
      <div class="command-palette-card" id="commandPaletteCard">
        <div class="command-input-wrapper">
          <svg class="command-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" class="command-input" id="commandInput" placeholder="Type a command or search studio actions..." autocomplete="off" />
          <span class="command-shortcut-hint">ESC to close</span>
        </div>

        <div class="command-results-list" id="commandResultsList"></div>

        <div class="command-palette-footer">
          <div class="command-keys-hint">
            <span><kbd>↑</kbd> <kbd>↓</kbd> Navigate</span>
            <span><kbd>↵</kbd> Select</span>
            <span><kbd>ESC</kbd> Close</span>
          </div>
          <span>ResuAI Palette</span>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlayEl = overlay;
    this.inputEl = overlay.querySelector('#commandInput');
    this.resultsEl = overlay.querySelector('#commandResultsList');
  }

  bindEvents() {
    // Global ⌘K / Ctrl+K listener
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.toggle();
      }
    });

    if (this.inputEl) {
      this.inputEl.addEventListener('input', (e) => {
        this.filterCommands(e.target.value);
      });
    }

    if (this.overlayEl) {
      this.overlayEl.addEventListener('click', (e) => {
        if (e.target === this.overlayEl) this.close();
      });

      this.overlayEl.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          this.close();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.moveSelection(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.moveSelection(-1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          this.executeSelected();
        }
      });
    }
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    if (!this.overlayEl) return;
    this.isOpen = true;
    this.overlayEl.classList.add('is-active');
    this.inputEl.value = '';
    this.filterCommands('');
    setTimeout(() => this.inputEl.focus(), 50);
  }

  close() {
    if (!this.overlayEl) return;
    this.isOpen = false;
    this.overlayEl.classList.remove('is-active');
  }

  filterCommands(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      this.filteredCommands = [...this.commands];
    } else {
      this.filteredCommands = this.commands.filter(cmd => 
        cmd.title.toLowerCase().includes(q) ||
        cmd.desc.toLowerCase().includes(q) ||
        cmd.group.toLowerCase().includes(q)
      );
    }
    this.selectedIndex = 0;
    this.renderResults();
  }

  renderResults() {
    if (!this.resultsEl) return;

    if (this.filteredCommands.length === 0) {
      this.resultsEl.innerHTML = `
        <div class="command-empty-state">
          No matching commands found for "${this.inputEl.value}".
        </div>
      `;
      return;
    }

    // Group commands
    const groups = {};
    this.filteredCommands.forEach((cmd, idx) => {
      if (!groups[cmd.group]) groups[cmd.group] = [];
      groups[cmd.group].push({ ...cmd, globalIndex: idx });
    });

    let html = '';
    Object.keys(groups).forEach(groupName => {
      html += `<div class="command-group-title">${groupName}</div>`;
      groups[groupName].forEach(cmd => {
        const isSelected = cmd.globalIndex === this.selectedIndex;
        html += `
          <div class="command-item ${isSelected ? 'is-selected' : ''}" data-index="${cmd.globalIndex}" onclick="window.commandPalette.executeIndex(${cmd.globalIndex})">
            <div class="command-item-left">
              <div class="command-item-icon">${cmd.icon}</div>
              <div class="command-item-text">
                <h4>${cmd.title}</h4>
                <span>${cmd.desc}</span>
              </div>
            </div>
            <span class="command-item-badge">${cmd.shortcut}</span>
          </div>
        `;
      });
    });

    this.resultsEl.innerHTML = html;

    // Scroll selected item into view
    const selectedEl = this.resultsEl.querySelector('.command-item.is-selected');
    if (selectedEl) {
      selectedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  moveSelection(direction) {
    if (this.filteredCommands.length === 0) return;
    this.selectedIndex += direction;
    if (this.selectedIndex < 0) this.selectedIndex = this.filteredCommands.length - 1;
    if (this.selectedIndex >= this.filteredCommands.length) this.selectedIndex = 0;
    this.renderResults();
  }

  executeSelected() {
    if (this.filteredCommands[this.selectedIndex]) {
      this.executeCommand(this.filteredCommands[this.selectedIndex]);
    }
  }

  executeIndex(idx) {
    if (this.filteredCommands[idx]) {
      this.executeCommand(this.filteredCommands[idx]);
    }
  }

  executeCommand(command) {
    this.close();
    if (typeof command.action === 'function') {
      command.action();
    }
  }

  // Static Action Handlers
  static navigateToTab(tabId) {
    const tabBtn = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    if (tabBtn) tabBtn.click();
  }

  static triggerExportPdf() {
    const btn = document.getElementById('btnPrintPdf');
    if (btn) btn.click();
  }

  static triggerAutoOptimize() {
    const btn = document.getElementById('btnAutoOptimize') || document.getElementById('topbarOptimizeBtn');
    if (btn) btn.click();
  }

  static cycleTheme() {
    const themes = ['sunset-amber', 'emerald-dark', 'midnight-slate', 'cyberpunk'];
    const currentTheme = document.body.getAttribute('data-theme') || 'sunset-amber';
    const nextIdx = (themes.indexOf(currentTheme) + 1) % themes.length;
    document.body.setAttribute('data-theme', themes[nextIdx]);
  }

  static triggerHelpCenter() {
    if (window.helpCenter) {
      window.helpCenter.toggle(true);
    }
  }
}

// Global initialization
window.CommandPalette = CommandPalette;

document.addEventListener('DOMContentLoaded', () => {
  if (!window.commandPalette) {
    window.commandPalette = new CommandPalette();
    window.commandPalette.init();
  }
});
