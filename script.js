/**
 * ResuAI // Modern Developer SaaS Platform Engine
 * Pure Vanilla JavaScript — Zero External Heavy Framework Dependencies
 *
 * Modules:
 * 1. Theme Management (5 CSS Custom Property Themes)
 * 2. Auth State & View Switching (Login / Register vs Dashboard)
 * 3. Tab & Sidebar Navigation (Resume Builder, ATS Analyzer, etc.)
 * 4. Mobile Navigation Drawer
 * 5. Automatic Form Data Persistence (LocalStorage Auto-Save)
 * 6. Live Resume Builder & PDF Export Trigger
 * 7. ATS Analyzer Diagnostic Report & Scanner Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Feather Vector Icons
  if (window.feather) {
    feather.replace();
  }

  /* ==========================================================================
     1. Theme Management (5 UI Themes via body[data-theme])
     ========================================================================== */
  const THEME_STORAGE_KEY = 'resuai-dashboard-theme';
  const themeButtons = document.querySelectorAll('.theme-btn');
  const body = document.body;

  /**
   * Applies the chosen theme ID to the <body> data-theme attribute,
   * updates active states on theme switcher buttons, and saves to localStorage.
   * @param {string} themeId - e.g. 'light-modern', 'dark-obsidian', 'cyber-purple', 'emerald-slate', 'sunset-amber'
   */
  function setTheme(themeId) {
    if (!themeId) return;
    
    // Update data-theme attribute on <body>
    body.setAttribute('data-theme', themeId);

    // Update active button state across all top-bar theme switchers
    themeButtons.forEach((btn) => {
      const btnTheme = btn.getAttribute('data-theme-id');
      if (btnTheme === themeId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Persist preference to localStorage
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    } catch (e) {
      console.warn('LocalStorage not accessible for theme persistence:', e);
    }
  }

  // Attach click listeners to all theme switcher buttons
  themeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const selectedTheme = btn.getAttribute('data-theme-id');
      setTheme(selectedTheme);
    });
  });

  // Restore saved theme on initial page load (default: 'light-modern')
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'light-modern';
  setTheme(savedTheme);

  /* ==========================================================================
     2. Auth State & Screen View Toggle
     ========================================================================== */
  const AUTH_STORAGE_KEY = 'resuai-logged-in';
  const authContainer = document.getElementById('authContainer');
  const appContainer = document.getElementById('appContainer');
  const authForm = document.getElementById('authForm');
  const authTitle = document.getElementById('authTitle');
  const authSubtitle = document.getElementById('authSubtitle');
  const authSubmitText = document.getElementById('authSubmitText');
  const nameField = document.getElementById('nameField');
  const authToggleQuestion = document.getElementById('authToggleQuestion');
  const authToggleBtn = document.getElementById('authToggleBtn');
  const ssoGithubBtn = document.getElementById('ssoGithubBtn');
  const ssoGoogleBtn = document.getElementById('ssoGoogleBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const topSignoutBtn = document.getElementById('topSignoutBtn');

  let isSignUpMode = false;

  /**
   * Reads authentication state from localStorage and toggles between the Login screen
   * and the Main Dashboard layout.
   */
  function updateAuthStateView() {
    const isLoggedIn = localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
    if (isLoggedIn) {
      if (authContainer) authContainer.style.display = 'none';
      if (appContainer) appContainer.style.display = 'flex';
    } else {
      if (authContainer) authContainer.style.display = 'flex';
      if (appContainer) appContainer.style.display = 'none';
    }
  }

  // Toggle between "Sign In" and "Sign Up" form state
  if (authToggleBtn) {
    authToggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      isSignUpMode = !isSignUpMode;

      if (isSignUpMode) {
        authTitle.textContent = 'Create an account';
        authSubtitle.textContent = 'Get started with ResuAI to build & analyze developer resumes.';
        authSubmitText.textContent = 'Create Account & Launch';
        nameField.style.display = 'flex';
        authToggleQuestion.textContent = 'Already have an account?';
        authToggleBtn.textContent = 'Sign In';
      } else {
        authTitle.textContent = 'Welcome back';
        authSubtitle.textContent = 'Sign in to your ResuAI workspace to access your resumes & ATS metrics.';
        authSubmitText.textContent = 'Sign In to Dashboard';
        nameField.style.display = 'none';
        authToggleQuestion.textContent = "Don't have an account?";
        authToggleBtn.textContent = 'Sign Up';
      }
      if (window.feather) feather.replace();
    });
  }

  // Form Submission handler
  if (authForm) {
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('authEmail').value;
      const password = document.getElementById('authPassword').value;

      if (!email || !password) {
        alert('Please enter your email address and password.');
        return;
      }

      localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      updateAuthStateView();
    });
  }

  // SSO Action handlers
  if (ssoGithubBtn) {
    ssoGithubBtn.addEventListener('click', () => {
      localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      updateAuthStateView();
    });
  }

  if (ssoGoogleBtn) {
    ssoGoogleBtn.addEventListener('click', () => {
      localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      updateAuthStateView();
    });
  }

  // Sign out handlers
  function handleSignOut(e) {
    e.preventDefault();
    localStorage.setItem(AUTH_STORAGE_KEY, 'false');
    updateAuthStateView();
  }

  if (logoutBtn) logoutBtn.addEventListener('click', handleSignOut);
  if (topSignoutBtn) topSignoutBtn.addEventListener('click', handleSignOut);

  // Initialize view state
  updateAuthStateView();

  /* ==========================================================================
     3. Tab & Sidebar Navigation Engine
     ========================================================================== */
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const breadcrumbActive = document.getElementById('breadcrumbActive');
  const pageTitle = document.getElementById('pageTitle');
  const pageDescription = document.getElementById('pageDescription');

  const TAB_METADATA = {
    'resume-builder': {
      title: 'Senior Developer Resume Studio',
      description: 'Optimize your developer resume for high-tier tech companies & ATS scanners with real-time scoring.',
      breadcrumb: 'Resume Builder'
    },
    'ats-analyzer': {
      title: 'ATS Keyword Matcher & Gap Analysis',
      description: 'Scan job descriptions to identify missing technical keywords & boost application response rates.',
      breadcrumb: 'ATS Analyzer'
    },
    'job-tracker': {
      title: 'Job Applications Pipeline',
      description: 'Track your ongoing interviews, offers, and submitted applications in one workspace.',
      breadcrumb: 'Job Applications'
    },
    'templates': {
      title: 'Developer Resume Templates Library',
      description: 'Choose from modern, ATS-friendly markdown and HTML resume layouts.',
      breadcrumb: 'Templates Library'
    },
    'analytics': {
      title: 'Score Analytics & Metrics',
      description: 'View your profile optimization velocity, ATS match history, and performance statistics.',
      breadcrumb: 'Score Analytics'
    },
    'settings': {
      title: 'Platform & API Settings',
      description: 'Configure your AI model preferences, custom domains, and team workspace settings.',
      breadcrumb: 'Settings'
    }
  };

  /**
   * Switches the active view tab using CSS `.active` class toggling
   * and updates breadcrumb headers smoothly without page reloads.
   * @param {string} tabId - ID of target tab (e.g. 'resume-builder', 'ats-analyzer')
   */
  function switchTab(tabId) {
    if (!tabId || !TAB_METADATA[tabId]) return;

    // Toggle active state on sidebar navigation links
    navItems.forEach((item) => {
      if (item.getAttribute('data-tab') === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Toggle active state on content tab panes
    tabPanes.forEach((pane) => {
      if (pane.id === `tab-${tabId}`) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    // Update top bar breadcrumbs and workspace header
    const meta = TAB_METADATA[tabId];
    if (breadcrumbActive) breadcrumbActive.textContent = meta.breadcrumb;
    if (pageTitle) pageTitle.textContent = meta.title;
    if (pageDescription) pageDescription.textContent = meta.description;

    // Close mobile drawer if active
    closeMobileSidebar();
  }

  // Attach click event handlers to all sidebar navigation links
  navItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = item.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  /* ==========================================================================
     4. Mobile Sidebar Navigation Drawer
     ========================================================================== */
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const mobileToggleBtn = document.getElementById('mobileToggleBtn');
  const mobileCloseBtn = document.getElementById('mobileCloseBtn');

  function openMobileSidebar() {
    if (sidebar) sidebar.classList.add('open');
    if (sidebarOverlay) sidebarOverlay.classList.add('active');
  }

  function closeMobileSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
  }

  if (mobileToggleBtn) mobileToggleBtn.addEventListener('click', openMobileSidebar);
  if (mobileCloseBtn) mobileCloseBtn.addEventListener('click', closeMobileSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeMobileSidebar);

  /* ==========================================================================
     5. Automatic Form Persistence (LocalStorage Auto-Save)
     ========================================================================== */
  const DRAFT_STORAGE_KEY = 'resuai-draft-resume';

  const inputFullName = document.getElementById('inputFullName');
  const inputJobTitle = document.getElementById('inputJobTitle');
  const inputEmail = document.getElementById('inputEmail');
  const inputPhone = document.getElementById('inputPhone');
  const inputEducation = document.getElementById('inputEducation');
  const bulletPoints = document.getElementById('bulletPoints');
  const charCounter = document.getElementById('charCounter');
  const atsJdInput = document.getElementById('atsJdInput');

  const previewName = document.getElementById('previewName');
  const previewRole = document.getElementById('previewRole');
  const previewMeta = document.getElementById('previewMeta');
  const previewEducation = document.getElementById('previewEducation');
  const previewSkills = document.getElementById('previewSkills');
  const previewBullets = document.getElementById('previewBullets');

  const btnSaveDraft = document.getElementById('btnSaveDraft');
  const btnDraftSaveFooter = document.getElementById('btnDraftSaveFooter');
  const btnNextStep = document.getElementById('btnNextStep');
  const btnPrintPdf = document.getElementById('btnPrintPdf');
  const stepItems = document.querySelectorAll('.step-item');

  /**
   * Saves all current form fields and skill tags to localStorage automatically.
   */
  function autoSaveFormFields() {
    const draftData = {
      fullName: inputFullName ? inputFullName.value : '',
      jobTitle: inputJobTitle ? inputJobTitle.value : '',
      email: inputEmail ? inputEmail.value : '',
      phone: inputPhone ? inputPhone.value : '',
      education: inputEducation ? inputEducation.value : '',
      bulletPoints: bulletPoints ? bulletPoints.value : '',
      atsJdText: atsJdInput ? atsJdInput.value : '',
      skills: Array.from(document.querySelectorAll('#skillsTagsContainer .tag')).map(t => t.textContent.replace('x', '').trim())
    };

    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
    } catch (e) {
      console.warn('Could not auto-save form fields to LocalStorage:', e);
    }
  }

  /**
   * Restores form fields from localStorage on startup.
   */
  function loadSavedFormFields() {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.fullName && inputFullName) inputFullName.value = draft.fullName;
        if (draft.jobTitle && inputJobTitle) inputJobTitle.value = draft.jobTitle;
        if (draft.email && inputEmail) inputEmail.value = draft.email;
        if (draft.phone && inputPhone) inputPhone.value = draft.phone;
        if (draft.education && inputEducation) inputEducation.value = draft.education;
        if (draft.bulletPoints && bulletPoints) bulletPoints.value = draft.bulletPoints;
        if (draft.atsJdText && atsJdInput) atsJdInput.value = draft.atsJdText;

        syncLivePreview();
        syncLiveSkills();
      }
    } catch (e) {
      console.warn('Could not restore form fields from LocalStorage:', e);
    }
  }

  /* ==========================================================================
     6. Live Resume Document Sync & PDF Print Trigger
     ========================================================================== */
  
  function updateCharCounter() {
    if (bulletPoints && charCounter) {
      const len = bulletPoints.value.length;
      charCounter.textContent = `${len} / 2000 characters`;
    }
  }

  function syncLiveSkills() {
    if (!previewSkills) return;
    const tagElements = document.querySelectorAll('#skillsTagsContainer .tag');
    const skillList = Array.from(tagElements).map(tag => tag.textContent.replace('x', '').trim()).filter(Boolean);
    previewSkills.textContent = skillList.length > 0 ? skillList.join(', ') : 'TypeScript, React, Design Systems';
  }

  function syncLivePreview() {
    if (inputFullName && previewName) {
      previewName.textContent = inputFullName.value.trim().toUpperCase() || 'MANISH KUNTAL';
    }
    if (inputJobTitle && previewRole) {
      previewRole.textContent = inputJobTitle.value.trim().toUpperCase() || 'SENIOR DEVELOPER';
    }
    if (previewMeta) {
      const email = inputEmail ? inputEmail.value.trim() : 'manish@resuai.dev';
      const phone = inputPhone ? inputPhone.value.trim() : '+1 (415) 890-2341';
      previewMeta.textContent = `San Francisco, CA • ${email} • ${phone}`;
    }
    if (inputEducation && previewEducation) {
      previewEducation.textContent = inputEducation.value.trim() || 'B.S. Computer Science — Stanford University (2022)';
    }
    if (bulletPoints && previewBullets) {
      const lines = bulletPoints.value.split('\n').filter(line => line.trim() !== '');
      if (lines.length > 0) {
        previewBullets.innerHTML = lines.map(line => `<li>${line.trim().replace(/^[-•*]\s*/, '')}</li>`).join('');
      } else {
        previewBullets.innerHTML = `<li>Architected scalable UI component system serving 2M+ active users.</li>`;
      }
    }
    updateCharCounter();
    autoSaveFormFields();
  }

  // Bind input events for live preview sync & automatic localStorage saving
  const liveSyncInputs = document.querySelectorAll('.live-sync');
  liveSyncInputs.forEach(input => {
    input.addEventListener('input', () => {
      syncLivePreview();
      autoSaveFormFields();
    });
  });

  if (atsJdInput) {
    atsJdInput.addEventListener('input', autoSaveFormFields);
  }

  // Tag removal & addition
  const tagsContainer = document.getElementById('skillsTagsContainer');
  const skillInputField = document.getElementById('skillInputField');

  if (tagsContainer) {
    tagsContainer.addEventListener('click', (e) => {
      const closeSvg = e.target.closest('svg');
      if (closeSvg && closeSvg.parentElement.classList.contains('tag')) {
        closeSvg.parentElement.remove();
        syncLiveSkills();
        autoSaveFormFields();
      }
    });
  }

  if (skillInputField) {
    skillInputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && skillInputField.value.trim() !== '') {
        e.preventDefault();
        const skillText = skillInputField.value.trim();
        const newTag = document.createElement('span');
        newTag.className = 'tag';
        newTag.innerHTML = `${skillText} <i data-feather="x"></i>`;
        tagsContainer.insertBefore(newTag, skillInputField);
        skillInputField.value = '';
        if (window.feather) feather.replace();
        syncLiveSkills();
        autoSaveFormFields();
      }
    });
  }

  // Save Draft button visual feedback
  function handleManualSave(buttonEl) {
    autoSaveFormFields();
    if (buttonEl) {
      const originalText = buttonEl.innerHTML;
      buttonEl.innerHTML = `<i data-feather="check"></i> <span>Draft Saved!</span>`;
      if (window.feather) feather.replace();
      setTimeout(() => {
        buttonEl.innerHTML = originalText;
        if (window.feather) feather.replace();
      }, 2000);
    }
  }

  if (btnSaveDraft) btnSaveDraft.addEventListener('click', () => handleManualSave(btnSaveDraft));
  if (btnDraftSaveFooter) btnDraftSaveFooter.addEventListener('click', () => handleManualSave(btnDraftSaveFooter));

  // Step Progress Bar (Step 1 -> 2 -> 3)
  function setStep(stepNumber) {
    stepItems.forEach(item => {
      const step = parseInt(item.getAttribute('data-step'));
      if (step === stepNumber) {
        item.classList.add('active');
        item.classList.remove('completed');
      } else if (step < stepNumber) {
        item.classList.remove('active');
        item.classList.add('completed');
      } else {
        item.classList.remove('active');
        item.classList.remove('completed');
      }
    });
  }

  stepItems.forEach(item => {
    item.addEventListener('click', () => {
      const stepNum = parseInt(item.getAttribute('data-step'));
      setStep(stepNum);
    });
  });

  if (btnNextStep) {
    btnNextStep.addEventListener('click', () => {
      setStep(2);
      const origText = btnNextStep.innerHTML;
      btnNextStep.innerHTML = `<i data-feather="loader"></i> <span>Generating AI Match...</span>`;
      if (window.feather) feather.replace();

      setTimeout(() => {
        setStep(3);
        btnNextStep.innerHTML = `<i data-feather="check-circle"></i> <span>Resume Generated!</span>`;
        if (window.feather) feather.replace();

        const previewCard = document.getElementById('previewCardSection');
        if (previewCard) {
          previewCard.scrollIntoView({ behavior: 'smooth' });
        }

        setTimeout(() => {
          btnNextStep.innerHTML = origText;
          if (window.feather) feather.replace();
        }, 2500);
      }, 1000);
    });
  }

  // Print PDF Trigger
  if (btnPrintPdf) {
    btnPrintPdf.addEventListener('click', () => {
      window.print();
    });
  }

  /* ==========================================================================
     7. ATS Analyzer Diagnostics Engine & Gemini 2.5 Flash AI Integration
     ========================================================================== */
  const GEMINI_API_KEY = ""; // Define default Gemini API Key here if desired

  const atsDropZone = document.getElementById('atsDropZone');
  const btnSelectPdfFile = document.getElementById('btnSelectPdfFile');
  const pdfFileInput = document.getElementById('pdfFileInput');
  const selectedFileBadge = document.getElementById('selectedFileBadge');
  const selectedFileName = document.getElementById('selectedFileName');
  const btnRunAtsAnalysis = document.getElementById('btnRunAtsAnalysis');
  const btnRunAtsText = document.getElementById('btnRunAtsText');

  const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
  const btnSaveGeminiKey = document.getElementById('btnSaveGeminiKey');

  const atsLoadingState = document.getElementById('atsLoadingState');
  const atsProgressFill = document.getElementById('atsProgressFill');
  const atsProgressPercent = document.getElementById('atsProgressPercent');
  const loadingStepText = document.getElementById('loadingStepText');
  const atsResults = document.getElementById('ats-results');
  const scoreNumber = document.getElementById('scoreNumber');
  const scoreCircle = document.getElementById('scoreCircle');
  const scoreSummaryHeading = document.getElementById('scoreSummaryHeading');
  const scoreSummaryDesc = document.getElementById('scoreSummaryDesc');

  const matchedKeywordsTitle = document.getElementById('matchedKeywordsTitle');
  const matchedKeywordsContainer = document.getElementById('matchedKeywordsContainer');
  const missingKeywordsTitle = document.getElementById('missingKeywordsTitle');
  const missingKeywordsContainer = document.getElementById('missingKeywordsContainer');
  const recommendationsGridContainer = document.getElementById('recommendationsGridContainer');

  let uploadedFileText = "";

  // Load saved Gemini API Key from localStorage
  if (geminiApiKeyInput) {
    const savedKey = localStorage.getItem('resuai-gemini-api-key') || GEMINI_API_KEY;
    if (savedKey) geminiApiKeyInput.value = savedKey;
  }

  if (btnSaveGeminiKey && geminiApiKeyInput) {
    btnSaveGeminiKey.addEventListener('click', (e) => {
      e.preventDefault();
      const keyVal = geminiApiKeyInput.value.trim();
      if (keyVal) {
        localStorage.setItem('resuai-gemini-api-key', keyVal);
        btnSaveGeminiKey.textContent = 'Saved!';
        setTimeout(() => { btnSaveGeminiKey.textContent = 'Save Key'; }, 2000);
      }
    });
  }

  // Configure PDF.js worker URL if library is loaded
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  /**
   * Extracts text content from a PDF file using PDF.js
   * @param {File} file 
   */
  async function extractPdfText(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      if (!window.pdfjsLib) return "";
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let fullText = "";
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(" ");
        fullText += pageText + " ";
      }
      return fullText;
    } catch (err) {
      console.warn("PDF.js parsing error:", err);
      return "";
    }
  }

  if (btnSelectPdfFile && pdfFileInput) {
    btnSelectPdfFile.addEventListener('click', (e) => {
      e.preventDefault();
      pdfFileInput.click();
    });
  }

  async function handleFileSelected(file) {
    if (!file) return;
    if (selectedFileName && selectedFileBadge) {
      selectedFileName.textContent = file.name;
      selectedFileBadge.style.display = 'inline-flex';
    }

    if (file.type === "application/pdf" || file.name.endsWith('.pdf')) {
      uploadedFileText = await extractPdfText(file);
    } else if (file.type === "text/plain" || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        uploadedFileText = e.target.result || "";
      };
      reader.readAsText(file);
    }
  }

  if (pdfFileInput) {
    pdfFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelected(e.target.files[0]);
      }
    });
  }

  // Drag and drop event listeners
  if (atsDropZone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      atsDropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        atsDropZone.style.borderColor = 'var(--accent-primary)';
        atsDropZone.style.backgroundColor = 'var(--bg-active)';
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      atsDropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        atsDropZone.style.borderColor = 'var(--border-color)';
        atsDropZone.style.backgroundColor = 'var(--bg-hover)';
      }, false);
    });

    atsDropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files[0]) {
        handleFileSelected(files[0]);
      }
    });
  }

  /**
   * Renders the ATS diagnostic report UI given structured data.
   * @param {Object} report - { score, matchedKeywords, missingKeywords, recommendations }
   */
  function renderAtsReportUI(report) {
    const dynamicScore = Math.min(100, Math.max(0, parseInt(report.score) || 85));
    const matched = report.matchedKeywords || [];
    const missing = report.missingKeywords || [];
    const recommendations = report.recommendations || [];

    // Render score & progress circle
    if (scoreNumber) scoreNumber.textContent = `${dynamicScore}%`;
    if (scoreCircle) {
      scoreCircle.style.background = `conic-gradient(#10b981 0% ${dynamicScore}%, rgba(0, 0, 0, 0.08) ${dynamicScore}% 100%)`;
    }

    if (scoreSummaryHeading && scoreSummaryDesc) {
      if (dynamicScore >= 85) {
        scoreSummaryHeading.textContent = "High Match Potential";
        scoreSummaryDesc.textContent = `Your resume matches ${dynamicScore}% of core qualifications for target roles.`;
      } else {
        scoreSummaryHeading.textContent = "Moderate Match — Action Required";
        scoreSummaryDesc.textContent = `Your resume matches ${dynamicScore}% of core requirements. Add missing technical keywords to boost ATS rank.`;
      }
    }

    // Render Matched Keywords
    if (matchedKeywordsTitle) matchedKeywordsTitle.innerHTML = `<i data-feather="check"></i> Matched Keywords (${matched.length})`;
    if (matchedKeywordsContainer) {
      if (matched.length > 0) {
        matchedKeywordsContainer.innerHTML = matched.map(kw => `<span class="badge-tag green">${kw}</span>`).join('');
      } else {
        matchedKeywordsContainer.innerHTML = `<span class="badge-tag amber">General Skills Matched</span>`;
      }
    }

    // Render Missing Keywords
    if (missingKeywordsTitle) missingKeywordsTitle.innerHTML = `<i data-feather="x"></i> Missing / Gap Keywords (${missing.length})`;
    if (missingKeywordsContainer) {
      if (missing.length > 0) {
        missingKeywordsContainer.innerHTML = missing.map(kw => `<span class="badge-tag red">${kw}</span>`).join('');
      } else {
        missingKeywordsContainer.innerHTML = `<span class="badge-tag green">No Critical Keyword Gaps</span>`;
      }
    }

    // Render Actionable Recommendations
    if (recommendationsGridContainer) {
      if (recommendations.length > 0) {
        recommendationsGridContainer.innerHTML = recommendations.map((recText, idx) => `
          <div class="rec-card">
            <div class="rec-number">${idx + 1}</div>
            <div class="rec-content">
              <strong>Recommendation #${idx + 1}:</strong>
              <p>${recText}</p>
            </div>
          </div>
        `).join('');
      }
    }

    if (window.feather) feather.replace();
  }

  // Common technical and professional keywords list for local fallback matching
  const KNOWN_KEYWORDS = [
    'TypeScript', 'React', 'Next.js', 'JavaScript', 'HTML', 'CSS', 'Vanilla CSS',
    'Design Systems', 'GraphQL', 'REST APIs', 'Web Vitals', 'Performance',
    'Node', 'Kubernetes', 'Docker', 'Redis', 'CI/CD', 'Communication',
    'Project Management', 'System Architecture', 'Python', 'Git', 'Agile'
  ];

  /**
   * Local Client-Side Fallback Evaluator (used when no API key is set or if offline)
   */
  function runClientAtsDiagnostic() {
    const jdRawText = (atsJdInput ? atsJdInput.value : "") + " " + uploadedFileText;
    const jdLower = jdRawText.toLowerCase();

    let candidateSkillsText = "";
    if (inputJobTitle) candidateSkillsText += " " + inputJobTitle.value;
    if (bulletPoints) candidateSkillsText += " " + bulletPoints.value;

    const skillTags = document.querySelectorAll('#skillsTagsContainer .tag');
    skillTags.forEach(tag => {
      candidateSkillsText += " " + tag.textContent;
    });

    const candidateLower = (candidateSkillsText + " " + uploadedFileText).toLowerCase();
    const jdKeywordsPresent = KNOWN_KEYWORDS.filter(kw => jdLower.includes(kw.toLowerCase()));
    const activeJdKeywords = jdKeywordsPresent.length >= 3 ? jdKeywordsPresent : 
      ['TypeScript', 'React', 'Design Systems', 'Vanilla CSS', 'Web Vitals', 'GraphQL', 'Kubernetes', 'Redis', 'CI/CD'];

    const matched = [];
    const missing = [];

    activeJdKeywords.forEach(kw => {
      if (candidateLower.includes(kw.toLowerCase())) {
        matched.push(kw);
      } else {
        missing.push(kw);
      }
    });

    const total = activeJdKeywords.length || 1;
    const matchRatio = matched.length / total;
    const dynamicScore = Math.min(94, Math.max(70, Math.round(70 + (matchRatio * 24))));

    const topMissing = missing.slice(0, 2).join(', ') || 'Kubernetes / Redis';

    renderAtsReportUI({
      score: dynamicScore,
      matchedKeywords: matched,
      missingKeywords: missing,
      recommendations: [
        `Add 1-2 instances of missing keywords (${topMissing}) under your technical project bullet points.`,
        `Quantify Web Vitals or performance metrics with explicit percentage improvements (e.g. Reduced LCP by 42%).`,
        `Maintain standard section headings like TECHNICAL EXPERTISE for 100% parsing accuracy in Lever & Greenhouse.`
      ]
    });
  }

  /**
   * Calls secure Node.js backend endpoint /api/analyze (which communicates with Gemini API server-side).
   * @param {string} jdText 
   * @param {string} resumeText 
   */
  async function fetchBackendAtsAnalysis(jdText, resumeText) {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jdText, resumeText })
    });

    if (!response.ok) {
      throw new Error(`Backend API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  // Run ATS Analysis Action Button Handler
  if (btnRunAtsAnalysis) {
    btnRunAtsAnalysis.addEventListener('click', async (e) => {
      e.preventDefault();

      // Show loading button state
      const origBtnHTML = btnRunAtsAnalysis.innerHTML;
      if (btnRunAtsText) {
        btnRunAtsText.textContent = "Analyzing with Gemini 2.5 Flash AI...";
      }
      btnRunAtsAnalysis.disabled = true;

      // Hide results card if previously visible
      if (atsResults) atsResults.style.display = 'none';

      // Show scanner loading card
      if (atsLoadingState) {
        atsLoadingState.style.display = 'flex';
        atsLoadingState.scrollIntoView({ behavior: 'smooth' });
      }

      let progress = 0;
      if (atsProgressFill) atsProgressFill.style.width = '0%';
      if (atsProgressPercent) atsProgressPercent.textContent = '0%';

      const steps = [
        "Connecting to Gemini 2.5 Flash AI Engine...",
        "Parsing resume document structure & PDF items...",
        "Evaluating job requirements with Gemini LLM...",
        "Generating structured JSON ATS diagnostic report..."
      ];

      const interval = setInterval(() => {
        progress += 10;
        if (atsProgressFill) atsProgressFill.style.width = `${progress}%`;
        if (atsProgressPercent) atsProgressPercent.textContent = `${progress}%`;

        if (loadingStepText) {
          if (progress < 25) loadingStepText.textContent = steps[0];
          else if (progress < 55) loadingStepText.textContent = steps[1];
          else if (progress < 85) loadingStepText.textContent = steps[2];
          else loadingStepText.textContent = steps[3];
        }

        if (progress >= 90) clearInterval(interval);
      }, 60);

      const jdText = atsJdInput ? atsJdInput.value : "";
      
      // Build candidate resume text fallback
      let candidateResumeText = uploadedFileText;
      if (!candidateResumeText) {
        if (inputFullName) candidateResumeText += " " + inputFullName.value;
        if (inputJobTitle) candidateResumeText += " " + inputJobTitle.value;
        if (bulletPoints) candidateResumeText += " " + bulletPoints.value;
        document.querySelectorAll('#skillsTagsContainer .tag').forEach(tag => {
          candidateResumeText += " " + tag.textContent;
        });
      }

      try {
        const aiData = await fetchBackendAtsAnalysis(jdText, candidateResumeText);
        
        clearInterval(interval);
        if (atsProgressFill) atsProgressFill.style.width = '100%';
        if (atsProgressPercent) atsProgressPercent.textContent = '100%';

        setTimeout(() => {
          btnRunAtsAnalysis.innerHTML = origBtnHTML;
          btnRunAtsAnalysis.disabled = false;
          if (window.feather) feather.replace();

          if (atsLoadingState) atsLoadingState.style.display = 'none';
          renderAtsReportUI(aiData);

          if (atsResults) {
            atsResults.style.display = 'block';
            atsResults.scrollIntoView({ behavior: 'smooth' });
          }
        }, 300);
      } catch (error) {
        console.warn("Backend API call failed, using client-side fallback:", error);
        clearInterval(interval);

        btnRunAtsAnalysis.innerHTML = origBtnHTML;
        btnRunAtsAnalysis.disabled = false;
        if (window.feather) feather.replace();

        if (atsLoadingState) atsLoadingState.style.display = 'none';
        runClientAtsDiagnostic();

        if (atsResults) {
          atsResults.style.display = 'block';
          atsResults.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  }

  // Restore form persistence & initial live preview sync
  loadSavedFormFields();
  syncLivePreview();
  syncLiveSkills();
});

