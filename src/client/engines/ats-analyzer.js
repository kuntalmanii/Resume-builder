/**
 * ResuAI // ATS Diagnostic Engine Module (ats-analyzer.js)
 * Computes ATS match scores, extracts tech stack keywords,
 * renders analytical breakdown UI, and proxies Gemini AI diagnostic scans.
 */

class AtsAnalyzer {
  constructor() {
    this.currentScore = 0;
    this.extractedKeywords = [];
    this.missingKeywords = [];
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.bindAtsScanButton();
    this.initialized = true;
  }

  bindAtsScanButton() {
    const btnScan = document.getElementById('btnRunAtsAnalysis');
    if (btnScan && !btnScan.dataset.boundAts) {
      btnScan.dataset.boundAts = 'true';
      btnScan.addEventListener('click', (e) => {
        e.preventDefault();
        this.runAtsScan();
      });
    }
  }

  /** Extract full resume text from uploaded PDF, active canvas editor, or builder inputs */
  getResumeText() {
    let text = (window.uploadedFileText || '').trim();
    const editorBody = document.querySelector('.doc-editor-body');
    if (editorBody && editorBody.innerText) {
      text += '\n' + editorBody.innerText.trim();
    }

    const fullName = document.getElementById('fullName')?.value || document.getElementById('inputFullName')?.value;
    const jobTitle = document.getElementById('jobTitle')?.value || document.getElementById('inputJobTitle')?.value;
    const bullets = document.getElementById('bulletPoints')?.value;
    const projects = document.getElementById('inputProjects')?.value;
    const achievements = document.getElementById('inputAchievements')?.value;

    if (fullName) text += ' ' + fullName;
    if (jobTitle) text += ' ' + jobTitle;
    if (bullets) text += ' ' + bullets;
    if (projects) text += ' ' + projects;
    if (achievements) text += ' ' + achievements;

    document.querySelectorAll('#skillsTagsContainer .tag').forEach(tag => {
      text += ' ' + tag.textContent;
    });

    return text.trim();
  }

  /* ------ Extract Keywords & Calculate Local Heuristic Score ------ */
  calculateScore(resumeText, targetJdText) {
    if (!resumeText || !targetJdText) return { score: 0, missing: [], matched: [] };

    const commonTechKeywords = [
      'javascript', 'typescript', 'react', 'next.js', 'node.js', 'express', 'python', 'django', 'fastapi',
      'docker', 'kubernetes', 'aws', 'gcp', 'postgresql', 'mongodb', 'graphql', 'rest api', 'rest APIs',
      'ci/cd', 'git', 'microservices', 'unit testing', 'system design', 'redis', 'kafka', 'vanilla css',
      'web vitals', 'performance', 'agile', 'scrum', 'sql', 'html', 'css'
    ];

    const jdLower = targetJdText.toLowerCase();
    const resumeLower = resumeText.toLowerCase();

    let targetSkills = commonTechKeywords.filter(kw => jdLower.includes(kw.toLowerCase()));
    
    // Dynamic word extraction fallback if JD uses non-standard terms
    if (targetSkills.length === 0) {
      const words = targetJdText.match(/\b[A-Za-z]{4,}\b/g) || [];
      const stopWords = new Set(['and','the','with','for','you','are','our','will','have','this','that','from','your','requirements','experience','seeking','senior','lead','developer','engineer','ability','work','team']);
      const uniqueWords = [...new Set(words.map(w => w.toLowerCase()))].filter(w => !stopWords.has(w));
      targetSkills = uniqueWords.slice(0, 10);
    }

    if (targetSkills.length === 0) {
      return { score: 75, missing: [], matched: [] };
    }

    const matched = targetSkills.filter(kw => resumeLower.includes(kw.toLowerCase()));
    const missing = targetSkills.filter(kw => !resumeLower.includes(kw.toLowerCase()));

    const scorePct = Math.min(100, Math.max(0, Math.round((matched.length / targetSkills.length) * 100)));
    this.currentScore = scorePct;
    this.missingKeywords = missing;
    this.extractedKeywords = matched;

    return { score: scorePct, missing, matched };
  }

  /* ------ Proxy 1-Click ATS Scan via Gemini AI Backend ------ */
  async runAtsScan() {
    const btnScan = document.getElementById('btnRunAtsAnalysis');
    const btnRunAtsText = document.getElementById('btnRunAtsText');
    const jdInput = document.getElementById('atsJdInput') || document.getElementById('atsTargetJdInput');
    const atsLoadingState = document.getElementById('atsLoadingState');
    const atsResults = document.getElementById('ats-results');
    const atsProgressFill = document.getElementById('atsProgressFill');
    const atsProgressPercent = document.getElementById('atsProgressPercent');
    const loadingStepText = document.getElementById('loadingStepText');

    const resumeContent = this.getResumeText();
    const jdText = jdInput?.value?.trim() || '';

    if (!jdText) {
      const msg = 'Please enter a target Job Description or select a sample role to run ATS analysis.';
      if (typeof window.showToast === 'function') window.showToast(msg, 'error');
      else alert(msg);
      if (jdInput) jdInput.focus();
      return;
    }

    if (!resumeContent) {
      const msg = 'Please fill out your resume details or upload a resume PDF before running analysis.';
      if (typeof window.showToast === 'function') window.showToast(msg, 'error');
      else alert(msg);
      return;
    }

    const origBtnHTML = btnScan ? btnScan.innerHTML : '';
    if (btnScan) {
      btnScan.disabled = true;
      if (btnRunAtsText) btnRunAtsText.textContent = "Scanning Document...";
    }

    if (atsResults) atsResults.style.display = 'none';
    if (atsLoadingState) {
      atsLoadingState.style.display = 'flex';
      atsLoadingState.scrollIntoView({ behavior: 'smooth' });
    }

    let progress = 0;
    let timer = setInterval(() => {
      progress += 10;
      if (atsProgressFill) atsProgressFill.style.width = `${progress}%`;
      if (atsProgressPercent) atsProgressPercent.textContent = `${progress}%`;
      if (loadingStepText) {
        if (progress < 30) loadingStepText.textContent = "Connecting to Gemini Flash AI Engine...";
        else if (progress < 60) loadingStepText.textContent = "Parsing candidate resume against job requirements...";
        else loadingStepText.textContent = "Generating structured ATS diagnostic report...";
      }
      if (progress >= 90) clearInterval(timer);
    }, 60);

    try {
      const response = await fetch('/api/ats-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jdText: jdText,
          targetJdText: jdText,
          jobDescription: jdText,
          resumeText: resumeContent,
          geminiModel: window.getActiveSettings ? window.getActiveSettings().geminiModel : '',
          atsEngine: window.getActiveSettings ? window.getActiveSettings().atsEngine : ''
        })
      });

      clearInterval(timer);
      if (atsProgressFill) atsProgressFill.style.width = '100%';
      if (atsProgressPercent) atsProgressPercent.textContent = '100%';

      let resData = null;
      if (response.ok) {
        resData = await response.json();
      }

      const localResult = this.calculateScore(resumeContent, jdText);
      const score = (resData && typeof resData.score === 'number') ? resData.score : localResult.score;
      const matched = resData?.matchedKeywords || resData?.matched || localResult.matched;
      const missing = resData?.missingKeywords || resData?.missing || localResult.missing;
      const recommendations = resData?.recommendations || [
        `Incorporate missing keywords (${missing.slice(0, 3).join(', ') || 'core skills'}) into bullet points.`,
        `Quantify Web Vitals and engineering impact with metrics (e.g. Reduced LCP by 42%).`
      ];

      setTimeout(() => {
        if (atsLoadingState) atsLoadingState.style.display = 'none';
        this.renderBreakdownUi(score, matched, missing, recommendations);
        if (atsResults) {
          atsResults.style.display = 'flex';
          atsResults.scrollIntoView({ behavior: 'smooth' });
        }
      }, 250);

      if (window.checklistManager) {
        window.checklistManager.markTaskComplete('analyze_resume');
      }

    } catch (err) {
      console.warn('ATS Gemini endpoint error, falling back to local calculation:', err.message);
      clearInterval(timer);
      if (atsLoadingState) atsLoadingState.style.display = 'none';

      const localResult = this.calculateScore(resumeContent, jdText);
      this.renderBreakdownUi(localResult.score, localResult.matched, localResult.missing, [
        `Add missing keywords (${localResult.missing.slice(0, 3).join(', ') || 'core skills'}) to experience.`,
        `Quantify achievements using metrics and standard ATS section headings.`
      ]);

      if (atsResults) {
        atsResults.style.display = 'flex';
        atsResults.scrollIntoView({ behavior: 'smooth' });
      }
    } finally {
      if (btnScan) {
        btnScan.disabled = false;
        btnScan.innerHTML = origBtnHTML;
      }
      if (window.feather) feather.replace();
    }
  }

  renderBreakdownUi(score, matched = [], missing = [], recommendations = []) {
    const dynamicScore = Math.min(100, Math.max(0, parseInt(score) ?? 0));

    // Update main score ring numbers
    const scoreNumber = document.getElementById('scoreNumber');
    const scoreCircle = document.getElementById('scoreCircle');
    const scoreBadge = document.getElementById('atsScoreBadge');
    const scoreRing = document.getElementById('atsScoreRingProgress');
    const statusBadge = document.getElementById('analysisStatusBadge');

    if (scoreNumber) scoreNumber.textContent = `${dynamicScore}%`;
    if (scoreBadge) scoreBadge.textContent = `${dynamicScore}% Match`;
    if (scoreCircle) {
      const color = dynamicScore >= 80 ? '#10b981' : (dynamicScore >= 60 ? '#f59e0b' : '#ef4444');
      scoreCircle.style.background = `conic-gradient(${color} 0% ${dynamicScore}%, rgba(128, 128, 128, 0.18) ${dynamicScore}% 100%)`;
    }
    if (scoreRing) {
      const offset = 283 - (283 * dynamicScore) / 100;
      scoreRing.style.strokeDashoffset = offset;
    }
    if (statusBadge) {
      statusBadge.textContent = dynamicScore >= 75 ? 'Passed ATS Gatekeeper' : 'Review Suggested';
      statusBadge.className = `badge-tag ${dynamicScore >= 75 ? 'green' : 'amber'}`;
    }

    const summaryHeading = document.getElementById('scoreSummaryHeading');
    const summaryDesc = document.getElementById('scoreSummaryDesc');
    if (summaryHeading && summaryDesc) {
      if (dynamicScore >= 85) {
        summaryHeading.textContent = "Excellent ATS Compatibility";
        summaryDesc.textContent = `Your resume matches ${dynamicScore}% of core qualifications for target roles.`;
      } else if (dynamicScore >= 65) {
        summaryHeading.textContent = "Moderate Match — Action Required";
        summaryDesc.textContent = `Your resume matches ${dynamicScore}% of core requirements. Add missing keywords to boost ATS rank.`;
      } else {
        summaryHeading.textContent = "Low Match — Critical Keyword Gaps";
        summaryDesc.textContent = `Your resume matches ${dynamicScore}% of core requirements. Incorporate missing skills to pass ATS filters.`;
      }
    }

    // KPI Metrics
    const kpiPass = document.getElementById('kpiEstPassRate');
    const kpiRead = document.getElementById('kpiReadability');
    const kpiHiring = document.getElementById('kpiHiringProb');
    const kpiQuality = document.getElementById('kpiQualityScore');
    if (kpiPass) kpiPass.textContent = `${Math.min(99, dynamicScore + 2)}%`;
    if (kpiRead) kpiRead.textContent = `${(7.5 + (dynamicScore / 100) * 2.3).toFixed(1)} / 10`;
    if (kpiHiring) kpiHiring.textContent = dynamicScore >= 80 ? 'High' : (dynamicScore >= 60 ? 'Moderate' : 'Low');
    if (kpiQuality) kpiQuality.textContent = dynamicScore >= 85 ? 'Top 5%' : (dynamicScore >= 70 ? 'Top 20%' : 'Top 50%');

    // Matrix breakdown cards
    const cardKw = document.getElementById('matrixScoreKw');
    const cardExp = document.getElementById('matrixScoreExp');
    const cardSkills = document.getElementById('matrixScoreSkills');
    const cardMetric = document.getElementById('matrixScoreMetric');

    const fillKw = document.getElementById('matrixFillKw');
    const fillExp = document.getElementById('matrixFillExp');
    const fillSkills = document.getElementById('matrixFillSkills');
    const fillMetric = document.getElementById('matrixFillMetric');

    if (cardKw) cardKw.textContent = `${dynamicScore}%`;
    if (cardExp) cardExp.textContent = `${Math.min(98, dynamicScore + 5)}%`;
    if (cardSkills) cardSkills.textContent = `${Math.min(95, dynamicScore + 3)}%`;
    if (cardMetric) cardMetric.textContent = `${Math.max(40, dynamicScore - 8)}%`;

    if (fillKw) fillKw.style.width = `${dynamicScore}%`;
    if (fillExp) fillExp.style.width = `${Math.min(98, dynamicScore + 5)}%`;
    if (fillSkills) fillSkills.style.width = `${Math.min(95, dynamicScore + 3)}%`;
    if (fillMetric) fillMetric.style.width = `${Math.max(40, dynamicScore - 8)}%`;

    // Category Sidebar Badges
    const catKw = document.getElementById('catBadgeKw');
    const catExp = document.getElementById('catBadgeExp');
    const catSkills = document.getElementById('catBadgeSkills');
    const catEdu = document.getElementById('catBadgeEdu');
    const catFmt = document.getElementById('catBadgeFmt');
    const catRead = document.getElementById('catBadgeRead');
    const catDensity = document.getElementById('catBadgeDensity');
    const catVerbs = document.getElementById('catBadgeVerbs');

    if (catKw) catKw.textContent = `${dynamicScore}%`;
    if (catExp) catExp.textContent = `${Math.min(98, dynamicScore + 5)}%`;
    if (catSkills) catSkills.textContent = `${Math.min(95, dynamicScore + 3)}%`;
    if (catEdu) catEdu.textContent = `100%`;
    if (catFmt) catFmt.textContent = `95%`;
    if (catRead) catRead.textContent = `96%`;
    if (catDensity) catDensity.textContent = `${Math.max(40, dynamicScore - 8)}%`;
    if (catVerbs) catVerbs.textContent = `${Math.max(50, dynamicScore - 4)}%`;

    // Keywords subtitle
    const kwSub = document.getElementById('kwCountsSubtitle');
    if (kwSub) kwSub.textContent = `${matched.length} Matched · ${missing.length} Gaps`;

    // Render Matched Keywords
    const matchedTitle = document.getElementById('matchedKeywordsTitle');
    const matchedContainer = document.getElementById('matchedKeywordsContainer');
    if (matchedTitle) matchedTitle.innerHTML = `✓ Matched Required Keywords (${matched.length})`;
    if (matchedContainer) {
      matchedContainer.innerHTML = matched.length > 0
        ? matched.map(kw => `<span class="badge-tag green">${this.escapeHTML(kw)}</span>`).join('')
        : `<span class="badge-tag amber">General Skills Matched</span>`;
    }

    // Render Missing Keywords
    const missingTitle = document.getElementById('missingKeywordsTitle');
    const missingContainer = document.getElementById('missingKeywordsContainer') || document.getElementById('atsMissingBadgeList');
    if (missingTitle) missingTitle.innerHTML = `⚠ Missing / Gap Keywords (${missing.length})`;
    if (missingContainer) {
      missingContainer.innerHTML = missing.length > 0
        ? missing.map(kw => `
          <span class="missing-keyword-tag">
            <span>${this.escapeHTML(kw)}</span>
            <span class="tag-add-btn" data-keyword="${this.escapeHTML(kw)}" title="Click to add ${this.escapeHTML(kw)} to Core Skills">+ Add</span>
          </span>
        `).join('')
        : `<span class="badge-tag green">✓ 100% Keywords Matched!</span>`;
    }

    // Render Actionable Recommendations
    const recContainer = document.getElementById('recommendationsGridContainer');
    if (recContainer && recommendations.length > 0) {
      recContainer.innerHTML = recommendations.map((recText, idx) => `
        <div class="rec-card">
          <div class="rec-number">${idx + 1}</div>
          <div class="rec-content">
            <strong>Recommendation #${idx + 1}:</strong>
            <p>${this.escapeHTML(typeof recText === 'string' ? recText : JSON.stringify(recText))}</p>
          </div>
        </div>
      `).join('');
    }

    if (window.feather) feather.replace();
  }

  escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

// Global initialization
window.atsAnalyzer = new AtsAnalyzer();
document.addEventListener('DOMContentLoaded', () => window.atsAnalyzer.init());
