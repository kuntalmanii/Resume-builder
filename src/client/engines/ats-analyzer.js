/**
 * ResuAI // ATS Diagnostic Engine Module (ats-analyzer.js)
 * Computes ATS match scores, extracts tech stack keywords,
 * and proxies Gemini AI diagnostic scans.
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
    if (btnScan) {
      btnScan.addEventListener('click', () => this.runAtsScan());
    }
  }

  /* ------ Extract Keywords & Calculate Score ------ */
  calculateScore(resumeText, targetJdText) {
    if (!resumeText || !targetJdText) return { score: 0, missing: [], matched: [] };

    const commonTechKeywords = [
      'javascript', 'typescript', 'react', 'node.js', 'express', 'python', 'django', 'fastapi',
      'docker', 'kubernetes', 'aws', 'gcp', 'postgresql', 'mongodb', 'graphql', 'rest api',
      'ci/cd', 'git', 'microservices', 'unit testing', 'system design', 'redis', 'kafka'
    ];

    const jdLower = targetJdText.toLowerCase();
    const resumeLower = resumeText.toLowerCase();

    const targetSkills = commonTechKeywords.filter(kw => jdLower.includes(kw));
    if (targetSkills.length === 0) return { score: 85, missing: [], matched: commonTechKeywords.slice(0, 5) };

    const matched = targetSkills.filter(kw => resumeLower.includes(kw));
    const missing = targetSkills.filter(kw => !resumeLower.includes(kw));

    const scorePct = Math.round((matched.length / targetSkills.length) * 100);
    this.currentScore = scorePct;
    this.missingKeywords = missing;
    this.extractedKeywords = matched;

    return { score: scorePct, missing, matched };
  }

  /* ------ Proxy 1-Click ATS Scan via Gemini AI Backend ------ */
  async runAtsScan() {
    const btnScan = document.getElementById('btnRunAtsAnalysis');
    const scoreBadge = document.getElementById('atsScoreBadge');
    const jdInput = document.getElementById('atsJdInput') || document.getElementById('atsTargetJdInput');

    const resumeContent = document.querySelector('.doc-editor-body')?.innerText || '';
    const jdText = jdInput?.value || '';

    if (btnScan) {
      btnScan.disabled = true;
      btnScan.innerHTML = `<svg class="spin-loader" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg> Scanning Document...`;
    }

    try {
      const response = await fetch('/api/ats-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: resumeContent, targetJdText: jdText })
      });

      const resData = await response.json();
      const score = resData?.score || this.calculateScore(resumeContent, jdText).score;

      this.renderBreakdownUi(score, resData?.missing || this.missingKeywords);

      // Trigger Getting Started Checklist task completion
      if (window.checklistManager) {
        window.checklistManager.markTaskComplete('analyze_resume');
      }

    } catch (err) {
      console.warn('ATS Gemini endpoint fallback to local calculation:', err.message);
      const localResult = this.calculateScore(resumeContent, jdText);
      this.renderBreakdownUi(localResult.score, localResult.missing);
    } finally {
      if (btnScan) {
        btnScan.disabled = false;
        btnScan.innerHTML = `<span>⚡ 1-Click ATS Scan</span>`;
      }
    }
  }

  renderBreakdownUi(score, missingSkills = []) {
    const scoreBadge = document.getElementById('atsScoreBadge');
    const scoreRing = document.getElementById('atsScoreRingProgress');
    const missingContainer = document.getElementById('atsMissingBadgeList');

    if (scoreBadge) scoreBadge.textContent = `${score}% Match`;
    if (scoreRing) {
      const offset = 283 - (283 * score) / 100;
      scoreRing.style.strokeDashoffset = offset;
    }

    if (missingContainer) {
      missingContainer.innerHTML = missingSkills.length > 0
        ? missingSkills.map(sk => `<span class="ats-missing-badge">+ ${sk}</span>`).join('')
        : `<span class="ats-success-badge">✓ 100% Keywords Matched!</span>`;
    }
  }
}

// Global initialization
window.atsAnalyzer = new AtsAnalyzer();
document.addEventListener('DOMContentLoaded', () => window.atsAnalyzer.init());
