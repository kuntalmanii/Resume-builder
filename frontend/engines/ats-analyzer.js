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
    this.bindTargetJdControls();
    this.bindFileUpload();
    this.bindAddKeywordBtns();
    this.bindExportReportButton();
    this.syncTargetJdMode();
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
      const jdInput = document.getElementById('atsJdInput');
      const drawer = document.getElementById('atsTargetJdDrawer');

      if (!val) {
        // Switched to General ATS Quality Audit
        if (jdInput) jdInput.value = '';
        this.syncTargetJdMode();
      } else if (SAMPLE_JD_TEMPLATES[val]) {
        if (jdInput) jdInput.value = SAMPLE_JD_TEMPLATES[val];
        if (drawer) drawer.classList.remove('collapsed');
        this.syncTargetJdMode();
      }
      if (typeof window.autoSaveFormFields === 'function') window.autoSaveFormFields();
    });
  }

  bindTargetJdControls() {
    const toggleBtn = document.getElementById('btnToggleCustomJd');
    const drawer    = document.getElementById('atsTargetJdDrawer');
    const clearBtn  = document.getElementById('btnClearTargetJd');
    const drawerClr = document.getElementById('btnDrawerClearJd');
    const jdInput   = document.getElementById('atsJdInput');

    if (toggleBtn && drawer && !toggleBtn.dataset.boundAts) {
      toggleBtn.dataset.boundAts = 'true';
      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        drawer.classList.toggle('collapsed');
        toggleBtn.classList.toggle('active', !drawer.classList.contains('collapsed'));
      });
    }

    const handleClear = (e) => {
      if (e) e.preventDefault();
      if (jdInput) jdInput.value = '';
      const sel = document.getElementById('sampleJdSelect');
      if (sel) sel.value = '';
      this.syncTargetJdMode();
      if (typeof window.autoSaveFormFields === 'function') window.autoSaveFormFields();
      if (typeof showToast === 'function') showToast('Switched to General ATS Quality Audit mode.', 'info');
    };

    if (clearBtn && !clearBtn.dataset.boundAts) {
      clearBtn.dataset.boundAts = 'true';
      clearBtn.addEventListener('click', handleClear);
    }
    if (drawerClr && !drawerClr.dataset.boundAts) {
      drawerClr.dataset.boundAts = 'true';
      drawerClr.addEventListener('click', handleClear);
    }

    if (jdInput && !jdInput.dataset.boundAts) {
      jdInput.dataset.boundAts = 'true';
      jdInput.addEventListener('input', () => {
        this.syncTargetJdMode();
      });
    }
  }

  syncTargetJdMode() {
    const jdInput   = document.getElementById('atsJdInput');
    const sel       = document.getElementById('sampleJdSelect');
    const modeBadge = document.getElementById('atsActiveModeBadge');
    const modeText  = document.getElementById('atsActiveModeText');
    const charCount = document.getElementById('atsJdCharCount');
    const clearBtn  = document.getElementById('btnClearTargetJd');
    const drawerClr = document.getElementById('btnDrawerClearJd');
    const val       = jdInput ? jdInput.value.trim() : '';

    if (charCount) {
      charCount.textContent = `${val.length} characters`;
    }

    if (val.length >= 15) {
      // Target Role mode
      let label = 'Custom Job Description';
      if (sel && sel.value && SAMPLE_JD_TEMPLATES[sel.value] && SAMPLE_JD_TEMPLATES[sel.value].trim() === val) {
        const opt = sel.options[sel.selectedIndex];
        if (opt) label = opt.text.replace(/^📋\s*/, '');
      } else if (sel && sel.value) {
        // Text was customized away from preset
        label = 'Custom Target Role';
      }

      if (modeBadge) {
        modeBadge.className = 'ats-mode-pill targeted';
        if (modeText) modeText.textContent = `🎯 Target Role: ${label}`;
      }
      if (clearBtn) clearBtn.style.display = 'inline-flex';
      if (drawerClr) drawerClr.style.display = 'inline-flex';
    } else {
      // General ATS Quality Audit mode
      if (sel && sel.value !== '') sel.value = '';
      if (modeBadge) {
        modeBadge.className = 'ats-mode-pill general';
        if (modeText) modeText.textContent = '📋 Mode: General ATS Quality Audit';
      }
      if (clearBtn) clearBtn.style.display = 'none';
      if (drawerClr) drawerClr.style.display = 'none';
    }
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
      input.addEventListener('change', async e => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fn   = document.getElementById('selectedFileName');
        const badge= document.getElementById('selectedFileBadge');
        if (fn) fn.textContent = file.name;
        if (badge) badge.style.display = 'inline-flex';

        try {
          if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            if (typeof window.extractPdfText === 'function') {
              window.uploadedFileText = await window.extractPdfText(file);
            }
          } else {
            const reader = new FileReader();
            reader.onload = ev => { window.uploadedFileText = ev.target.result || ''; };
            reader.readAsText(file);
          }
        } catch (err) {
          console.warn('[ATS Analyzer] PDF text extraction fallback:', err);
        }
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
        if (typeof window.syncLivePreview === 'function') window.syncLivePreview();
        if (typeof window.autoSaveFormFields === 'function') window.autoSaveFormFields();
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

    // Check for preset JD from select if input is empty
    if (!jdText) {
      const sel = document.getElementById('sampleJdSelect');
      const val = sel?.value;
      if (val && SAMPLE_JD_TEMPLATES[val]) {
        jdText = SAMPLE_JD_TEMPLATES[val];
        if (jdInput) { jdInput.value = jdText; }
        this.syncTargetJdMode();
      }
    }

    const isGeneralAudit = !jdText || jdText.length < 15;

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
        if (progress < 25)      stepText.textContent = isGeneralAudit ? 'Auditing resume layout and ATS formatting...' : 'Connecting to Gemini AI Engine...';
        else if (progress < 55) stepText.textContent = isGeneralAudit ? 'Analyzing action verbs, metric density, and skills...' : 'Parsing resume against job requirements...';
        else if (progress < 80) stepText.textContent = 'Generating ATS diagnostic report & smart rewrites...';
        else                    stepText.textContent = 'Computing ATS gatekeeper pass rate...';
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

      // If API key missing or parse failed, fall back to local heuristic
      if (!data || response.status === 400 || response.status === 500) {
        data = this.localFallback(resumeContent, jdText);
      }

      data.isGeneralAudit = isGeneralAudit;
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
      local.isGeneralAudit = isGeneralAudit;
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
      'typescript','react','next.js','javascript','html','css','vanilla css',
      'node.js','express','python','django','fastapi','go','rust','java',
      'spring boot','c++','graphql','rest api','postgresql','mysql','mongodb',
      'redis','supabase','firebase','aws','docker','kubernetes','ci/cd',
      'git','jest','tailwind','microservices','system design',
      'machine learning','pytorch','tensorflow','nlp','data science','pandas',
      'numpy','scikit-learn','deep learning','photoshop','illustrator','figma',
      'graphic design','ui/ux','indesign','typography','vector graphics',
      'agile','scrum','jira','budget management','project management','sprint planning',
      'risk mitigation','resource allocation','communication','problem-solving',
      'conflict resolution','client retention','customer success','customer satisfaction',
      'stakeholder engagement','presentation','relationship management','cross-functional leadership',
      'tableau','powerbi','sql','data analytics','data analysis'
    ];
    const isGeneralAudit = !jdText || jdText.trim().length < 15;
    const resLower = resumeText.toLowerCase();

    // Comprehensive action verbs list
    const verbRegex = /\b(managed|led|directed|architected|engineered|built|scaled|delivered|optimized|spearheaded|implemented|developed|designed|formulated|executed|created|programmed|authored|established|collaborated|contributed|deployed|configured|maintained|automated|reduced|increased|improved|accelerated|streamlined|resolved|conducted|analyzed|tested|launched|integrated|mentored|facilitated|produced|transformed|orchestrated)\b/gi;
    const matchedVerbs = (resumeText.match(verbRegex) || []);
    const hasVerbs = matchedVerbs.length > 0;
    const verbCount = matchedVerbs.length;

    // Dates & Timeline Detection
    const dateRegex = /\b(20\d\d|19\d\d|present|current|\d{1,2}[\/\-]\d{2,4}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/gi;
    const hasDates = dateRegex.test(resumeText);

    // Metrics & Quantified Impact Detection
    const numRegex = /\d+[%x+]|\$\d+|\d+\s*(million|billion|users?|teams?|latency|uptime|projects?|k|ms|s|clients?|engineers?|members?|queries|reqs?|rps|fps|points?|stars?|downloads?)\b/gi;
    const matchedNums = (resumeText.match(numRegex) || []);
    const hasNums = matchedNums.length > 0;
    const numCount = matchedNums.length;

    const hasContact = /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}|\+?\d[\d\s\-().]{7,}\d|linkedin\.com|github\.com)/i.test(resumeText);

    const words = resumeText.match(/\b[A-Za-z]{3,}\b/g) || [];
    const totalWords = words.length;
    const unique = new Set(words.map(w => w.toLowerCase())).size;
    const lexDiv = totalWords > 0 ? unique / totalWords : 1;

    // Sub-scores
    const verbScore  = hasVerbs ? Math.min(98, 70 + Math.min(28, verbCount * 4)) : 55;
    const numScore   = hasNums  ? Math.min(96, 68 + Math.min(28, numCount * 5))  : 50;
    const fmtScore   = hasContact ? (hasDates ? 98 : 88) : 80;
    const readScore  = Math.min(98, Math.max(68, 74 + Math.round(lexDiv * 26)));
    const expScore   = Math.round((verbScore * 0.5) + (numScore * 0.5));

    let matched = [];
    let missing = [];
    let score   = 75;

    if (isGeneralAudit) {
      matched = commonKws.filter(kw => resLower.includes(kw)).map(kw => kw.charAt(0).toUpperCase() + kw.slice(1));
      if (matched.length === 0) matched = ['Problem-Solving', 'Communication', 'Technical Leadership'];

      const benchmarkSkills = ['CI/CD', 'Git', 'REST API', 'Docker', 'Agile', 'Unit Testing', 'System Design'];
      missing = benchmarkSkills.filter(sk => !resLower.includes(sk.toLowerCase())).slice(0, 4);

      const skillScore = Math.min(98, Math.max(65, 55 + Math.min(43, matched.length * 4)));
      score = Math.min(99, Math.max(45, Math.round(
        (skillScore * 0.35) + (expScore * 0.35) + (fmtScore * 0.20) + (readScore * 0.10)
      )));
    } else {
      const jdLower = jdText.toLowerCase();
      let targets   = commonKws.filter(kw => jdLower.includes(kw));
      if (targets.length === 0) {
        const jdWords = jdText.match(/\b[A-Za-z]{4,}\b/g) || [];
        const stops = new Set(['and','the','with','for','you','are','our','will','have','this','that','from','your','requirements','experience','looking','senior','lead']);
        targets = [...new Set(jdWords.map(w => w.toLowerCase()).filter(w => !stops.has(w)))].slice(0, 12);
      }
      matched = targets.filter(kw => resLower.includes(kw)).map(kw => kw.charAt(0).toUpperCase() + kw.slice(1));
      missing = targets.filter(kw => !resLower.includes(kw)).map(kw => kw.charAt(0).toUpperCase() + kw.slice(1));

      const matchPct = targets.length ? Math.round((matched.length / targets.length) * 100) : 70;
      score = Math.min(99, Math.max(35, Math.round(
        (matchPct * 0.55) + (verbScore * 0.15) + (numScore * 0.15) + (fmtScore * 0.15)
      )));
    }

    // Extract actual bullets from candidate's resume text for dynamic Smart Rewrites
    const rawBullets = resumeText
      .split(/\n+/)
      .map(line => line.replace(/^[•\-\*\d\.\s]+/, '').trim())
      .filter(line => line.length > 20 && !/^(experience|education|skills|projects|summary|contact|certifications|phone|email|linkedin|github)/i.test(line));

    const generatedRewrites = [];
    if (rawBullets.length > 0) {
      const topBullet = rawBullets[0];
      const targetKw = missing[0] || matched[0] || (isGeneralAudit ? 'Scalable System Architecture' : 'Technical Stack');
      generatedRewrites.push({
        before: topBullet,
        after: `Architected high-performance architecture incorporating ${targetKw}, improving application throughput by 38% and reducing p99 latency.`,
        highlights: [`Verb: Architected`, `Metric: +38% Throughput`, `Keywords: ${targetKw}`]
      });

      if (rawBullets.length > 1) {
        const secondBullet = rawBullets[1];
        const targetKw2 = missing[1] || matched[1] || (isGeneralAudit ? 'Automated CI/CD' : 'CI/CD Pipelines');
        generatedRewrites.push({
          before: secondBullet,
          after: `Spearheaded automated delivery pipelines integrating ${targetKw2}, cutting deployment release latency by 45% with zero downtime.`,
          highlights: [`Verb: Spearheaded`, `Metric: -45% Latency`, `Keywords: ${targetKw2}`]
        });
      }
    }

    const recs = isGeneralAudit ? [
      `General ATS Readiness: Detected ${matched.length} core technical & professional competencies in your resume.`,
      !hasNums  ? 'Add quantified business metrics (%, $, user scale, latency reductions) to experience bullets.' : 'Strong quantified impact detected across achievements.',
      !hasVerbs ? 'Begin every bullet with strong action verbs (Architected, Engineered, Optimized) rather than passive duties.' : 'Proactive action verbs detected across experience entries.',
      missing.length > 0 ? `Industry Benchmark: Consider highlighting ${missing.slice(0, 3).join(', ')} where applicable.` : 'Great coverage of foundational technical competencies.'
    ] : [
      missing.length > 0 ? `Incorporate missing target keywords (${missing.slice(0, 4).join(', ')}) into your experience bullets.` : 'Great role keyword alignment!',
      !hasNums  ? 'Add quantified metrics (%, $, user counts) to every bullet point.' : 'Good use of metrics.',
      !hasVerbs ? 'Start bullets with strong action verbs (Architected, Engineered, Optimized).' : 'Strong action verb usage detected.',
      'Ensure skills appear in work experience context, not only in a standalone Skills section.'
    ];

    return {
      score,
      isGeneralAudit,
      verdict: score >= 80 ? 'SHORTLIST' : score >= 65 ? 'HOLD' : 'REJECT',
      matchedKeywords: matched,
      missingKeywords: missing,
      recommendations: recs,
      recruiterVerdict: isGeneralAudit
        ? (score >= 80
          ? `Strong ATS baseline (${score}%). Clean structural parsing, strong skill density, and solid presentation. Adding more quantified metrics will push it into the top 5%.`
          : `Moderate ATS baseline (${score}%). The resume has solid core content but needs stronger quantified metrics and proactive action verbs to pass strict ATS filters.`)
        : (score >= 80
          ? 'Strong candidate. Clear technical depth and keyword alignment. Would pass ATS screening and warrant a phone screen. Adding impact metrics would make this top 5%.'
          : score >= 65
          ? `Moderate fit (${score}%). Missing ${missing.length > 0 ? missing.slice(0, 3).join(', ') : 'some key skills'}. Incorporating these into experience bullets will clear ATS filters.`
          : `Significant keyword gaps (${missing.slice(0, 3).join(', ')}). Target role requires specialized competencies not yet emphasized in your resume.`),
      hiringProbability: {
        interview:  score >= 80 ? '92%' : score >= 65 ? '75%' : '45%',
        offer:      score >= 80 ? '84%' : score >= 65 ? '62%' : '32%',
        atsGatePass:score >= 80 ? '98%' : score >= 65 ? '82%' : '50%'
      },
      smartRewrites: generatedRewrites,
      sectionScores: {
        keywordMatch:    isGeneralAudit ? Math.min(98, Math.max(60, matched.length * 5 + 40)) : (matched.length > 0 ? Math.round((matched.length / (matched.length + missing.length)) * 100) : score),
        skillsAlignment: Math.min(100, Math.round(score * 0.96)),
        formattingATS:   fmtScore,
        experienceImpact:expScore,
        metricDensity:   numScore,
        educationCerts:  100,
        readabilityScore:readScore,
        actionVerbs:     verbScore
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

    // Ensure all report bodies are visible after scan completes
    document.querySelectorAll('#ats-results .ats-report-body').forEach(b => b.style.display = 'block');

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
    const isGen = data.isGeneralAudit;
    if (h && d) {
      if (isGen) {
        if (score >= 85)      { h.textContent = 'Excellent ATS Health & Readiness';  d.textContent = `Your resume shows ${score}% structural ATS readiness with strong formatting, action verbs, and skill density.`; }
        else if (score >= 68) { h.textContent = 'Solid ATS Baseline — Impact Gaps';  d.textContent = `Your resume achieves ${score}% ATS readiness. Add quantified metrics (%, $, scale) and leadership verbs to rank higher.`; }
        else                  { h.textContent = 'Low ATS Score — Optimization Urgently Needed'; d.textContent = `Your resume matches ${score}% of standard ATS formatting and metric guidelines. Restructure experience bullets.`; }
      } else {
        if (score >= 85)      { h.textContent = 'Excellent Target Role Alignment';        d.textContent = `Your resume matches ${score}% of core qualifications. Strong position for this role.`; }
        else if (score >= 65) { h.textContent = 'Moderate Match — Action Required';       d.textContent = `Your resume matches ${score}% of requirements. Add missing keywords to boost ATS rank.`; }
        else                  { h.textContent = 'Low Match — Critical Keyword Gaps';      d.textContent = `Your resume matches ${score}% of requirements. Incorporate missing skills urgently.`; }
      }
    }

    // ── KPI metrics ──
    const ss = sectionScores;
    this.setEl('kpiEstPassRate',  `${Math.min(99, score + 2)}%`);
    this.setEl('kpiReadability',  `${(7.5 + (score / 100) * 2.3).toFixed(1)} / 10`);
    this.setEl('kpiHiringProb',   score >= 80 ? 'High' : score >= 60 ? 'Moderate' : 'Low');
    this.setEl('kpiQualityScore', score >= 85 ? 'Top 5%' : score >= 70 ? 'Top 20%' : 'Top 50%');

    // ── Score matrix bars (using real section_scores) ──
    const mKw     = ss.keywordMatch    ?? score;
    const mExp    = ss.experienceImpact?? Math.min(98, score + 5);
    const mSkills = ss.skillsAlignment ?? Math.min(95, score + 3);
    const mMetric = ss.metricDensity   ?? Math.max(40, score - 8);

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
      catBadgeOverview: `${score}%`,
      catBadgeKeywords: ss.keywordMatch    ?? score,
      catBadgeKw:       ss.keywordMatch    ?? score,
      catBadgeSkills:   ss.skillsAlignment ?? Math.min(95, score + 3),
      catBadgeImpact:   ss.experienceImpact?? Math.min(98, score + 5),
      catBadgeExp:      ss.experienceImpact?? Math.min(98, score + 5),
      catBadgeEdu:      ss.educationCerts  ?? 100,
      catBadgeFmt:      ss.formattingATS   ?? 95,
      catBadgeRead:     ss.readabilityScore?? 96,
      catBadgeDensity:  ss.metricDensity   ?? Math.max(40, score - 8),
      catBadgeVerbs:    ss.actionVerbs     ?? Math.min(96, score + 5),
      catBadgeRecs:     `${recommendations.length || 4} Tips`
    };
    Object.entries(catMap).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) {
        const num = typeof val === 'number' ? val : parseInt(val);
        el.textContent = typeof val === 'number' ? `${val}%` : String(val);
        if (!isNaN(num)) {
          el.className = 'ats-cat-badge ' + (num >= 80 ? 'pass' : num >= 60 ? 'warn' : 'fail');
        }
      }
    });

    // ── Keyword counts subtitle ──
    this.setEl('kwCountsSubtitle', isGen ? `${matched.length} Skills Detected · ${missing.length} Recommendations` : `${matched.length} Matched · ${missing.length} Gaps`);

    // ── Matched keywords ──
    const matchTitle = document.getElementById('matchedKeywordsTitle');
    const matchBox   = document.getElementById('matchedKeywordsContainer');
    if (matchTitle) matchTitle.innerHTML = isGen ? `✓ Detected Skills &amp; Competencies (${matched.length})` : `✓ Matched Required Keywords (${matched.length})`;
    if (matchBox) {
      matchBox.innerHTML = matched.length > 0
        ? matched.map(kw => `<span class="badge-tag green">${this.escapeHTML(kw)}</span>`).join('')
        : `<span class="badge-tag amber">No specific keywords detected — ensure your resume includes relevant technical terms.</span>`;
    }

    // ── Missing keywords ──
    const existingSkills = new Set(
      Array.from(document.querySelectorAll('#skillsTagsContainer .tag'))
        .map(t => t.textContent.replace(/[×\u00d7]/g, '').trim().toLowerCase())
    );
    const missTitle = document.getElementById('missingKeywordsTitle');
    const missBox   = document.getElementById('missingKeywordsContainer') || document.getElementById('atsMissingBadgeList');
    if (missTitle) missTitle.innerHTML = isGen ? `💡 High-Leverage Skills to Consider (${missing.length})` : `⚠ Missing / Gap Keywords (${missing.length})`;
    if (missBox) {
      missBox.innerHTML = missing.length > 0
        ? missing.map(kw => {
            const added = existingSkills.has(kw.toLowerCase());
            return `<span class="missing-keyword-tag">
              <span>${this.escapeHTML(kw)}</span>
              <span class="tag-add-btn ${added ? 'added' : ''}" data-keyword="${this.escapeHTML(kw)}"
                title="${added ? 'Already added' : 'Add ' + this.escapeHTML(kw) + ' to Core Skills'}"
                ${added ? 'style="pointer-events:none;"' : ''}>
                ${added ? 'Added ✓' : '+ Add'}
              </span>
            </span>`;
          }).join('')
        : `<span class="badge-tag green">✓ All core competencies present!</span>`;
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

    // ── Recruiter verdict ──
    this.renderRecruiterVerdict(score, recruiterVerdict, hiringProbability);

    // ── Reveal the Export Report button now that results are ready ──
    const exportBtn = document.getElementById('btnExportAtsReport');
    if (exportBtn) exportBtn.style.display = 'inline-flex';

    if (window.feather) feather.replace();
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
    let data = this.lastResult || window.atsLastResult;
    const resumeContent = this.getResumeText();
    const jdInput = document.getElementById('atsJdInput');
    const jdText = jdInput?.value?.trim() || '';

    if (!data) {
      if (!resumeContent) {
        if (typeof showToast === 'function') showToast('Please enter your resume content or run a scan first.', 'warning');
        return;
      }
      data = this.localFallback(resumeContent, jdText);
      this.lastResult = data;
      window.atsLastResult = data;
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
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const allParaLines = [
      ...doc.splitTextToSize(p1, CW - 6),
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

    const safeName = `ATS_Diagnostic_Report_${candidateName.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

    // ── Generate PDF & Open Modal Preview ──
    try {
      const dataUri = doc.output('datauristring');
      this.openPdfReportModal(dataUri, safeName, doc, score, candidateName);
    } catch (err) {
      console.warn('[ATS] Could not open modal preview:', err);
      doc.save(safeName);
    }
  }

  /* ─── Guaranteed Native .pdf File Downloader ─── */
  downloadPdfDirect(doc, fileName) {
    const safeName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    try {
      const arrayBuffer = doc.output('arraybuffer');
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = safeName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try { document.body.removeChild(a); } catch (_) {}
        URL.revokeObjectURL(url);
      }, 2000);
      if (typeof showToast === 'function') showToast(`Downloaded ${safeName}!`, 'success');
    } catch (err) {
      console.warn('[ATS] ArrayBuffer download fallback:', err);
      doc.save(safeName);
    }
  }

  /* ─── Open Interactive PDF Report Modal ─── */
  openPdfReportModal(blobUrl, fileName, doc, score, candidateName) {
    // Always remove stale modal and recreate fresh to avoid cached DOM issues
    const existing = document.getElementById('atsReportModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'atsReportModal';
    modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:9999;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);';

    modal.innerHTML = `
      <div style="background:#fff;border-radius:16px;width:min(920px,96vw);max-height:94vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.3);">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #eee;flex-shrink:0;background:#fff;">
          <div style="display:flex;align-items:center;gap:10px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="#B9824A" stroke-width="2" width="20" height="20"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <div>
              <div id="atsReportModalTitle" style="font-size:1rem;font-weight:700;color:#1a1a1a;">ATS Diagnostic Report</div>
              <div id="atsReportModalSubtitle" style="font-size:0.78rem;color:#888;margin-top:2px;">Generated by ResuAI</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <button id="btnDownloadAtsPdf" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;background:#B9824A;color:#fff;border:none;border-radius:8px;font-size:0.85rem;font-weight:600;cursor:pointer;line-height:1;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download PDF
            </button>
            <button id="btnCloseAtsModal" style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;background:#f0f0f0;border:none;border-radius:8px;cursor:pointer;font-size:1.1rem;color:#444;">&#x2715;</button>
          </div>
        </div>
        <div id="atsReportPdfContainer" style="flex:1;min-height:0;background:#525659;"></div>
      </div>
    `;
    document.body.appendChild(modal);

    // Set title/subtitle
    const titleEl = modal.querySelector('#atsReportModalTitle');
    const subEl   = modal.querySelector('#atsReportModalSubtitle');
    if (titleEl) titleEl.textContent = `ATS Report — ${candidateName} (${score}% Match)`;
    if (subEl)   subEl.textContent   = `PDF generated at ${new Date().toLocaleTimeString()}`;

    // ── PDF Preview via <object> with data: URI ──
    const container = modal.querySelector('#atsReportPdfContainer');
    if (container) {
      const objEl = document.createElement('object');
      objEl.setAttribute('data', blobUrl);   // blobUrl is now a data: URI
      objEl.setAttribute('type', 'application/pdf');
      objEl.style.cssText = 'width:100%;height:100%;min-height:520px;display:block;border:none;';
      // Fallback shown if browser cannot embed PDF inline
      const fallbackDiv = document.createElement('div');
      fallbackDiv.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:520px;gap:18px;background:#F8F7F4;padding:40px;text-align:center;';
      fallbackDiv.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="#B9824A" stroke-width="1.5" width="56" height="56"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        <div>
          <p style="font-size:1rem;font-weight:700;color:#1E1E1E;margin:0 0 8px;">Your PDF report is ready!</p>
          <p style="font-size:0.85rem;color:#6B6B6B;margin:0;">Click <strong>Download PDF</strong> above to save your report.</p>
        </div>
      `;
      objEl.appendChild(fallbackDiv);
      container.appendChild(objEl);
    }

    // ── Download: anchor click with filename — most reliable cross-browser ──
    const dlBtn = modal.querySelector('#btnDownloadAtsPdf');
    if (dlBtn) {
      dlBtn.onclick = () => {
        try {
          // Convert data URI back to blob for named download
          const base64 = blobUrl.split(',')[1];
          const bytes   = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
          const blob    = new Blob([bytes], { type: 'application/pdf' });
          const url     = URL.createObjectURL(blob);
          const a       = document.createElement('a');
          a.href        = url;
          a.download    = fileName;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => { try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch (_) {} }, 2000);
          if (typeof showToast === 'function') showToast(`Saved: ${fileName}`, 'success');
        } catch (err) {
          console.error('[ATS] Download failed:', err);
          doc.save(fileName);
        }
      };
    }

    // ── Close ──
    const closeBtn = modal.querySelector('#btnCloseAtsModal');
    if (closeBtn) closeBtn.onclick = () => modal.remove();
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  }

  /* ─── DOM helpers ─── */
  setEl(id, text)            { const el=document.getElementById(id); if(el) el.textContent=text; }
  setBarWidth(id, pct) {
    const el = document.getElementById(id);
    if (!el) return;
    const val = Math.min(100, Math.max(0, pct));
    el.style.width = `${val}%`;
    if (val >= 75) {
      el.className = 'ats-score-bar-fill green';
    } else if (val < 50) {
      el.className = 'ats-score-bar-fill red';
    } else {
      el.className = 'ats-score-bar-fill';
    }
  }
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
