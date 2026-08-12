/**
 * ResuAI // Document Editor Engine (doc-editor.js)
 *
 * Extracted from inline <script> blocks in index.html.
 *
 * Block 1 — Resume Builder tab (was lines 1083–1632 of index.html):
 *   1.  Content-header hide (full-bleed editor mode)
 *   2.  contenteditable → hidden input sync
 *   3.  Wire all contenteditable doc fields
 *   4.  Bullets system (add / remove / reorder / sync)
 *   5.  addBulletFromPreset / setDocBullets (window globals)
 *   6.  Skills inline tag system
 *   7.  Section nav + scroll spy
 *   8.  Right panel toggle
 *   9.  Preview zoom
 *   10. Formatting toolbar (Bold / Italic / Underline)
 *   11. Autosave status indicator
 *   13. Section completion percentages
 *   14. AI Writing Assistant & Chat
 *   15. Section collapse toggle
 *   16. XYZ Meter MutationObserver
 *   17. Keyboard shortcuts (Ctrl+S)
 *
 * Block 2 — ATS Analyzer tab (was lines 2021–2122 of index.html):
 *   - switchAtsCategory
 *   - toggleReportBlock
 *   - insertKeywordSentence
 *   - sendAtsChatPrompt
 *   - submitAtsChat
 */

(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────
  // UTILITY HELPER
  // ─────────────────────────────────────────────────────────────
  function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#39;');
  }
  if (typeof window.escapeHTML !== 'function') {
    window.escapeHTML = escapeHTML;
  }

  // ─────────────────────────────────────────────────────────────
  // BLOCK 1: RESUME BUILDER DOC EDITOR
  // ─────────────────────────────────────────────────────────────

  /* ── 1. CONTENT-HEADER HIDE (full-bleed editor) ── */
  function updateHeaderVisibility() {
    const isActive = document.querySelector('#tab-resume-builder.active');
    const contentHeader = document.querySelector('.content-header');
    if (contentHeader) {
      contentHeader.style.transition = 'opacity 0.2s';
      contentHeader.style.opacity = isActive ? '0' : '';
      contentHeader.style.pointerEvents = isActive ? 'none' : '';
      contentHeader.style.position = isActive ? 'absolute' : '';
      contentHeader.style.visibility = isActive ? 'hidden' : '';
    }
  }
  updateHeaderVisibility();
  const tabObserver = new MutationObserver(updateHeaderVisibility);
  const tabPane = document.getElementById('tab-resume-builder');
  if (tabPane) tabObserver.observe(tabPane, { attributes: true, attributeFilter: ['class'] });

  /* ── 2. SYNC: contenteditable → hidden input ── */
  function fireInputEvent(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ─────────────────────────────────────────────────────────────
  // GOOGLE-GRADE PERSONAL DETAILS ENGINE
  // ─────────────────────────────────────────────────────────────
  const PersonalDetailsEngine = {
    fields: [
      { id: 'docFieldName',     syncId: 'inputFullName',  key: 'fullName' },
      { id: 'docFieldTitle',    syncId: 'inputJobTitle',  key: 'jobTitle' },
      { id: 'docFieldEmail',    syncId: 'inputEmail',     key: 'email' },
      { id: 'docFieldPhone',    syncId: 'inputPhone',     key: 'phone' },
      { id: 'docFieldLocation', syncId: 'inputLocation',  key: 'location' },
      { id: 'docFieldGithub',   syncId: 'inputGithub',    key: 'github' },
      { id: 'docFieldLinkedin', syncId: 'inputLinkedin',  key: 'linkedin' },
      { id: 'docFieldPortfolio',syncId: 'inputPortfolio', key: 'portfolio' }
    ],

    init: function() {
      const self = this;
      this.fields.forEach(function(f) {
        const el = document.getElementById(f.id);
        if (!el) return;

        // Plain text paste listener to strip HTML formatting
        el.addEventListener('paste', function(e) {
          e.preventDefault();
          const text = (e.clipboardData || window.clipboardData).getData('text/plain') || '';
          const cleanText = el.dataset.singleLine ? text.replace(/[\r\n]+/g, ' ').trim() : text;
          document.execCommand('insertText', false, cleanText);
          self.updateEmptyState(el);
          self.syncField(el);
        });

        // Focus & Blur for link formatting + placeholder toggles
        el.addEventListener('focus', function() {
          el.classList.remove('is-empty');
        });

        el.addEventListener('blur', function() {
          if (f.key === 'github' || f.key === 'linkedin' || f.key === 'portfolio') {
            self.formatSingleLink(el, f.key);
          }
          self.updateEmptyState(el);
          self.syncField(el);
        });

        // Input & Keydown
        el.addEventListener('input', function() {
          self.updateEmptyState(el);
          self.syncField(el);
        });

        el.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' && el.dataset.singleLine) {
            e.preventDefault();
            self.focusNextField(f.id);
          }
        });

        // Initial empty state check
        self.updateEmptyState(el);
      });

      window.personalEngine = this;
      this.calculateCompleteness();
    },

    updateEmptyState: function(el) {
      if (!el) return;
      const val = (el.innerText || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
      if (!val) {
        el.classList.add('is-empty');
      } else {
        el.classList.remove('is-empty');
      }
    },

    focusNextField: function(currentId) {
      const order = [
        'docFieldName', 'docFieldTitle', 'docFieldEmail',
        'docFieldPhone', 'docFieldLocation', 'docFieldGithub',
        'docFieldLinkedin', 'docFieldPortfolio'
      ];
      const idx = order.indexOf(currentId);
      if (idx >= 0 && idx < order.length - 1) {
        const next = document.getElementById(order[idx + 1]);
        if (next) next.focus();
      }
    },

    syncField: function(el) {
      const targetId = el.dataset.syncs;
      if (!targetId) return;
      const target = document.getElementById(targetId);
      const text = (el.innerText || '').trim();
      if (target) {
        target.value = text;
        target.dispatchEvent(new Event('input', { bubbles: true }));
      }
      this.validateField(el);
      this.calculateCompleteness();
      updateAutosave();
      if (typeof window.syncLivePreview === 'function') {
        window.syncLivePreview();
      }
    },

    validateField: function(el) {
      if (el.id === 'docFieldEmail') {
        const badge = document.getElementById('badgeEmail');
        const text = (el.innerText || '').trim();
        if (!badge) return;
        if (!text) {
          badge.className = 'contact-val-badge';
        } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
          badge.className = 'contact-val-badge val-valid';
        } else {
          badge.className = 'contact-val-badge val-invalid';
        }
      }
    },

    formatSingleLink: function(el, key) {
      let val = (el.innerText || '').trim();
      if (!val) return;

      if (key === 'github') {
        val = val.replace(/^https?:\/\/(www\.)?github\.com\//i, '')
                 .replace(/^github\.com\//i, '')
                 .replace(/\/$/, '');
        if (val) el.innerText = 'github.com/' + val;
      } else if (key === 'linkedin') {
        val = val.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, '')
                 .replace(/^linkedin\.com\/in\//i, '')
                 .replace(/\/$/, '');
        if (val) el.innerText = 'linkedin.com/in/' + val;
      } else if (key === 'portfolio') {
        val = val.replace(/^https?:\/\//i, '').replace(/\/$/, '');
        if (val) el.innerText = val;
      }
      this.updateEmptyState(el);
      this.syncField(el);
    },

    formatLinks: function() {
      const gh = document.getElementById('docFieldGithub');
      const li = document.getElementById('docFieldLinkedin');
      const pf = document.getElementById('docFieldPortfolio');
      if (gh) this.formatSingleLink(gh, 'github');
      if (li) this.formatSingleLink(li, 'linkedin');
      if (pf) this.formatSingleLink(pf, 'portfolio');
      if (typeof window.showToast === 'function') {
        window.showToast('Social handle links cleaned & formatted!', 'success');
      }
    },

    fillSample: function() {
      if (typeof window.loadGoogleDevTemplate === 'function') {
        window.loadGoogleDevTemplate();
      } else {
        const sample = {
          docFieldName: 'YOUR NAME',
          docFieldTitle: 'Software Developer | Full Stack Developer',
          docFieldEmail: 'email@example.com',
          docFieldPhone: '+91 XXXXX XXXXX',
          docFieldLocation: 'City, India',
          docFieldGithub: 'github.com/yourgithub',
          docFieldLinkedin: 'linkedin.com/in/yourlinkedin',
          docFieldPortfolio: 'yourportfolio.dev'
        };
        const self = this;
        Object.keys(sample).forEach(function(id) {
          const el = document.getElementById(id);
          if (el) {
            el.innerText = sample[id];
            self.updateEmptyState(el);
            self.syncField(el);
          }
        });
        if (typeof window.showToast === 'function') {
          window.showToast('Sample contact details populated!', 'success');
        }
      }
    },

    calculateCompleteness: function() {
      let score = 0;
      const weights = {
        docFieldName: 25,
        docFieldTitle: 25,
        docFieldEmail: 20,
        docFieldPhone: 10,
        docFieldLocation: 10,
        docFieldGithub: 5,
        docFieldLinkedin: 5
      };

      Object.keys(weights).forEach(function(id) {
        const el = document.getElementById(id);
        const val = (el?.innerText || '').trim();
        if (val) score += weights[id];
      });

      const pill = document.getElementById('personalCompPill');
      if (pill) {
        pill.textContent = score + '%';
        pill.className = 'personal-comp-pill ' +
          (score >= 80 ? 'comp-complete' : (score > 0 ? 'comp-partial' : ''));
      }
      updateNavPct('personal', score);
    },

    syncFromInputs: function() {
      const self = this;
      this.fields.forEach(function(f) {
        const docEl = document.getElementById(f.id);
        const inputEl = document.getElementById(f.syncId);
        if (docEl && inputEl) {
          docEl.innerText = inputEl.value || '';
          self.updateEmptyState(docEl);
          self.validateField(docEl);
        }
      });
      this.calculateCompleteness();
    }
  };

  function syncField(editorEl) {
    const targetId = editorEl.dataset.syncs;
    if (!targetId) return;
    const target = document.getElementById(targetId);
    if (!target) return;
    const text = editorEl.innerText || '';
    target.value = text;
    fireInputEvent(target);
    updateSectionPct();
    updateAutosave();
    if (typeof window.syncLivePreview === 'function') {
      window.syncLivePreview();
    }
  }

  /* ── 3. WIRE all contenteditable fields ── */
  function wireEditorFields() {
    PersonalDetailsEngine.init();
    document.querySelectorAll('[data-syncs]:not([id^="docField"])').forEach(function (el) {
      el.addEventListener('input',  function () { syncField(el); });
      el.addEventListener('blur',   function () { syncField(el); });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && el.dataset.singleLine) {
          e.preventDefault();
          const next = el.closest('.doc-section-block')
            ?.querySelector('[data-syncs]:not([data-syncs="' + el.dataset.syncs + '"])');
          if (next) next.focus();
        }
      });
    });
  }
  wireEditorFields();

  /* ── 4. BULLETS system ── */
  var docBullets = [];


  function placeCaretAtEnd(el) {
    el.focus();
    var range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function syncBulletsToTextarea() {
    var ta = document.getElementById('bulletPoints');
    if (!ta) return;
    ta.value = docBullets.map(function (b) { return '• ' + b; }).join('\n');
    fireInputEvent(ta);
    updateAutosave();
    // Update XYZ display from hidden span
    setTimeout(function () {
      var score   = document.getElementById('xyzMeterScore');
      var display = document.getElementById('xyzMeterScoreDisplay');
      var aiLabel = document.getElementById('aiXyzScoreLabel');
      if (score && display) display.textContent = score.textContent || 'Add bullets below';
      if (score && aiLabel) {
        var match = score.textContent.match(/(\d+)%/);
        if (match) aiLabel.textContent = match[1] + '%';
      }
    }, 300);
  }

  function renderBullets() {
    const list = document.getElementById('docBulletsList');
    if (!list) return;
    list.innerHTML = '';
    docBullets.forEach(function (text, idx) {
      const li = document.createElement('li');
      li.className = 'doc-bullet-item';
      li.innerHTML =
        '<span class="doc-bullet-dot"></span>' +
        '<div class="doc-bullet-text" contenteditable="true" spellcheck="true" data-idx="' + idx + '" data-placeholder="Bullet point — use XYZ format: Achieved X by doing Y, resulting in Z metric">' +
          escapeHTML(text) +
        '</div>' +
        '<button class="doc-bullet-remove" data-idx="' + idx + '" title="Remove bullet">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>';
      list.appendChild(li);
    });

    // Wire bullet events
    list.querySelectorAll('.doc-bullet-text').forEach(function (bt) {
      bt.addEventListener('input', function () {
        var idx = parseInt(bt.dataset.idx);
        docBullets[idx] = bt.innerText || '';
        syncBulletsToTextarea();
      });
      bt.addEventListener('keydown', function (e) {
        var idx = parseInt(bt.dataset.idx);
        if (e.key === 'Enter') {
          e.preventDefault();
          docBullets.splice(idx + 1, 0, '');
          renderBullets();
          setTimeout(function () {
            var items = document.querySelectorAll('.doc-bullet-text');
            if (items[idx + 1]) { items[idx + 1].focus(); }
          }, 30);
        } else if (e.key === 'Backspace' && bt.innerText === '') {
          e.preventDefault();
          if (docBullets.length > 1) {
            docBullets.splice(idx, 1);
            renderBullets();
            setTimeout(function () {
              var items = document.querySelectorAll('.doc-bullet-text');
              var prev  = items[Math.max(0, idx - 1)];
              if (prev) { prev.focus(); placeCaretAtEnd(prev); }
            }, 30);
          }
        }
      });
    });

    list.querySelectorAll('.doc-bullet-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.dataset.idx);
        if (docBullets.length > 1) { docBullets.splice(idx, 1); }
        else { docBullets[0] = ''; }
        renderBullets();
        syncBulletsToTextarea();
      });
    });

    updateNavPct('experience', docBullets.filter(function (b) { return b.trim().length > 10; }).length > 0 ? 100 : 0);
  }

  // Add bullet button
  var addBulletBtn = document.getElementById('docAddBulletBtn');
  if (addBulletBtn) {
    addBulletBtn.addEventListener('click', function () {
      docBullets.push('');
      renderBullets();
      setTimeout(function () {
        var items = document.querySelectorAll('.doc-bullet-text');
        if (items.length) { items[items.length - 1].focus(); }
      }, 30);
    });
  }

  // Initial render with 3 empty bullets
  docBullets = ['', '', ''];
  renderBullets();

  /* ── 5. addBulletFromPreset / setDocBullets ── */
  window.addBulletFromPreset = function (text) {
    var emptyIdx = docBullets.findIndex(function (b) { return b.trim() === ''; });
    if (emptyIdx >= 0) { docBullets[emptyIdx] = text; }
    else { docBullets.push(text); }
    renderBullets();
    syncBulletsToTextarea();
  };

  window.setDocBullets = function (bulletsArray) {
    if (Array.isArray(bulletsArray) && bulletsArray.length > 0) {
      docBullets = bulletsArray
        .map(function (b) { return (b || '').replace(/^[•\-\*]\s*/, '').trim(); })
        .filter(Boolean);
    }
    if (!docBullets.length) docBullets = ['', '', ''];
    renderBullets();
    syncBulletsToTextarea();
  };

  /* ── 6. SKILLS inline system ── */
  var docSkills = [];

  function renderDocSkills() {
    var wrapper  = document.getElementById('docSkillsWrapper');
    var addInput = document.getElementById('docSkillInput');
    if (!wrapper || !addInput) return;
    wrapper.innerHTML = '';
    docSkills.forEach(function (skill, idx) {
      var tag = document.createElement('span');
      tag.className = 'doc-skill-tag';
      tag.innerHTML = escapeHTML(skill) + '<span class="doc-skill-tag-x" data-idx="' + idx + '">&times;</span>';
      wrapper.appendChild(tag);
    });
    wrapper.appendChild(addInput);
    wrapper.querySelectorAll('.doc-skill-tag-x').forEach(function (x) {
      x.addEventListener('click', function () {
        docSkills.splice(parseInt(x.dataset.idx), 1);
        renderDocSkills();
        syncSkillsToTagSystem();
      });
    });
    var pct = docSkills.length > 0 ? Math.min(100, Math.round(docSkills.length * 12.5)) : 0;
    updateNavPct('skills', pct);
  }

  window.addDocSkill = function (skill) {
    if (!skill || docSkills.indexOf(skill) >= 0) return;
    docSkills.push(skill);
    renderDocSkills();
    syncSkillsToTagSystem();
  };

  function syncSkillsToTagSystem() {
    // Directly update the preview so Technical Expertise always reflects docSkills
    var previewSkillsEl = document.getElementById('previewSkills');
    if (previewSkillsEl) {
      previewSkillsEl.textContent = docSkills.join(', ');
    }
    // Also trigger the legacy skill system (for ATS analyzer keyword matching)
    var skillInput = document.getElementById('skillInputField');
    if (skillInput) {
      skillInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    updateAutosave();
  }

  var docSkillInput = document.getElementById('docSkillInput');
  if (docSkillInput) {
    docSkillInput.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ',') && docSkillInput.value.trim()) {
        e.preventDefault();
        addDocSkill(docSkillInput.value.trim().replace(/,$/, ''));
        docSkillInput.value = '';
      }
    });
  }

  // Mirror skill pills from the legacy skill system (sidebar tag input)
  var originalPillsContainer = document.getElementById('skillPillsContainer');
  if (originalPillsContainer) {
    var pillObserver = new MutationObserver(function () {
      var pills = originalPillsContainer.querySelectorAll('.skill-tag');
      docSkills = Array.from(pills).map(function (p) {
        return p.dataset.skill || p.textContent.trim().replace('×', '').trim();
      });
      renderDocSkills();
      syncSkillsToTagSystem();
    });
    pillObserver.observe(originalPillsContainer, { childList: true, subtree: true });
  }
  renderDocSkills();
  syncSkillsToTagSystem();

  /* ── 7. SECTION NAV + SCROLL SPY ── */
  window.editorNavTo = function (sectionId, navItem) {
    document.querySelectorAll('.section-nav-item').forEach(function (n) { n.classList.remove('active'); });
    if (navItem) navItem.classList.add('active');
    var el     = document.getElementById(sectionId);
    var scroll = document.getElementById('docEditorScroll');
    if (el && scroll) {
      var offset = el.offsetTop - 24;
      scroll.scrollTo({ top: offset, behavior: 'smooth' });
    }
    var label    = navItem ? navItem.querySelector('.section-nav-name')?.textContent : '';
    var rttLabel = document.getElementById('rttSectionLabel');
    if (rttLabel && label) rttLabel.textContent = label;
  };

  var docScrollArea = document.getElementById('docEditorScroll');
  if (docScrollArea) {
    docScrollArea.addEventListener('scroll', function () {
      var scrollTop = docScrollArea.scrollTop;
      var sections  = [
        'docSection-personal', 'docSection-experience', 'docSection-skills',
        'docSection-education', 'docSection-certs', 'docSection-projects',
        'docSection-achievements', 'docSection-summary'
      ];
      var activeId = sections[0];
      sections.forEach(function (id) {
        var el = document.getElementById(id);
        if (el && el.offsetTop - 40 <= scrollTop) { activeId = id; }
      });
      document.querySelectorAll('.section-nav-item').forEach(function (n) {
        var isActive = n.dataset.target === activeId;
        n.classList.toggle('active', isActive);
      });
      var activeNav = document.querySelector('.section-nav-item.active .section-nav-name');
      var rttLabel  = document.getElementById('rttSectionLabel');
      if (rttLabel && activeNav) rttLabel.textContent = activeNav.textContent;
    });
  }

  /* ── 8. RIGHT PANEL TOGGLE ── */
  window.switchRPanel = function (panel) {
    var ai = document.getElementById('rpanelAI');
    var prev = document.getElementById('rpanelPreview');
    var tabAi = document.getElementById('rpTabAI');
    var tabPrev = document.getElementById('rpTabPreview');
    if (ai) ai.style.display = (panel === 'ai') ? 'flex' : 'none';
    if (prev) prev.style.display = (panel === 'preview') ? 'flex' : 'none';
    if (tabAi) tabAi.classList.toggle('active', panel === 'ai');
    if (tabPrev) tabPrev.classList.toggle('active', panel === 'preview');
  };

  /* ── 9. PREVIEW ZOOM ── */
  var previewScale = 95;
  window.adjustPreviewZoom = function (delta) {
    previewScale = Math.max(30, Math.min(120, previewScale + delta));
    var paper = document.getElementById('previewRpanelPaper');
    var label = document.getElementById('previewScaleLabel');
    if (paper) paper.style.transform = 'scale(' + (previewScale / 100) + ')';
    if (label) label.textContent = previewScale + '%';
  };

  /* ── 10. FORMATTING TOOLBAR ── */
  window.execFmt = function (cmd) {
    document.execCommand(cmd, false, null);
    updateToolbarState();
  };

  function updateToolbarState() {
    ['Bold', 'Italic', 'Underline'].forEach(function (cmd) {
      var btn = document.getElementById('rtt' + cmd);
      if (btn) btn.classList.toggle('active', document.queryCommandState(cmd.toLowerCase()));
    });
  }
  document.addEventListener('selectionchange', updateToolbarState);

  /* ── 11. AUTOSAVE STATUS ── */
  var autosaveTimeout;
  function updateAutosave() {
    var statusEl = document.getElementById('docAutosaveStatus');
    var textEl   = document.getElementById('docSaveStatusText');
    if (!statusEl || !textEl) return;
    statusEl.classList.remove('saved');
    textEl.textContent = 'Saving…';
    clearTimeout(autosaveTimeout);
    autosaveTimeout = setTimeout(function () {
      statusEl.classList.add('saved');
      textEl.textContent = 'Saved';
    }, 1200);
  }

  /* ── 13. SECTION COMPLETION PERCENTAGES ── */
  function updateNavPct(section, pct) {
    var el = document.getElementById('navPct-' + section);
    if (!el) return;
    el.textContent = pct > 0 ? pct + '%' : '—';
    var navItem = el.closest('.section-nav-item');
    if (navItem) navItem.classList.toggle('s-done', pct >= 80);
    // Recalculate overall topbar strength
    var filled  = document.querySelectorAll('.section-nav-item.s-done').length;
    var total   = document.querySelectorAll('.section-nav-item').length || 1;
    var overall = Math.round((filled / total) * 100);
    var pctEl   = document.getElementById('topbarStrengthPct');
    if (pctEl) pctEl.textContent = overall + '%';
    // Also update hidden meter (read by existing script.js strength engine)
    var fillEl = document.getElementById('strengthProgressFill');
    var valEl  = document.getElementById('strengthPercentVal');
    if (fillEl) fillEl.style.width = overall + '%';
    if (valEl)  valEl.textContent  = overall + '% Complete';
  }

  window.updateSectionPct = function () {
    // Personal info
    var name  = (document.getElementById('docFieldName')?.innerText  || '').trim();
    var title = (document.getElementById('docFieldTitle')?.innerText || '').trim();
    updateNavPct('personal', (name ? 50 : 0) + (title ? 50 : 0));
    // Summary
    var summary = (document.getElementById('docFieldSummary')?.innerText || '').trim();
    updateNavPct('summary', summary.length > 40 ? 100 : Math.round(summary.length / 40 * 100));
    // Education
    var edu = (document.getElementById('docFieldEducation')?.innerText || '').trim();
    updateNavPct('education', edu.length > 5 ? 100 : 0);
    // Certifications
    var certs = (document.getElementById('docFieldCerts')?.innerText || '').trim();
    updateNavPct('certs', certs.length > 5 ? 100 : 0);
  };

  /* ── 14. AI WRITING ASSISTANT & CHAT ── */
  window.sendAiAction = async function (promptText) {
    if (!promptText) return;
    appendUserMsg(promptText);
    switchRPanel('ai');

    // Loading indicator
    var area = document.getElementById('aiChatMessages');
    var loadingDiv = document.createElement('div');
    loadingDiv.className = 'ai-msg from-ai loading';
    loadingDiv.innerHTML =
      '<div class="ai-msg-meta">AI Copilot</div>' +
      '<span class="pulse" style="font-style:italic;color:#6b7280;">Generating AI optimization suggestions…</span>';
    if (area) {
      area.appendChild(loadingDiv);
      area.scrollTop = area.scrollHeight;
    }

    // Gather current document state
    var name       = (document.getElementById('docFieldName')?.innerText   || '').trim();
    var jobTitle   = (document.getElementById('docFieldTitle')?.innerText  || document.getElementById('inputJobTitle')?.value || '').trim();
    var summary    = (document.getElementById('docFieldSummary')?.innerText || document.getElementById('inputSummary')?.value  || '').trim();
    var experience = docBullets.filter(Boolean).join('\n') || (document.getElementById('bulletPoints')?.value || '').trim();
    var skills     = docSkills.length > 0 ? docSkills.join(', ') : (document.getElementById('previewSkills')?.textContent || '');

    // Determine target section
    var targetSection = 'summary';
    var targetText    = summary;
    if (/summary|about/i.test(promptText)) {
      targetSection = 'summary';
      targetText    = summary || experience;
    } else if (/bullet|experience|work|quantify|star|achievement|action/i.test(promptText)) {
      targetSection = 'experience';
      targetText    = experience || summary;
    } else if (/skill|tag/i.test(promptText)) {
      targetSection = 'skills';
      targetText    = skills;
    } else if (/ats|executive|technical|tone|improve/i.test(promptText)) {
      targetSection = summary.length > 20 ? 'summary' : 'experience';
      targetText    = targetSection === 'summary' ? summary : experience;
    }

    try {
      const optResp = await fetch('/api/optimize-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: targetSection, text: targetText, action: promptText, jobTitle, skills })
      });

      let rewrittenText = '';
      let suggestedSkills = [];

      if (optResp.ok) {
        const optData = await optResp.json();
        if (optData) {
          if (Array.isArray(optData.suggestedSkills)) {
            suggestedSkills = optData.suggestedSkills;
          }

          let rawRes = optData.optimizedText || optData.optimizedBulletPoints || '';
          if (Array.isArray(rawRes)) {
            rewrittenText = rawRes.join('\n');
          } else if (typeof rawRes === 'string') {
            rewrittenText = rawRes;
          }
        }
      }

      if (loadingDiv && loadingDiv.parentNode) loadingDiv.parentNode.removeChild(loadingDiv);

      if (rewrittenText) {
        // Clean text formatting
        if (targetSection === 'summary') {
          rewrittenText = rewrittenText.replace(/^[\s•\-\*]+/gm, '').replace(/\s+/g, ' ').trim();
          const sumEl    = document.getElementById('docFieldSummary');
          const inputSum = document.getElementById('inputSummary');
          if (sumEl)    sumEl.innerText  = rewrittenText;
          if (inputSum) inputSum.value   = rewrittenText;
          if (typeof syncLivePreview === 'function')     syncLivePreview();
          if (typeof autoSaveFormFields === 'function')  autoSaveFormFields();
          if (typeof showToast === 'function') showToast('Summary optimized with AI!', 'success');
        } else if (targetSection === 'experience') {
          const bulletsArr = rewrittenText.split('\n').map(b => b.replace(/^[\s•\-\*]+/, '').trim()).filter(Boolean);
          if (typeof window.setDocBullets === 'function') window.setDocBullets(bulletsArr);
          if (typeof showToast === 'function') showToast('Experience bullets optimized with AI!', 'success');
        } else if (targetSection === 'skills') {
          const newSkills = rewrittenText
            .split(/[,•\n]+/)
            .map(s => s.trim().replace(/^[\s•\-\*]+/, ''))
            .filter(Boolean);
          newSkills.forEach(s => window.addDocSkill?.(s));
          if (typeof showToast === 'function') showToast('Skills updated with AI!', 'success');
        }

        // Add suggested skills if returned
        if (suggestedSkills.length > 0) {
          suggestedSkills.forEach(s => window.addDocSkill?.(s));
        }

        appendAiMsg(
          '<b>AI Rewritten Content:</b><br>' +
          escapeHTML(rewrittenText).replace(/\n/g, '<br>') +
          '<br><br><i>✓ Applied directly to your resume.</i>',
          true
        );
      } else {
        // Fallback: call ats-chat API for conversational reply
        const chatResp = await fetch('/api/ats-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userMessage: promptText,
            resumeText: [name, jobTitle, summary, experience].filter(Boolean).join('\n'),
            jobTitle
          })
        });
        if (chatResp.ok) {
          const chatData = await chatResp.json();
          appendAiMsg(chatData.reply || chatData.response || 'AI suggestion ready.');
        } else {
          appendAiMsg('<b>AI Advice:</b> Focus on metrics and strong action verbs (e.g. <i>Architected, Scaled, Decreased</i>).');
        }
      }
    } catch (err) {
      if (loadingDiv && loadingDiv.parentNode) loadingDiv.parentNode.removeChild(loadingDiv);
      appendAiMsg(
        '<b>AI Suggestion for "' + escapeHTML(promptText) + '":</b><br>' +
        '• Quantify impacts: Add numbers (e.g., <i>"Scaled system by 250% to 50k req/sec"</i>).<br>' +
        '• Align keywords with your target role: ' + (jobTitle || 'Software Engineer') + '.',
        true
      );
    }
  };

  window.submitAiChat = function () {
    var input = document.getElementById('aiChatInput');
    if (!input || !input.value.trim()) return;
    var msg = input.value.trim();
    input.value = '';
    sendAiAction(msg);
  };

  function appendUserMsg(text) {
    var area = document.getElementById('aiChatMessages');
    if (!area) return;
    var div = document.createElement('div');
    div.className = 'ai-msg from-user';
    div.innerHTML = '<div class="ai-msg-meta">YOU</div>' + escapeHTML(text);
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
  }

  function appendAiMsg(text, isHtml) {
    var area = document.getElementById('aiChatMessages');
    if (!area) return;
    var div = document.createElement('div');
    div.className = 'ai-msg from-ai';
    var contentHtml = isHtml ? text : escapeHTML(text).replace(/\n/g, '<br>');
    div.innerHTML = '<div class="ai-msg-meta">AI Copilot</div>' + contentHtml;
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
  }

  // Enter key in AI chat input
  var chatInput = document.getElementById('aiChatInput');
  if (chatInput) {
    chatInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitAiChat(); }
    });
  }

  /* ── 15. SECTION COLLAPSE TOGGLE ── */
  window.toggleDocSection = function (sectionId) {
    var section = document.getElementById(sectionId);
    if (!section) return;
    var fields    = section.querySelectorAll(
      '.doc-field, .doc-contact-grid, .doc-bullets-list, .doc-add-bullet-btn, ' +
      '.doc-verb-chips, .doc-skills-wrapper, .doc-skill-suggestions, .doc-xyz-strip'
    );
    var collapsed = section.dataset.collapsed === 'true';
    fields.forEach(function (f) { f.style.display = collapsed ? '' : 'none'; });
    section.dataset.collapsed = collapsed ? 'false' : 'true';
  };

  /* ── 16. XYZ METER OBSERVER ── */
  var xyzScore = document.getElementById('xyzMeterScore');
  if (xyzScore) {
    var xyzObs = new MutationObserver(function () {
      var display = document.getElementById('xyzMeterScoreDisplay');
      var aiLabel = document.getElementById('aiXyzScoreLabel');
      if (display) display.textContent = xyzScore.textContent || 'Add bullets';
      if (aiLabel) {
        var m = xyzScore.textContent.match(/(\d+)%/);
        aiLabel.textContent = m ? m[1] + '%' : '0%';
      }
    });
    xyzObs.observe(xyzScore, { childList: true, characterData: true, subtree: true });
  }

  /* ── 17. KEYBOARD SHORTCUTS ── */
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      updateAutosave();
    }
  });

  /* ── INIT ── */
  updateSectionPct();

  // ─────────────────────────────────────────────────────────────
  // BLOCK 2: ATS ANALYZER UI HELPERS
  // ─────────────────────────────────────────────────────────────

  /* Switch sidebar category and scroll to section */
  window.switchAtsCategory = function (targetId, el) {
    document.querySelectorAll('.ats-cat-item').forEach(function (c) { c.classList.remove('active'); });
    if (el) el.classList.add('active');
    var target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  /* Collapse / expand an ATS report block */
  window.toggleReportBlock = function (headerEl) {
    if (!headerEl) return;
    var block = headerEl.closest('.ats-report-block, .ats-keyword-intelligence-box');
    if (!block) return;
    var body = block.querySelector('.ats-report-body');
    if (!body) {
      var children = Array.from(block.children);
      var nonHeaders = children.filter(function(c) {
        return c !== headerEl && !c.classList.contains('ats-kw-sec-header') && !c.classList.contains('ats-report-header');
      });
      if (nonHeaders.length > 0) {
        var isHidden = window.getComputedStyle(nonHeaders[0]).display === 'none';
        nonHeaders.forEach(function(c) { c.style.display = isHidden ? 'block' : 'none'; });
      }
      return;
    }
    var currentDisp = window.getComputedStyle(body).display;
    body.style.display = (currentDisp === 'none') ? 'block' : 'none';
  };

  /* Insert a suggested keyword sentence into the ATS chat */
  window.insertKeywordSentence = function (keyword) {
    var chatContainer = document.getElementById('atsChatMsgContainer');
    if (!chatContainer) return;

    var userMsg = document.createElement('div');
    userMsg.className   = 'ats-chat-msg user';
    userMsg.textContent = 'How should I add "' + keyword + '" to my resume?';
    chatContainer.appendChild(userMsg);

    setTimeout(function () {
      var aiMsg = document.createElement('div');
      aiMsg.className = 'ats-chat-msg ai';
      aiMsg.innerHTML =
        '<b>Suggested Bullet for ' + keyword + ':</b><br>' +
        '"Spearheaded enterprise implementation of <b>' + keyword + '</b> and automated CI/CD workflows, ' +
        'improving application uptime to 99.99%."';
      chatContainer.appendChild(aiMsg);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 400);
  };

  /* Pre-fill the ATS chat input and submit */
  window.sendAtsChatPrompt = function (promptText) {
    var input = document.getElementById('atsChatInputField');
    if (input) {
      input.value = promptText;
      submitAtsChat();
    }
  };

  /* Submit a message to the ATS Career Coach AI */
  window.submitAtsChat = async function () {
    var input         = document.getElementById('atsChatInputField');
    var chatContainer = document.getElementById('atsChatMsgContainer');
    if (!input || !input.value.trim() || !chatContainer) return;

    var text  = input.value.trim();
    input.value = '';

    var userMsg = document.createElement('div');
    userMsg.className   = 'ats-chat-msg user';
    userMsg.textContent = text;
    chatContainer.appendChild(userMsg);

    var loadingMsg = document.createElement('div');
    loadingMsg.className = 'ats-chat-msg ai';
    loadingMsg.innerHTML = 'Analyzing...';
    chatContainer.appendChild(loadingMsg);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    var resumeText   = window.atsAnalyzer ? window.atsAnalyzer.getResumeText() : '';
    var jdInput      = document.getElementById('atsJdInput') || document.getElementById('atsTargetJdInput');
    var jdText       = jdInput ? jdInput.value : '';
    var sampleSelect = document.getElementById('sampleJdSelect');
    var jobTitle     = (sampleSelect && sampleSelect.options[sampleSelect.selectedIndex])
      ? sampleSelect.options[sampleSelect.selectedIndex].text
      : 'Target Role';
    var currentScore = document.getElementById('scoreNumber')
      ? document.getElementById('scoreNumber').textContent.replace('%', '')
      : '';

    var lastResult      = window.atsLastResult || {};
    var missingKeywords = Array.isArray(lastResult.missingKeywords) ? lastResult.missingKeywords : [];
    var matchedKeywords = Array.isArray(lastResult.matchedKeywords) ? lastResult.matchedKeywords : [];

    var FALLBACK_MSG =
      '<b>ATS Career Coach Advice:</b><br>' +
      'To maximize your match rate, ensure your Work Experience includes quantified metrics ' +
      '(e.g. % performance improvement, team size, scale) alongside core skills required for this job description.';

    try {
      var response = await fetch('/api/ats-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: text,
          jobTitle: jobTitle,
          jobDescription: jdText,
          resumeText: resumeText,
          currentScore: currentScore,
          missingKeywords: missingKeywords,
          matchedKeywords: matchedKeywords
        })
      });

      function formatAiMarkdownResponse(str) {
        if (!str) return '';
        return str
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
          .replace(/\*(.*?)\*/g, '<i>$1</i>')
          .replace(/`([^`]+)`/g, '<code>$1</code>')
          .replace(/\r?\n/g, '<br>');
      }

      if (response.ok) {
        var replyJson = await response.json();
        loadingMsg.innerHTML = formatAiMarkdownResponse(replyJson.reply || 'Here is how you can improve your resume...');
      } else {
        loadingMsg.innerHTML = FALLBACK_MSG;
      }
    } catch (err) {
      loadingMsg.innerHTML = FALLBACK_MSG;
    }

    chatContainer.scrollTop = chatContainer.scrollHeight;
  };

  /* ─────────────────────────────────────────────────────────────
     GOOGLE SOFTWARE DEVELOPER RESUME TEMPLATE ENGINE
     ───────────────────────────────────────────────────────────── */
  window.loadGoogleDevTemplate = function() {
    // 1. Personal Details
    const personal = {
      docFieldName: 'YOUR NAME',
      docFieldTitle: 'Software Developer | Full Stack Developer',
      docFieldEmail: 'email@example.com',
      docFieldPhone: '+91 XXXXX XXXXX',
      docFieldLocation: 'City, India',
      docFieldLinkedin: 'linkedin.com/in/yourname',
      docFieldGithub: 'github.com/yourname',
      docFieldPortfolio: 'yourportfolio.dev'
    };

    if (window.personalEngine) {
      Object.keys(personal).forEach(function(id) {
        const el = document.getElementById(id);
        if (el) {
          el.innerText = personal[id];
          window.personalEngine.updateEmptyState(el);
          window.personalEngine.syncField(el);
        }
      });
    }
    const fn = document.getElementById('inputFullName');
    const jt = document.getElementById('inputJobTitle');
    const em = document.getElementById('inputEmail');
    const ph = document.getElementById('inputPhone');
    const lc = document.getElementById('inputLocation');
    const li = document.getElementById('inputLinkedin');
    const gh = document.getElementById('inputGithub');
    const pf = document.getElementById('inputPortfolio');
    if (fn) fn.value = personal.docFieldName;
    if (jt) jt.value = personal.docFieldTitle;
    if (em) em.value = personal.docFieldEmail;
    if (ph) ph.value = personal.docFieldPhone;
    if (lc) lc.value = personal.docFieldLocation;
    if (li) li.value = personal.docFieldLinkedin;
    if (gh) gh.value = personal.docFieldGithub;
    if (pf) pf.value = personal.docFieldPortfolio;

    // 2. Professional Summary
    const summaryText = 'B.Tech Computer Science student with strong foundations in Java, JavaScript, SQL, DSA, OOP and web development, experienced in building full-stack applications and solving real-world problems through software projects. Seeking opportunities to apply technical skills in software development and contribute to scalable, user-focused products.';
    const sumEl = document.getElementById('docFieldSummary');
    const inputSum = document.getElementById('inputSummary');
    if (sumEl) sumEl.innerText = summaryText;
    if (inputSum) inputSum.value = summaryText;

    // 3. Technical Skills
    const skillsList = [
      'Java', 'JavaScript', 'C++', 'Python', 'SQL',
      'HTML5', 'CSS3', 'React.js', 'Node.js', 'Express.js', 'Spring Boot',
      'MySQL', 'PostgreSQL', 'MongoDB',
      'Git', 'GitHub', 'VS Code', 'Maven',
      'DSA', 'OOP', 'DBMS', 'REST APIs', 'Computer Networks'
    ];
    if (typeof window.addDocSkill === 'function') {
      skillsList.forEach(function(skill) {
        window.addDocSkill(skill);
      });
    }

    // 4. Projects (Exact User Template Structure)
    const projectsText = [
      '### Project Name — Full Stack Web Application',
      '**Tech Stack:** React.js, Node.js, Express.js, PostgreSQL, Supabase',
      '* Developed a full-stack web application for [problem/use case].',
      '* Implemented [important feature] using [technology].',
      '* Designed responsive and accessible user interfaces using React.js and CSS.',
      '* Built secure REST APIs and integrated PostgreSQL/Supabase for data management.',
      '* Improved [performance/security/usability] by X% through [specific implementation].',
      '',
      '### Project Name — Java Application',
      '**Tech Stack:** Java, JDBC, MySQL, Maven',
      '* Built a Java-based application for [purpose].',
      '* Implemented CRUD operations using JDBC and MySQL.',
      '* Applied OOP principles including encapsulation, inheritance and polymorphism.',
      '* Added input validation and exception handling for reliable application behavior.',
      '',
      '### Project Name — [Project Type]',
      '**Tech Stack:** HTML, CSS, JavaScript / React / [Other Technologies]',
      '* Developed [what the application does].',
      '* Implemented [2–3 major technical features].',
      '* Created a responsive interface optimized for desktop and mobile devices.',
      '* Used [API/database/authentication/etc.] to provide [functionality].'
    ].join('\n');

    const projEl = document.getElementById('docFieldProjects');
    const inputProj = document.getElementById('inputProjects');
    if (projEl) projEl.innerText = projectsText;
    if (inputProj) inputProj.value = projectsText;

    // 5. Education
    const eduText = [
      '### Bachelor of Technology — Computer Science & Engineering',
      '**University / College Name**, City, India',
      '2025 – 2029 | CGPA: X.XX / 10'
    ].join('\n');
    const eduEl = document.getElementById('docFieldEducation');
    const inputEdu = document.getElementById('inputEducation');
    if (eduEl) eduEl.innerText = eduText;
    if (inputEdu) inputEdu.value = eduText;

    // 6. Experience / Internships bullets
    const expBullets = [
      'Developed and maintained [application/system] using [technologies].',
      'Implemented [feature], improving [metric/result].',
      'Collaborated with [team] to deliver [feature/project].',
      'Debugged and optimized [system/application].'
    ];
    if (typeof window.setDocBullets === 'function') {
      window.setDocBullets(expBullets);
    }
    const bpInput = document.getElementById('bulletPoints');
    if (bpInput) {
      bpInput.value = expBullets.map(b => '* ' + b).join('\n');
    }

    // 7. Achievements
    const achText = [
      '* Participated in [Hackathon Name] and developed [project].',
      '* Secured [rank/position] in [competition].',
      '* Solved XXX+ coding problems across [platforms].',
      '* [Other relevant achievement].'
    ].join('\n');
    const achEl = document.getElementById('docFieldAchievements');
    const inputAch = document.getElementById('inputAchievements');
    if (achEl) achEl.innerText = achText;
    if (inputAch) inputAch.value = achText;

    // 8. Certifications
    const certsText = [
      '* Certification Name — Issuing Organization',
      '* Certification Name — Issuing Organization',
      '* Certification Name — Issuing Organization'
    ].join('\n');
    const certsEl = document.getElementById('docFieldCerts');
    const inputCerts = document.getElementById('inputCertifications');
    if (certsEl) certsEl.innerText = certsText;
    if (inputCerts) inputCerts.value = certsText;

    // 9. Leadership / Extracurricular Activities
    const leadText = [
      '* Position/Role, Organization — Brief contribution.',
      '* Position/Role, Organization — Brief contribution.'
    ].join('\n');
    const leadEl = document.getElementById('docFieldCustom');
    const inputLead = document.getElementById('inputCustom');
    if (leadEl) leadEl.innerText = leadText;
    if (inputLead) inputLead.value = leadText;

    if (typeof window.updateSectionPct === 'function') {
      window.updateSectionPct();
    }
    if (typeof window.syncLivePreview === 'function') {
      window.syncLivePreview();
    }
    if (typeof window.autoSaveFormFields === 'function') {
      window.autoSaveFormFields();
    }
    if (typeof window.showToast === 'function') {
      window.showToast('Software Developer Resume Template Loaded!', 'success');
    }
  };

  // Auto-initialize default template if empty
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
      const docName = document.getElementById('docFieldName');
      if (docName && (!docName.innerText || docName.innerText.trim() === '' || docName.innerText.trim() === 'Alex Rivera')) {
        window.loadGoogleDevTemplate();
      }
    }, 200);
  });

})();
