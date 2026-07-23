/**
 * ResuAI // SaaS Dashboard & Auth State Logic
 * Handles 5 UI Themes, Auth Screen Toggle, Sidebar Navigation & Tab Switching
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Feather Icons
  if (window.feather) {
    feather.replace();
  }

  /* --------------------------------------------------------------------------
     1. Theme Management (5 UI Themes via body[data-theme])
     -------------------------------------------------------------------------- */
  const THEME_STORAGE_KEY = 'resuai-dashboard-theme';
  const themeButtons = document.querySelectorAll('.theme-btn');
  const body = document.body;

  // Function to apply a selected theme across all theme switchers
  function setTheme(themeId) {
    if (!themeId) return;
    
    // Set attribute on body tag
    body.setAttribute('data-theme', themeId);

    // Update active button state across all top bar theme switchers (Auth & Main Dashboard)
    themeButtons.forEach((btn) => {
      const btnTheme = btn.getAttribute('data-theme-id');
      if (btnTheme === themeId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Save to localStorage
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    } catch (e) {
      console.warn('LocalStorage not accessible:', e);
    }
  }

  // Add click listeners to theme switcher buttons
  themeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const selectedTheme = btn.getAttribute('data-theme-id');
      setTheme(selectedTheme);
    });
  });

  // Load saved theme from localStorage (default: light-modern)
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'light-modern';
  setTheme(savedTheme);

  /* --------------------------------------------------------------------------
     2. Auth State & View Toggle (Login / Sign Up vs Main Dashboard)
     -------------------------------------------------------------------------- */
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

  let isSignUpMode = false;

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

  // Toggle between Login and Sign Up form state
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

  // Login / Register Form Submission handler
  if (authForm) {
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('authEmail').value;
      const password = document.getElementById('authPassword').value;

      if (!email || !password) {
        alert('Please fill in your email and password.');
        return;
      }

      // Mock authentication success
      localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      updateAuthStateView();
    });
  }

  // SSO Quick Sign In
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

  // Sign out buttons
  const logoutBtn = document.getElementById('logoutBtn');
  const topSignoutBtn = document.getElementById('topSignoutBtn');

  function handleSignOut(e) {
    e.preventDefault();
    localStorage.setItem(AUTH_STORAGE_KEY, 'false');
    updateAuthStateView();
  }

  if (logoutBtn) logoutBtn.addEventListener('click', handleSignOut);
  if (topSignoutBtn) topSignoutBtn.addEventListener('click', handleSignOut);

  // Initialize view state on page load
  updateAuthStateView();

  /* --------------------------------------------------------------------------
     3. Navigation & Tab Switching Logic
     -------------------------------------------------------------------------- */
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

  function switchTab(tabId) {
    if (!tabId || !TAB_METADATA[tabId]) return;

    // Update active nav link
    navItems.forEach((item) => {
      if (item.getAttribute('data-tab') === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Show corresponding tab pane
    tabPanes.forEach((pane) => {
      if (pane.id === `tab-${tabId}`) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    // Update breadcrumb and header text
    const meta = TAB_METADATA[tabId];
    if (breadcrumbActive) breadcrumbActive.textContent = meta.breadcrumb;
    if (pageTitle) pageTitle.textContent = meta.title;
    if (pageDescription) pageDescription.textContent = meta.description;

    // Close mobile sidebar if open
    closeMobileSidebar();
  }

  // Attach click events to nav links
  navItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = item.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  /* --------------------------------------------------------------------------
     4. Mobile Sidebar Navigation Toggle
     -------------------------------------------------------------------------- */
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

  /* --------------------------------------------------------------------------
     5. Interactive Form & UI Feedbacks
     -------------------------------------------------------------------------- */
  
  // Auto-Optimize Button Animation
  const btnAutoOptimize = document.getElementById('btnAutoOptimize');
  if (btnAutoOptimize) {
    btnAutoOptimize.addEventListener('click', () => {
      const originalHTML = btnAutoOptimize.innerHTML;
      btnAutoOptimize.innerHTML = `<i data-feather="loader"></i> <span>Optimizing...</span>`;
      if (window.feather) feather.replace();

      setTimeout(() => {
        btnAutoOptimize.innerHTML = `<i data-feather="check"></i> <span>Optimized!</span>`;
        if (window.feather) feather.replace();
        
        setTimeout(() => {
          btnAutoOptimize.innerHTML = originalHTML;
          if (window.feather) feather.replace();
        }, 2000);
      }, 800);
    });
  }

  // Tag removal and addition
  const tagsContainer = document.getElementById('skillsTagsContainer');
  const skillInputField = document.getElementById('skillInputField');

  if (tagsContainer) {
    tagsContainer.addEventListener('click', (e) => {
      const closeSvg = e.target.closest('svg');
      if (closeSvg && closeSvg.parentElement.classList.contains('tag')) {
        closeSvg.parentElement.remove();
        syncLiveSkills();
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
      }
    });
  }

  /* --------------------------------------------------------------------------
     6. Resume Builder Step Bar, Live Document Sync, Draft Save & Print PDF
     -------------------------------------------------------------------------- */
  
  // Elements for live sync
  const inputFullName = document.getElementById('inputFullName');
  const inputJobTitle = document.getElementById('inputJobTitle');
  const inputEmail = document.getElementById('inputEmail');
  const inputPhone = document.getElementById('inputPhone');
  const inputEducation = document.getElementById('inputEducation');
  const bulletPoints = document.getElementById('bulletPoints');
  const charCounter = document.getElementById('charCounter');

  const previewName = document.getElementById('previewName');
  const previewRole = document.getElementById('previewRole');
  const previewMeta = document.getElementById('previewMeta');
  const previewEducation = document.getElementById('previewEducation');
  const previewSkills = document.getElementById('previewSkills');
  const previewBullets = document.getElementById('previewBullets');

  const stepItems = document.querySelectorAll('.step-item');
  const btnNextStep = document.getElementById('btnNextStep');
  const btnSaveDraft = document.getElementById('btnSaveDraft');
  const btnDraftSaveFooter = document.getElementById('btnDraftSaveFooter');
  const btnPrintPdf = document.getElementById('btnPrintPdf');

  // Character Counter update
  function updateCharCounter() {
    if (bulletPoints && charCounter) {
      const len = bulletPoints.value.length;
      charCounter.textContent = `${len} / 2000 characters`;
    }
  }

  // Synchronize Live Skills list from tags
  function syncLiveSkills() {
    if (!previewSkills) return;
    const tagElements = document.querySelectorAll('#skillsTagsContainer .tag');
    const skillList = Array.from(tagElements).map(tag => tag.textContent.replace('x', '').trim()).filter(Boolean);
    previewSkills.textContent = skillList.length > 0 ? skillList.join(', ') : 'TypeScript, React, Design Systems';
  }

  // Synchronize Live Resume document
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
  }

  // Add input listeners for live synchronization
  const liveSyncInputs = document.querySelectorAll('.live-sync');
  liveSyncInputs.forEach(input => {
    input.addEventListener('input', syncLivePreview);
  });

  // Save Draft to LocalStorage
  const DRAFT_STORAGE_KEY = 'resuai-draft-resume';

  function saveDraftToStorage(buttonEl) {
    const draftData = {
      fullName: inputFullName ? inputFullName.value : '',
      jobTitle: inputJobTitle ? inputJobTitle.value : '',
      email: inputEmail ? inputEmail.value : '',
      phone: inputPhone ? inputPhone.value : '',
      education: inputEducation ? inputEducation.value : '',
      bulletPoints: bulletPoints ? bulletPoints.value : '',
      skills: Array.from(document.querySelectorAll('#skillsTagsContainer .tag')).map(t => t.textContent.replace('x', '').trim())
    };

    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
      if (buttonEl) {
        const originalText = buttonEl.innerHTML;
        buttonEl.innerHTML = `<i data-feather="check"></i> <span>Draft Saved!</span>`;
        if (window.feather) feather.replace();
        setTimeout(() => {
          buttonEl.innerHTML = originalText;
          if (window.feather) feather.replace();
        }, 2000);
      }
    } catch (e) {
      console.warn('Could not save draft to LocalStorage:', e);
    }
  }

  // Load Draft from LocalStorage on startup
  function loadDraftFromStorage() {
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
        syncLivePreview();
        syncLiveSkills();
      }
    } catch (e) {
      console.warn('Could not read draft from LocalStorage:', e);
    }
  }

  if (btnSaveDraft) btnSaveDraft.addEventListener('click', () => saveDraftToStorage(btnSaveDraft));
  if (btnDraftSaveFooter) btnDraftSaveFooter.addEventListener('click', () => saveDraftToStorage(btnDraftSaveFooter));

  // Step Navigation Logic (Step 1 -> Step 2 -> Step 3)
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

  // Next Step / Generate Resume Action
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

        // Highlight preview card
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

  // Print PDF Button Handler
  if (btnPrintPdf) {
    btnPrintPdf.addEventListener('click', () => {
      window.print();
    });
  }

  // Initialize live preview & draft load
  loadDraftFromStorage();
  syncLivePreview();
  syncLiveSkills();
});

