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
    // Do NOT auto-run or show fake default data — wait for user action
    this.initialized = true;
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
      if (typeof showToast === 'function') showToast('Please paste a Job Description or select a preset role above before scanning.', 'warn');
      this.isScanning = false;
      return;
    }

    if (!resumeContent) {
      if (typeof showToast === 'function') showToast('No resume content found. Please build your resume or upload a file first.', 'warn');
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
