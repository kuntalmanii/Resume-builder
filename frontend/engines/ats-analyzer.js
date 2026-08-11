/**
 * ResuAI // ATS Diagnostic Engine Module (ats-analyzer.js)
 * Computes ATS match scores, renders analytical breakdown UI,
 * and proxies Gemini AI diagnostic scans via /api/ats-analyze.
 */

class AtsAnalyzer {
  constructor() {
    this.currentScore      = 0;
    this.extractedKeywords = [];
    this.missingKeywords   = [];
    this.initialized       = false;
    this.isScanning        = false;
    this.lastResult        = null;
  }

  init() {
    if (this.initialized) return;
    this.bindAtsScanButton();
    this.bindSampleJdSelector();
    this.bindFileUpload();
    this.bindAddKeywordBtns();
    this.bindExportReportButton();
    // Do NOT auto-run or show fake default data — wait for user action
    this.initialized = true;
  }

  bindExportReportButton() {
    ['btnExportAtsReport', 'btnExportAuditSidebar'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn && !btn.dataset.boundExport) {
        btn.dataset.boundExport = 'true';
        btn.addEventListener('click', e => { e.preventDefault(); this.exportAnalysisPdf(); });
      }
    });
  }

  bindAtsScanButton() {
    const btn = document.getElementById('btnRunAtsAnalysis');
    if (btn && !btn.dataset.boundAts) {
      btn.dataset.boundAts = 'true';
      btn.addEventListener('click', e => { e.preventDefault(); this.runAtsScan(); });
    }
  }

  bindSampleJdSelector() {
    const sel = document.getElementById('sampleJdSelect');
    if (!sel || sel.dataset.boundAts) return;
    sel.dataset.boundAts = 'true';
    sel.addEventListener('change', () => {
      const val = sel.value;
      if (!val) return;
      const jdInput = document.getElementById('atsJdInput');
      if (jdInput) {
        jdInput.value = SAMPLE_JD_TEMPLATES[val] || '';
        jdInput.style.display = 'block';
      }
    });
  }

  bindFileUpload() {
    const input = document.getElementById('pdfFileInput');
    const btn   = document.getElementById('btnSelectPdfFile');
    if (btn && !btn.dataset.boundAts) {
      btn.dataset.boundAts = 'true';
      btn.addEventListener('click', () => input && input.click());
    }
    if (input && !input.dataset.boundAts) {
      input.dataset.boundAts = 'true';
      input.addEventListener('change', e => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fn   = document.getElementById('selectedFileName');
        const badge= document.getElementById('selectedFileBadge');
        if (fn) fn.textContent = file.name;
        if (badge) badge.style.display = 'inline-flex';

        const reader = new FileReader();
        reader.onload = ev => { window.uploadedFileText = ev.target.result || ''; };
        reader.readAsText(file);
      });
    }
  }

  bindAddKeywordBtns() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('.tag-add-btn');
      if (!btn || btn.classList.contains('added')) return;
      const keyword = btn.dataset.keyword;
      if (!keyword) return;
      // Try adding to skills container
      const container = document.getElementById('skillsTagsContainer');
      if (container) {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.innerHTML = `${this.escapeHTML(keyword)}<span class="tag-remove" onclick="this.parentElement.remove()">×</span>`;
        container.appendChild(tag);
      }
      btn.textContent = 'Added ✓';
      btn.classList.add('added');
      btn.style.pointerEvents = 'none';
      if (typeof showToast === 'function') showToast(`"${keyword}" added to your skills!`, 'success');
    });
  }

  /** Extract full resume text from all available sources */
  getResumeText() {
    let text = (window.uploadedFileText || '').trim();
    const editorBody    = document.querySelector('.doc-editor-body');
    const printableDoc  = document.getElementById('printableResumeDoc') || document.querySelector('.preview-paper-sheet');
    if (editorBody?.innerText)   text += '\n' + editorBody.innerText.trim();
    if (printableDoc?.innerText) text += '\n' + printableDoc.innerText.trim();

    const fields = ['fullName','jobTitle','inputFullName','inputJobTitle','bulletPoints','inputProjects','inputAchievements'];
    fields.forEach(id => { const el = document.getElementById(id); if (el?.value) text += ' ' + el.value; });
    document.querySelectorAll('#skillsTagsContainer .tag').forEach(tag => {
      const clean = tag.textContent.replace(/[×\u00d7]/g,'').trim();
      if (clean) text += ' ' + clean;
    });
    return text.trim();
  }

  /* ─── Proxy Gemini AI Backend ─── */
  async runAtsScan() {
    if (this.isScanning) return;
    this.isScanning = true;

    const btnScan       = document.getElementById('btnRunAtsAnalysis');
    const btnText       = document.getElementById('btnRunAtsText');
    const jdInput       = document.getElementById('atsJdInput');
    const loadingState  = document.getElementById('atsLoadingState');
    const atsResults    = document.getElementById('ats-results');
    const progressFill  = document.getElementById('atsProgressFill');
    const progressPct   = document.getElementById('atsProgressPercent');
    const stepText      = document.getElementById('loadingStepText');

    const resumeContent = this.getResumeText();
    let   jdText        = jdInput?.value?.trim() || '';

    // Check for preset JD from select
    if (!jdText) {
      const sel = document.getElementById('sampleJdSelect');
      const val = sel?.value;
      if (val && SAMPLE_JD_TEMPLATES[val]) {
        jdText = SAMPLE_JD_TEMPLATES[val];
        if (jdInput) { jdInput.value = jdText; jdInput.style.display = 'block'; }
      }
    }

    if (!jdText) {
    if (typeof showToast === 'function') showToast('Please paste a Job Description or select a preset role above before scanning.', 'warning');
      this.isScanning = false;
      return;
    }

  if (!resumeContent) {
      if (typeof showToast === 'function') showToast('No resume content found. Please build your resume or upload a file first.', 'warning');
      this.isScanning = false;
      return;
    }

    const origBtnHTML = btnScan ? btnScan.innerHTML : '';
    if (btnScan)  { btnScan.disabled = true; }
    if (btnText)  { btnText.textContent = 'Scanning...'; }
    if (atsResults)   atsResults.style.display = 'none';
    if (loadingState) { loadingState.style.display = 'flex'; loadingState.scrollIntoView({ behavior:'smooth' }); }

    let progress = 0;
    const timer = setInterval(() => {
      progress = Math.min(progress + 8, 90);
      if (progressFill) progressFill.style.width = `${progress}%`;
      if (progressPct)  progressPct.textContent  = `${progress}%`;
      if (stepText) {
        if (progress < 25)      stepText.textContent = 'Connecting to Gemini AI Engine...';
        else if (progress < 55) stepText.textContent = 'Parsing resume against job requirements...';
        else if (progress < 80) stepText.textContent = 'Generating ATS diagnostic report...';
        else                    stepText.textContent = 'Computing hiring probability...';
      }
      if (progress >= 90) clearInterval(timer);
    }, 80);

    try {
      const response = await fetch('/api/ats-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText:   resumeContent,
          jobDescription: jdText,
          jdText,
          geminiModel:  window.getActiveSettings?.()?.geminiModel || ''
        })
      });

      clearInterval(timer);
      if (progressFill) progressFill.style.width = '100%';
      if (progressPct)  progressPct.textContent  = '100%';

      let data = null;
      if (response.ok) {
        try { data = await response.json(); } catch(_) {}
      }

      // If API key missing (400), fall back to local heuristic
      if (!data || response.status === 400) {
        data = this.localFallback(resumeContent, jdText);
      }

      this.lastResult = data;
      window.atsLastResult = data; // expose for script.js cross-section reads

      setTimeout(() => {
        if (loadingState) loadingState.style.display = 'none';
        this.renderBreakdownUi(data);
        if (atsResults) { atsResults.style.display = 'flex'; atsResults.scrollIntoView({ behavior:'smooth' }); }

        // ── Sync: push ATS score into Score Analytics history ──
        if (typeof window.recordNewScanResult === 'function') {
          window.recordNewScanResult(data.score);
        }
      }, 300);

      if (window.checklistManager) window.checklistManager.markTaskComplete('analyze_resume');

    } catch (err) {
      clearInterval(timer);
      console.warn('[ATS] Network error, using local fallback:', err.message);
      if (loadingState) loadingState.style.display = 'none';
      const local = this.localFallback(resumeContent, jdText);
      this.lastResult = local;
      window.atsLastResult = local;
      this.renderBreakdownUi(local);
      if (atsResults) { atsResults.style.display = 'flex'; atsResults.scrollIntoView({ behavior:'smooth' }); }

      // ── Sync: push fallback score into Score Analytics ──
      if (typeof window.recordNewScanResult === 'function') {
        window.recordNewScanResult(local.score);
      }
    } finally {
      if (btnScan)  { btnScan.disabled = false; btnScan.innerHTML = origBtnHTML; }
      this.isScanning = false;
    }
  }

  /* ─── Client-side heuristic fallback ─── */
  localFallback(resumeText, jdText) {
    const commonKws = [
      'javascript','typescript','react','next.js','node.js','express','python','django','fastapi',
      'docker','kubernetes','aws','gcp','postgresql','mongodb','graphql','rest api','ci/cd','git',
      'microservices','unit testing','system design','redis','kafka','web vitals','performance','agile','scrum','sql','html','css'
    ];
    const jdLower  = jdText.toLowerCase();
    const resLower = resumeText.toLowerCase();
    let targets    = commonKws.filter(kw => jdLower.includes(kw));
    if (targets.length === 0) {
      const words   = jdText.match(/\b[A-Za-z]{4,}\b/g)||[];
      const stops   = new Set(['and','the','with','for','you','are','our','will','have','this','that','from','your','requirements','experience']);
      targets = [...new Set(words.map(w=>w.toLowerCase()).filter(w=>!stops.has(w)))].slice(0,10);
    }
    const matched  = targets.filter(kw => resLower.includes(kw));
    const missing  = targets.filter(kw => !resLower.includes(kw));
    const score    = targets.length ? Math.round((matched.length/targets.length)*100) : 0;
    const hasNums  = /\d+[%x+]|\$\d+/.test(resumeText);
    const hasVerbs = /(managed|led|architected|engineered|built|optimized|spearheaded|implemented|developed)\b/i.test(resumeText);

    return {
      score,
      verdict: score>=85?'SHORTLIST':score>=70?'HOLD':'REJECT',
      matchedKeywords: matched,
      missingKeywords: missing,
      recommendations: [
        missing.length>0 ? `Add missing skills (${missing.slice(0,4).join(', ')}) into your experience bullets.` : 'Great keyword coverage!',
        !hasNums  ? 'Add quantified metrics (%, $, user counts) to every bullet point.' : 'Good use of metrics.',
        !hasVerbs ? 'Start bullets with strong action verbs (Architected, Engineered, Optimized).' : 'Strong action verb usage detected.',
        'Ensure skills appear in work experience context, not only in a standalone Skills section.'
      ],
      recruiterVerdict: score>=75
        ? 'This candidate demonstrates reasonable alignment with the role requirements and would likely clear automated ATS filters.'
        : `Moderate gaps detected. Adding ${missing.slice(0,3).join(', ')} in context would significantly boost ATS ranking.`,
      hiringProbability: {
        interview:  score>=85?'89%':score>=70?'71%':'47%',
        offer:      score>=85?'80%':score>=70?'58%':'30%',
        atsGatePass:score>=85?'96%':score>=70?'78%':'49%'
      },
      smartRewrites: [],
      sectionScores: {
        keywordMatch:    score,
        skillsAlignment: Math.min(100,Math.round(score*0.95)),
        formattingATS:   92,
        experienceImpact:hasNums?85:58,
        metricDensity:   hasNums?74:38,
        educationCerts:  100,
        readabilityScore:88,
        actionVerbs:     hasVerbs?82:50
      }
    };
  }

  /* ─── Render full breakdown UI from API result ─── */
  renderBreakdownUi(data) {
    const {
      score:rawScore=0,
      matchedKeywords:matched=[],
      missingKeywords:missing=[],
      recommendations=[],
      recruiterVerdict='',
      hiringProbability={},
      smartRewrites=[],
      sectionScores={}
    } = data;

    const score = Math.min(100, Math.max(0, parseInt(rawScore,10)||0));

    // ── Score ring ──
    const scoreEl   = document.getElementById('scoreNumber');
    const circle    = document.getElementById('scoreCircle');
    const scoreBadge= document.getElementById('atsScoreBadge');
    const ringProg  = document.getElementById('atsScoreRingProgress');
    const statusBadge=document.getElementById('analysisStatusBadge');

    if (scoreEl)    scoreEl.textContent  = `${score}%`;
    if (scoreBadge) scoreBadge.textContent = `${score}% Match`;
    if (circle) {
      const color = score>=80?'#10b981':score>=60?'#f59e0b':'#ef4444';
      circle.style.background = `conic-gradient(${color} 0% ${score}%, rgba(128,128,128,0.18) ${score}% 100%)`;
    }
    if (ringProg) {
      const offset = 283 - (283*score/100);
      ringProg.style.strokeDashoffset = offset;
    }
    if (statusBadge) {
      statusBadge.textContent = score>=75 ? 'Passed ATS Gatekeeper' : 'Review Suggested';
      statusBadge.className   = `badge-tag ${score>=75?'green':'amber'}`;
    }

    // ── Summary heading ──
    const h = document.getElementById('scoreSummaryHeading');
    const d = document.getElementById('scoreSummaryDesc');
    if (h && d) {
      if (score>=85)      { h.textContent = 'Excellent ATS Compatibility';        d.textContent = `Your resume matches ${score}% of core qualifications. Strong position for this role.`; }
      else if (score>=65) { h.textContent = 'Moderate Match — Action Required';   d.textContent = `Your resume matches ${score}% of requirements. Add missing keywords to boost ATS rank.`; }
      else                { h.textContent = 'Low Match — Critical Keyword Gaps';  d.textContent = `Your resume matches ${score}% of requirements. Incorporate missing skills urgently.`; }
    }

    // ── KPI metrics ──
    const ss = sectionScores;
    this.setEl('kpiEstPassRate',  `${Math.min(99,score+2)}%`);
    this.setEl('kpiReadability',  `${(7.5+(score/100)*2.3).toFixed(1)} / 10`);
    this.setEl('kpiHiringProb',   score>=80?'High':score>=60?'Moderate':'Low');
    this.setEl('kpiQualityScore', score>=85?'Top 5%':score>=70?'Top 20%':'Top 50%');

    // ── Score matrix bars (using real section_scores) ──
    const mKw     = ss.keywordMatch    ?? score;
    const mExp    = ss.experienceImpact?? Math.min(98,score+5);
    const mSkills = ss.skillsAlignment ?? Math.min(95,score+3);
    const mMetric = ss.metricDensity   ?? Math.max(40,score-8);

    this.setEl('matrixScoreKw',     `${mKw}%`);
    this.setEl('matrixScoreExp',    `${mExp}%`);
    this.setEl('matrixScoreSkills', `${mSkills}%`);
    this.setEl('matrixScoreMetric', `${mMetric}%`);
    this.setBarWidth('matrixFillKw',     mKw);
    this.setBarWidth('matrixFillExp',    mExp);
    this.setBarWidth('matrixFillSkills', mSkills);
    this.setBarWidth('matrixFillMetric', mMetric);

    // ── Category sidebar badges (real scores) ──
    const catMap = {
      catBadgeKw:     ss.keywordMatch    ?? score,
      catBadgeExp:    ss.experienceImpact?? Math.min(98,score+5),
      catBadgeSkills: ss.skillsAlignment ?? Math.min(95,score+3),
      catBadgeEdu:    ss.educationCerts  ?? 100,
      catBadgeFmt:    ss.formattingATS   ?? 95,
      catBadgeRead:   ss.readabilityScore?? 96,
      catBadgeDensity:ss.metricDensity   ?? Math.max(40,score-8),
      catBadgeVerbs:  ss.actionVerbs     ?? Math.min(96,score+5)
    };
    Object.entries(catMap).forEach(([id,val]) => this.setEl(id, `${val}%`));

    // ── Keyword counts subtitle ──
    this.setEl('kwCountsSubtitle', `${matched.length} Matched · ${missing.length} Gaps`);

    // ── Matched keywords ──
    const matchTitle = document.getElementById('matchedKeywordsTitle');
    const matchBox   = document.getElementById('matchedKeywordsContainer');
    if (matchTitle) matchTitle.innerHTML = `✓ Matched Required Keywords (${matched.length})`;
    if (matchBox) {
      matchBox.innerHTML = matched.length>0
        ? matched.map(kw=>`<span class="badge-tag green">${this.escapeHTML(kw)}</span>`).join('')
        : `<span class="badge-tag amber">No specific keywords detected — ensure your resume includes relevant technical terms.</span>`;
    }

    // ── Missing keywords ──
    const existingSkills = new Set(
      Array.from(document.querySelectorAll('#skillsTagsContainer .tag'))
        .map(t=>t.textContent.replace(/[×\u00d7]/g,'').trim().toLowerCase())
    );
    const missTitle = document.getElementById('missingKeywordsTitle');
    const missBox   = document.getElementById('missingKeywordsContainer') || document.getElementById('atsMissingBadgeList');
    if (missTitle) missTitle.innerHTML = `⚠ Missing / Gap Keywords (${missing.length})`;
    if (missBox) {
      missBox.innerHTML = missing.length>0
        ? missing.map(kw => {
            const added = existingSkills.has(kw.toLowerCase());
            return `<span class="missing-keyword-tag">
              <span>${this.escapeHTML(kw)}</span>
              <span class="tag-add-btn ${added?'added':''}" data-keyword="${this.escapeHTML(kw)}"
                title="${added?'Already added':'Add '+this.escapeHTML(kw)+' to Core Skills'}"
                ${added?'style="pointer-events:none;"':''}>
                ${added?'Added ✓':'+ Add'}
              </span>
            </span>`;
          }).join('')
        : `<span class="badge-tag green">✓ All required keywords matched!</span>`;
    }

    // ── Recommendations ──
    const recGrid = document.getElementById('recommendationsGridContainer');
    if (recGrid && recommendations.length>0) {
      recGrid.innerHTML = recommendations.map((txt,i) => `
        <div class="rec-card">
          <div class="rec-number">${i+1}</div>
          <div class="rec-content">
            <strong>Recommendation #${i+1}:</strong>
            <p>${this.escapeHTML(typeof txt==='string'?txt:JSON.stringify(txt))}</p>
          </div>
        </div>`).join('');
    }

    // ── Smart rewrites (dynamic from Gemini) ──
    this.renderSmartRewrites(smartRewrites);

    // ── Recruiter verdict ──
    this.renderRecruiterVerdict(score, recruiterVerdict, hiringProbability);

    // ── Reveal the Export Report button now that results are ready ──
    const exportBtn = document.getElementById('btnExportAtsReport');
    if (exportBtn) exportBtn.style.display = 'inline-flex';

    if (window.feather) feather.replace();
  }

  renderSmartRewrites(rewrites) {
    const container = document.querySelector('#ats-sec-experience .ats-report-body');
    if (!container) return;

    if (!rewrites || rewrites.length===0) {
      // Keep existing static demo content
      return;
    }

    container.innerHTML = rewrites.map(r => `
      <div class="diff-rewrite-card">
        <div style="font-size:11px;font-weight:700;color:#7A7A7A;text-transform:uppercase;letter-spacing:0.06em;">Current Bullet Point:</div>
        <div class="diff-orig-text">${this.escapeHTML(r.before)}</div>
        <div style="font-size:11px;font-weight:700;color:#2E9B64;text-transform:uppercase;letter-spacing:0.06em;margin-top:8px;">AI-Optimized Bullet Point:</div>
        <div class="diff-improved-text">${this.escapeHTML(r.after)}</div>
        ${r.highlights && r.highlights.length>0 ? `
        <div class="diff-highlights">
          ${r.highlights.map(h=>{
            const cls = h.toLowerCase().includes('verb') ? 'verb' : h.toLowerCase().includes('metric') ? 'metric' : 'kw';
            return `<span class="diff-badge ${cls}">${this.escapeHTML(h)}</span>`;
          }).join('')}
        </div>` : ''}
      </div>`).join('');
  }

  renderRecruiterVerdict(score, verdictText, hp) {
    const box = document.querySelector('.recruiter-verdict-box');
    if (!box) return;

    const quote = box.querySelector('.recruiter-verdict-quote');
    if (quote && verdictText) {
      quote.textContent = `"${verdictText}"`;
    }

    const gauges = box.querySelector('.hiring-gauges-grid');
    if (!gauges) return;

    const intProb  = hp?.interview   || (score>=85?'91%':score>=70?'74%':'48%');
    const offProb  = hp?.offer       || (score>=85?'82%':score>=70?'61%':'33%');
    const atsGate  = hp?.atsGatePass || (score>=85?'97%':score>=70?'81%':'52%');

    const intColor  = parseInt(intProb)>=75 ? '#2E9B64' : parseInt(intProb)>=55 ? '#C98B4A' : '#ef4444';
    const offColor  = parseInt(offProb)>=70 ? '#2E9B64' : parseInt(offProb)>=50 ? '#C98B4A' : '#ef4444';
    const atsColor  = parseInt(atsGate)>=75 ? '#2E9B64' : '#C98B4A';

    gauges.innerHTML = `
      <div class="hiring-gauge-card">
        <div class="hiring-gauge-val" style="color:${intColor};">${intProb}</div>
        <div class="hiring-gauge-lbl">Interview Probability</div>
      </div>
      <div class="hiring-gauge-card">
        <div class="hiring-gauge-val" style="color:${offColor};">${offProb}</div>
        <div class="hiring-gauge-lbl">Offer Probability</div>
      </div>
      <div class="hiring-gauge-card">
        <div class="hiring-gauge-val" style="color:${atsColor};">${atsGate}</div>
        <div class="hiring-gauge-lbl">ATS Gatekeeper Pass</div>
      </div>`;
  }

  /* ─── ATS Analysis PDF Report Exporter (pure jsPDF vector) ─── */
  exportAnalysisPdf() {
    const data = this.lastResult;
    if (!data) {
      if (typeof showToast === 'function') showToast('No analysis results found. Please run a scan first.', 'warning');
      return;
    }

    // Multi-source jsPDF resolver with dynamic script loader fallback
    const resolveJsPDF = () => {
      if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
      if (window.jsPDF) return window.jsPDF;
      if (window.html2pdf && window.html2pdf.Worker && window.html2pdf.Worker.prototype && window.html2pdf.Worker.prototype.jsPDF) {
        return window.html2pdf.Worker.prototype.jsPDF;
      }
      return null;
    };

    let JsPDF = resolveJsPDF();
    if (!JsPDF) {
      if (typeof showToast === 'function') showToast('Loading PDF engine, please wait...', 'info');
      // Inject CDN script dynamically if not present
      if (!document.getElementById('dynamicJsPdfScript')) {
        const script = document.createElement('script');
        script.id = 'dynamicJsPdfScript';
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => {
          setTimeout(() => this.exportAnalysisPdf(), 100);
        };
        script.onerror = () => {
          if (typeof showToast === 'function') showToast('Failed to load PDF engine. Check internet connection.', 'error');
        };
        document.head.appendChild(script);
      }
      return;
    }

    const {
      score: rawScore = 0,
      matchedKeywords: matched = [],
      missingKeywords: missing = [],
      recommendations = [],
      recruiterVerdict = '',
      hiringProbability: hp = {},
      smartRewrites = [],
      sectionScores: ss = {}
    } = data;

    const score = Math.min(100, Math.max(0, parseInt(rawScore, 10) || 0));

    // Read candidate name from resume preview OR form field — strip placeholder text
    let candidateName = '';
    const previewNameEl = document.getElementById('previewName');
    if (previewNameEl) {
      const t = (previewNameEl.textContent || '').trim();
      if (t && t !== 'YOUR NAME' && t.length > 1) candidateName = t;
    }
    if (!candidateName) {
      const fnEl = document.getElementById('fullName');
      if (fnEl) candidateName = (fnEl.value || '').trim();
    }
    if (!candidateName) candidateName = 'Candidate';

    const timestamp  = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    const scoreRgb   = score >= 80 ? [22, 163, 74] : score >= 60 ? [217, 119, 6] : [220, 38, 38];
    const verdictLabel = score >= 85 ? 'SHORTLIST ✓' : score >= 70 ? 'HOLD — Review' : 'REJECT — Gaps Detected';
    const verdictBg    = score >= 85 ? [220, 252, 231] : score >= 70 ? [254, 249, 195] : [254, 226, 226];
    const verdictFg    = score >= 85 ? [22, 101, 52]   : score >= 70 ? [133, 77, 14]  : [153, 27, 27];
    const intProb      = hp.interview   || (score >= 85 ? '91%' : score >= 70 ? '74%' : '48%');
    const offProb      = hp.offer       || (score >= 85 ? '82%' : score >= 70 ? '61%' : '33%');
    const atsGate      = hp.atsGatePass || (score >= 85 ? '97%' : score >= 70 ? '81%' : '52%');

    const sectionMetrics = [
      { label: 'Keyword Match',     value: ss.keywordMatch     ?? score },
      { label: 'Skills Alignment',  value: ss.skillsAlignment  ?? Math.min(95, score + 3) },
      { label: 'Experience Impact', value: ss.experienceImpact ?? Math.min(98, score + 5) },
      { label: 'Metric Density',    value: ss.metricDensity    ?? Math.max(40, score - 8) },
      { label: 'Formatting / ATS',  value: ss.formattingATS    ?? 95 },
      { label: 'Readability',       value: ss.readabilityScore ?? 88 },
      { label: 'Action Verbs',      value: ss.actionVerbs      ?? Math.min(96, score + 5) },
      { label: 'Education & Certs', value: ss.educationCerts   ?? 100 },
    ];

    const barRgb = v => v >= 75 ? [22, 163, 74] : v >= 55 ? [217, 119, 6] : [220, 38, 38];

    // ── Initialise document ──────────────────────────────────────
    const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PW = 210, PH = 297, M = 14, CW = PW - M * 2;
    let y = M;

    const checkPage = (needed = 10) => {
      if (y + needed > PH - 14) { doc.addPage(); y = M; }
    };

    const sectionHead = (title) => {
      checkPage(14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 58, 95);
      doc.text(title.toUpperCase(), M, y);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(M, y + 1.8, M + CW, y + 1.8);
      y += 7;
    };

    // ── HEADER BAR ──────────────────────────────────────────────
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, PW, 40, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 182, 215);
    doc.text('RESUAI STUDIO — ATS DIAGNOSTIC REPORT', M, 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(255, 255, 255);
    doc.text(candidateName.substring(0, 42), M, 23);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 182, 215);
    doc.text(`Generated: ${timestamp}`, M, 31);

    // Score badge (right side)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(scoreRgb[0], scoreRgb[1], scoreRgb[2]);
    doc.text(`${score}%`, PW - M, 20, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 182, 215);
    doc.text('ATS MATCH SCORE', PW - M, 27, { align: 'right' });

    y = 46;

    // ── VERDICT BANNER ──────────────────────────────────────────
    checkPage(18);
    doc.setFillColor(verdictBg[0], verdictBg[1], verdictBg[2]);
    doc.setDrawColor(verdictFg[0], verdictFg[1], verdictFg[2]);
    doc.setLineWidth(0.4);
    doc.roundedRect(M, y, CW, 14, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(verdictFg[0], verdictFg[1], verdictFg[2]);
    doc.text(verdictLabel, M + 4, y + 7);

    const vText = recruiterVerdict || (score >= 75
      ? 'Strong alignment detected. Resume is competitive for ATS filters.'
      : 'Moderate gaps detected. Incorporate missing keywords to boost ATS ranking.');
    const vLines = doc.splitTextToSize(vText, CW - 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(vLines[0] || '', M + 58, y + 7);
    y += 18;

    // ── EXECUTIVE SUMMARY ────────────────────────────────────────
    sectionHead('Executive Summary');

    const topMatchedStr = matched.slice(0, 5).join(', ') || 'none';
    const topMissingStr  = missing.slice(0, 5).join(', ') || 'none';
    const strong = sectionMetrics.filter(m => m.value >= 80).map(m => m.label);
    const weak   = sectionMetrics.filter(m => m.value < 60).map(m => m.label);

    const p1 = score >= 85
      ? `${candidateName}'s resume demonstrates excellent ATS compatibility with a score of ${score}%. This resume is highly competitive and will likely clear automated screening to reach a human recruiter.`
      : score >= 70
      ? `${candidateName}'s resume shows moderate ATS alignment (${score}%). It meets baseline requirements but needs targeted keyword improvements to consistently pass ATS gatekeepers.`
      : `${candidateName}'s resume shows significant keyword gaps with a score of ${score}%. Immediate revisions are required to make this resume competitive for ATS-filtered applications.`;

    const p2 = matched.length > 0
      ? `The resume matched ${matched.length} of ${matched.length + missing.length} required keywords. Key matched terms: ${topMatchedStr}. `
        + (missing.length > 0 ? `${missing.length} critical keywords are missing, including: ${topMissingStr}.` : 'No keyword gaps detected.')
      : 'No required keywords were matched. A complete rewrite targeting role-specific terms is strongly recommended.';

    const p3 = strong.length > 0
      ? `Resume performs strongly in: ${strong.join(', ')}.${weak.length > 0 ? ` Areas needing improvement: ${weak.join(', ')}.` : ''}`
      : 'All sections need improvement to compete for this role.';

    const nextStep = score >= 85
      ? 'Submit with confidence. Consider tailoring your cover letter with matched keywords. Review AI rewrites for any final bullet improvements.'
      : score >= 70
      ? `Incorporate the ${missing.length} missing keywords into your experience section before applying. Target a score above 85%.`
      : `Do not submit without significant revision. Add all ${missing.length} missing keywords in context within your work experience and skills section.`;

    // Summary box
    const allParaLines = [
      ...doc.setFont('helvetica','normal').setFontSize(8.5) && doc.splitTextToSize(p1, CW - 6),
      '',
      ...doc.splitTextToSize(p2, CW - 6),
      '',
      ...doc.splitTextToSize(p3, CW - 6),
    ];
    const boxH = allParaLines.length * 4.8 + 8;
    checkPage(boxH + 22);
    doc.setFillColor(248, 250, 255);
    doc.setDrawColor(219, 234, 254);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, y, CW, boxH, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    let ty = y + 5;
    allParaLines.forEach(line => { doc.text(line, M + 3, ty); ty += 4.8; });
    y = ty + 2;

    // Next-steps callout
    const nsLines = doc.splitTextToSize(nextStep, CW - 10);
    const nsH = nsLines.length * 4.5 + 13;
    checkPage(nsH + 4);
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(239, 246, 255);
    doc.rect(M + 1, y, CW - 1, nsH, 'F');
    doc.setFillColor(59, 130, 246);
    doc.rect(M, y, 2.5, nsH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(29, 78, 216);
    doc.text('RECOMMENDED NEXT STEPS', M + 5, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 58, 138);
    doc.text(nsLines, M + 5, y + 10.5);
    y += nsH + 6;

    // ── HIRING PROBABILITY ───────────────────────────────────────
    checkPage(30);
    sectionHead('Hiring Probability Estimates');
    const probW = (CW - 8) / 3;
    [{ label: 'Interview Probability', val: intProb },
     { label: 'Offer Probability',     val: offProb },
     { label: 'ATS Gatekeeper Pass',   val: atsGate }].forEach((p, i) => {
      const px = M + i * (probW + 4);
      const pRgb = barRgb(parseInt(p.val) || 0);
      doc.setFillColor(248, 250, 252); doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3);
      doc.roundedRect(px, y, probW, 18, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
      doc.setTextColor(pRgb[0], pRgb[1], pRgb[2]);
      doc.text(p.val, px + probW / 2, y + 10, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 116, 139);
      doc.text(p.label, px + probW / 2, y + 15.5, { align: 'center' });
    });
    y += 22;

    // ── SECTION SCORE BREAKDOWN ───────────────────────────────────
    checkPage(70);
    sectionHead('Section Score Breakdown');
    sectionMetrics.forEach(m => {
      checkPage(11);
      const rgb = barRgb(m.value);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(55, 65, 81);
      doc.text(m.label, M, y + 3.5);
      doc.setFont('helvetica', 'bold'); doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      doc.text(`${m.value}%`, M + CW, y + 3.5, { align: 'right' });
      // track
      doc.setFillColor(243, 244, 246); doc.roundedRect(M, y + 5.5, CW, 2.5, 0.8, 0.8, 'F');
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.roundedRect(M, y + 5.5, (m.value / 100) * CW, 2.5, 0.8, 0.8, 'F');
      y += 10.5;
    });

    // ── MATCHED KEYWORDS ──────────────────────────────────────────
    y += 3;
    checkPage(20);
    sectionHead(`Matched Keywords (${matched.length})`);
    if (matched.length === 0) {
      doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(107, 114, 128);
      doc.text('No keywords matched.', M, y); y += 7;
    } else {
      let kx = M;
      matched.forEach(kw => {
        const label = kw.length > 22 ? kw.substring(0, 20) + '…' : kw;
        const lw = doc.getTextWidth(label) + 7;
        if (kx + lw > M + CW) { kx = M; y += 8; checkPage(10); }
        doc.setFillColor(220, 252, 231); doc.setDrawColor(187, 247, 208); doc.setLineWidth(0.2);
        doc.roundedRect(kx, y - 4, lw, 6, 1.5, 1.5, 'FD');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(22, 101, 52);
        doc.text(label, kx + 3.5, y);
        kx += lw + 3;
      });
      y += 10;
    }

    // ── MISSING KEYWORDS ──────────────────────────────────────────
    checkPage(20);
    sectionHead(`Missing / Gap Keywords (${missing.length})`);
    if (missing.length === 0) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(22, 163, 74);
      doc.text('All required keywords matched!', M, y); y += 7;
    } else {
      let kx = M;
      missing.forEach(kw => {
        const label = kw.length > 22 ? kw.substring(0, 20) + '…' : kw;
        const lw = doc.getTextWidth(label) + 7;
        if (kx + lw > M + CW) { kx = M; y += 8; checkPage(10); }
        doc.setFillColor(254, 226, 226); doc.setDrawColor(254, 202, 202); doc.setLineWidth(0.2);
        doc.roundedRect(kx, y - 4, lw, 6, 1.5, 1.5, 'FD');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(153, 27, 27);
        doc.text(label, kx + 3.5, y);
        kx += lw + 3;
      });
      y += 10;
    }

    // ── ACTION RECOMMENDATIONS ────────────────────────────────────
    checkPage(20);
    sectionHead('Action Recommendations');
    if (recommendations.length === 0) {
      doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(107, 114, 128);
      doc.text('No recommendations generated.', M, y); y += 7;
    } else {
      recommendations.forEach((rec, i) => {
        const recText = typeof rec === 'string' ? rec : JSON.stringify(rec);
        const lines = doc.splitTextToSize(recText, CW - 14);
        const rh = lines.length * 4.8 + 8;
        checkPage(rh + 4);
        doc.setFillColor(30, 58, 95);
        doc.circle(M + 4, y + 3, 3.2, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(255, 255, 255);
        doc.text(`${i + 1}`, M + 4, y + 4.2, { align: 'center' });
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(55, 65, 81);
        doc.text(lines, M + 11, y + 3);
        if (i < recommendations.length - 1) {
          doc.setDrawColor(243, 244, 246); doc.setLineWidth(0.2);
          doc.line(M, y + rh - 1, M + CW, y + rh - 1);
        }
        y += rh;
      });
    }

    // ── SMART REWRITES ────────────────────────────────────────────
    if (smartRewrites.length > 0) {
      checkPage(20);
      sectionHead('AI-Optimized Bullet Rewrites');
      smartRewrites.forEach(r => {
        const bLines = doc.splitTextToSize(r.before || '', CW - 8);
        const aLines = doc.splitTextToSize(r.after  || '', CW - 8);
        const bh = (bLines.length + aLines.length) * 4.5 + 18;
        checkPage(bh + 4);
        doc.setFillColor(250, 250, 250); doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.2);
        doc.roundedRect(M, y, CW, bh, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(156, 163, 175);
        doc.text('BEFORE:', M + 4, y + 6);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(55, 65, 81);
        doc.text(bLines, M + 4, y + 11);
        const afterY = y + 11 + bLines.length * 4.5 + 3;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(22, 163, 74);
        doc.text('AI-OPTIMIZED:', M + 4, afterY);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(22, 101, 52);
        doc.text(aLines, M + 4, afterY + 5);
        y += bh + 5;
      });
    }

    // ── FOOTER (all pages) ────────────────────────────────────────
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFillColor(248, 250, 252);
      doc.rect(0, PH - 10, PW, 10, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(156, 163, 175);
      doc.text('Generated by ResuAI Studio · ATS Diagnostic Engine', M, PH - 4);
      doc.text(`Page ${p} of ${totalPages}`, PW - M, PH - 4, { align: 'right' });
    }

    const safeName = `ATS_Report_${candidateName.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    doc.save(safeName);
    if (typeof showToast === 'function') showToast('ATS Diagnostic Report downloaded!', 'success');
  }

  /* ─── DOM helpers ─── */
  setEl(id, text)            { const el=document.getElementById(id); if(el) el.textContent=text; }
  setBarWidth(id, pct)       { const el=document.getElementById(id); if(el) el.style.width=`${Math.min(100,Math.max(0,pct))}%`; }
  escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
}

/* ─── Sample JD Templates ─── */
const SAMPLE_JD_TEMPLATES = {
  frontend: `Senior Frontend Architect — We are seeking a Senior Frontend Architect to lead our design system and web performance initiatives.
Requirements:
- 7+ years of experience with TypeScript, React, Next.js, and Vanilla CSS architecture.
- Deep expertise in Design Systems, Web Vitals (LCP, CLS, INP), and state management (Redux, Zustand).
- Experience with GraphQL, REST APIs, and performance optimization techniques.
- Strong knowledge of accessibility standards (WCAG 2.1) and SEO best practices.
- Experience with CI/CD pipelines, Git, and Agile methodologies.`,

  fullstack: `Senior Full Stack Engineer — We are building the next generation of our platform and need a Senior Full Stack Engineer.
Requirements:
- 5+ years building production applications with React, Node.js, TypeScript, and PostgreSQL.
- Experience with REST APIs, GraphQL, Docker, Kubernetes, and AWS infrastructure.
- Proficiency in CI/CD pipelines, Jest unit testing, and microservices architecture.
- Strong understanding of System Design, scalability, and distributed systems.`,

  backend: `Lead Backend & Systems Engineer — Join our infrastructure team to scale our core services.
Requirements:
- 6+ years with Python, Go, or Java, and distributed systems architecture.
- Expert knowledge of PostgreSQL, Redis, Kafka, and MongoDB.
- Experience designing microservices, REST APIs, and gRPC services.
- AWS or GCP certifications preferred; Docker, Kubernetes mandatory.
- Strong background in CI/CD, system design, and database optimization.`,

  devops: `DevOps & Cloud Infrastructure Lead — Lead our cloud platform and automation initiatives.
Requirements:
- 5+ years of DevOps engineering with AWS, GCP, or Azure.
- Expert in Docker, Kubernetes, Terraform, and CI/CD automation.
- Experience with monitoring (Prometheus, Grafana), logging (ELK stack), and incident management.
- Scripting in Python, Bash, and infrastructure-as-code frameworks.
- Strong background in security best practices and cost optimization.`,

  ai: `AI / Machine Learning Engineer — Build and deploy production ML systems.
Requirements:
- 4+ years of ML engineering with Python, PyTorch, TensorFlow, and Scikit-Learn.
- Experience with NLP, Deep Learning, model training, and deployment pipelines.
- Proficiency in Pandas, NumPy, SQL, and data pipeline engineering.
- Experience deploying models to production with Docker, Kubernetes, and REST APIs.
- Understanding of MLOps, model monitoring, and A/B testing frameworks.`,

  data: `Data Engineer & Analytics Architect — Design our data infrastructure and analytics platform.
Requirements:
- 5+ years of data engineering with Python, SQL, and Apache Spark.
- Experience with data warehouse design (Snowflake, BigQuery, Redshift).
- Proficiency in ETL pipeline development, Airflow, and dbt.
- Strong SQL skills, Tableau, PowerBI, and data analytics.
- Experience with AWS Glue, S3, Lambda, and real-time streaming with Kafka.`,

  product_manager: `Technical Product Manager — Drive product strategy for our API platform.
Requirements:
- 4+ years of product management experience with technical products and APIs.
- Deep understanding of Agile, Scrum, and Sprint Planning methodologies.
- Experience with Jira, roadmap management, and stakeholder engagement.
- Strong analytical skills with data-driven decision making.
- Background in software engineering or technical project management preferred.`,

  ui_ux_designer: `Staff UI/UX & Design Systems Lead — Own our design language and user experience.
Requirements:
- 6+ years of UI/UX design with Figma, Illustrator, and Photoshop.
- Proven experience building and maintaining enterprise design systems.
- Strong knowledge of typography, accessibility (WCAG), and interaction design.
- Experience conducting user research, usability testing, and data-driven design iteration.
- Background working cross-functionally with engineering teams.`,

  mobile: `Senior Mobile Engineer (iOS / Android) — Build and scale our mobile platform.
Requirements:
- 5+ years of native mobile development with Swift (iOS) and Kotlin (Android).
- Experience with React Native or Flutter for cross-platform development.
- Proficiency in mobile CI/CD, App Store publishing, and performance optimization.
- Strong understanding of mobile UI patterns, accessibility, and offline-first architecture.
- Experience with REST APIs, GraphQL, and backend integration.`,

  engineering_manager: `Director of Engineering — Lead and scale our engineering organization.
Requirements:
- 8+ years of engineering experience with 3+ years in management.
- Proven track record of cross-functional leadership, resource allocation, and strategic planning.
- Experience with Agile, Scrum, sprint planning, and engineering roadmap management.
- Strong communication, stakeholder engagement, and conflict resolution skills.
- Technical background in full stack or systems engineering.`
};

// Global initialization
window.atsAnalyzer = new AtsAnalyzer();
document.addEventListener('DOMContentLoaded', () => window.atsAnalyzer.init());
// Also init immediately if DOM is already ready
if (document.readyState !== 'loading') window.atsAnalyzer.init();
