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
     1. Theme Management (Custom UI Themes via body[data-theme])
     ========================================================================== */
  const THEME_STORAGE_KEY = 'resuai-dashboard-theme';
  const themeButtons = document.querySelectorAll('.theme-btn');
  const body = document.body;

  /**
   * Applies the chosen theme ID to the <body> data-theme attribute,
   * updates active states on theme switcher buttons, and saves to localStorage.
   * @param {string} themeId - e.g. 'light-modern', 'dark-obsidian', 'cyber-purple', 'emerald-slate', 'sunset-amber', 'twilight-haze'
   */
  function syncSettingsThemeSwatches() {
    const activeTheme = body.getAttribute('data-theme') || 'twilight-haze';
    const swatches = document.querySelectorAll('.settings-theme-swatch');
    swatches.forEach(swatch => {
      const themeId = swatch.getAttribute('data-theme-swatch');
      if (themeId === activeTheme) {
        swatch.classList.add('active');
      } else {
        swatch.classList.remove('active');
      }
    });
  }

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

    syncSettingsThemeSwatches();
  }

  // Attach click listeners to all theme switcher buttons
  themeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const selectedTheme = btn.getAttribute('data-theme-id');
      setTheme(selectedTheme);
    });
  });

  // Attach click listeners to settings theme swatches
  const settingsThemeSwatches = document.querySelectorAll('.settings-theme-swatch');
  settingsThemeSwatches.forEach(swatch => {
    swatch.addEventListener('click', (e) => {
      e.preventDefault();
      const themeId = swatch.getAttribute('data-theme-swatch');
      setTheme(themeId);
      if (typeof showToast === 'function') {
        showToast(`Workspace theme updated to ${swatch.title}!`, 'success');
      }
    });
  });

  // Restore saved theme on initial page load (default: 'twilight-haze')
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'twilight-haze';
  setTheme(savedTheme);

  /* ==========================================================================
     2. Auth State & Screen View Toggle
     ========================================================================== */
  const AUTH_STORAGE_KEY = 'resuai-logged-in';
  const authContainer = document.getElementById('authContainer');
  const appContainer = document.getElementById('appContainer');

  // Parallax Mouse Motion Engine for Login Ambient Background
  if (authContainer) {
    let ticking = false;
    authContainer.addEventListener('mousemove', (e) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const { clientX, clientY } = e;
          const { innerWidth, innerHeight } = window;
          const mouseX = (clientX / innerWidth - 0.5) * 2;
          const mouseY = (clientY / innerHeight - 0.5) * 2;
          authContainer.style.setProperty('--mouse-x', mouseX.toFixed(3));
          authContainer.style.setProperty('--mouse-y', mouseY.toFixed(3));
          ticking = false;
        });
        ticking = true;
      }
    });
  }
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

  const btnAuthPasswordEye = document.getElementById('btnAuthPasswordEye');
  const btnQuickDemoLogin = document.getElementById('btnQuickDemoLogin');
  const authPasswordInput = document.getElementById('authPassword');
  const authEmailInput = document.getElementById('authEmail');

  // Password visibility eye toggle
  if (btnAuthPasswordEye && authPasswordInput) {
    btnAuthPasswordEye.addEventListener('click', (e) => {
      e.preventDefault();
      const isPass = authPasswordInput.type === 'password';
      authPasswordInput.type = isPass ? 'text' : 'password';
      btnAuthPasswordEye.innerHTML = `<i data-feather="${isPass ? 'eye-off' : 'eye'}"></i>`;
      if (window.feather) feather.replace();
    });
  }

  // Real-time Password Security Strength Meter
  if (authPasswordInput) {
    authPasswordInput.addEventListener('input', () => {
      const val = authPasswordInput.value;
      const fill = document.getElementById('authStrengthFill');
      const text = document.getElementById('authStrengthText');
      const scoreEl = document.getElementById('authStrengthScore');
      if (!fill || !text || !scoreEl) return;

      if (!val) {
        fill.style.width = '0%';
        fill.className = 'strength-bar-fill';
        text.textContent = 'Security Strength';
        scoreEl.textContent = '0/4';
        return;
      }

      let score = 0;
      if (val.length >= 8) score++;
      if (/[A-Z]/.test(val)) score++;
      if (/[0-9]/.test(val)) score++;
      if (/[^A-Za-z0-9]/.test(val)) score++;

      scoreEl.textContent = `${score}/4`;

      if (score <= 1) {
        fill.className = 'strength-bar-fill weak';
        text.textContent = 'Weak Security';
      } else if (score <= 3) {
        fill.className = 'strength-bar-fill medium';
        text.textContent = 'Good Security';
      } else {
        fill.className = 'strength-bar-fill strong';
        text.textContent = '🔒 Excellent Strength';
      }
    });
  }

  // 1-Click Quick Demo Sign In
  if (btnQuickDemoLogin) {
    btnQuickDemoLogin.addEventListener('click', () => {
      if (authEmailInput) authEmailInput.value = 'developer@resuai.dev';
      if (authPasswordInput) authPasswordInput.value = 'password123';
      
      const origText = btnQuickDemoLogin.innerHTML;
      btnQuickDemoLogin.innerHTML = `<i data-feather="loader"></i> <span>Authenticating Workspace...</span>`;
      if (window.feather) feather.replace();

      setTimeout(() => {
        try {
          localStorage.setItem(AUTH_STORAGE_KEY, 'true');
        } catch (err) {}
        updateAuthStateView();
        btnQuickDemoLogin.innerHTML = origText;
        if (window.feather) feather.replace();
      }, 600);
    });
  }

  // Form Submission handler
  if (authForm) {
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = authEmailInput ? authEmailInput.value : '';
      const password = authPasswordInput ? authPasswordInput.value : '';
      const authNameInput = document.getElementById('authName');

      if (!email || !password) {
        alert('Please enter your email address and password.');
        return;
      }

      if (authNameInput && authNameInput.value.trim() && inputFullName) {
        inputFullName.value = authNameInput.value.trim();
      }

      localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      updateAuthStateView();
      syncLivePreview();
    });
  }

  // SSO Action handlers
  if (ssoGithubBtn) {
    ssoGithubBtn.addEventListener('click', () => {
      localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      updateAuthStateView();
      syncLivePreview();
    });
  }

  if (ssoGoogleBtn) {
    ssoGoogleBtn.addEventListener('click', () => {
      localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      updateAuthStateView();
      syncLivePreview();
    });
  }

  // Sign out handlers
  function handleSignOut(e) {
    e.preventDefault();
    localStorage.setItem(AUTH_STORAGE_KEY, 'false');
    
    // Clear session details & saved tab so next login starts clean
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      localStorage.removeItem(ANALYTICS_HISTORY_KEY);
      localStorage.removeItem('resuai-active-tab');
    } catch(err) {}

    // Reset form inputs to blank so next login starts clean
    if (inputFullName) inputFullName.value = '';
    if (inputJobTitle) inputJobTitle.value = '';
    if (inputEmail) inputEmail.value = '';
    if (inputPhone) inputPhone.value = '';
    if (inputLocation) inputLocation.value = '';
    if (inputGithub) inputGithub.value = '';
    if (inputLinkedin) inputLinkedin.value = '';
    if (inputPortfolio) inputPortfolio.value = '';
    if (inputSummary) inputSummary.value = '';
    if (inputCertifications) inputCertifications.value = '';
    if (bulletPoints) bulletPoints.value = '';

    // Clear skill tags
    if (tagsContainer) {
      const tags = tagsContainer.querySelectorAll('.tag');
      tags.forEach(t => t.remove());
    }

    updateAuthStateView();
    syncLivePreview();
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

    // SEO Dynamic Document Title & Meta Description Update
    document.title = `${meta.title} // ResuAI Studio`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', `${meta.description} Powered by Google Gemini 2.5 Flash AI.`);

    // Hide New Resume button on ATS Analyzer & non-builder tabs
    const btnNewResume = document.getElementById('btnNewResume');
    if (btnNewResume) {
      btnNewResume.style.display = (tabId === 'resume-builder') ? 'inline-flex' : 'none';
    }

    // Persist active tab to LocalStorage for seamless reload restoration
    try {
      localStorage.setItem('resuai-active-tab', tabId);
    } catch (e) {}

    // Close mobile drawer if active
    closeMobileSidebar();
  }

  function restoreSavedTab() {
    try {
      const savedTab = localStorage.getItem('resuai-active-tab');
      if (savedTab && TAB_METADATA[savedTab]) {
        switchTab(savedTab);
      }
    } catch (e) {}
  }

  // Attach click event handlers to all sidebar navigation links
  navItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = item.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // Restore saved active tab on page load
  restoreSavedTab();

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
  const inputLocation = document.getElementById('inputLocation');
  const inputGithub = document.getElementById('inputGithub');
  const inputLinkedin = document.getElementById('inputLinkedin');
  const inputPortfolio = document.getElementById('inputPortfolio');
  const inputSummary = document.getElementById('inputSummary');
  const inputEducation = document.getElementById('inputEducation');
  const inputCertifications = document.getElementById('inputCertifications');
  const bulletPoints = document.getElementById('bulletPoints');
  const charCounter = document.getElementById('charCounter');
  const atsJdInput = document.getElementById('atsJdInput');

  const previewName = document.getElementById('previewName');
  const previewRole = document.getElementById('previewRole');
  const previewMeta = document.getElementById('previewMeta');
  const previewSummary = document.getElementById('previewSummary');
  const previewSummarySection = document.getElementById('previewSummarySection');
  const previewEducation = document.getElementById('previewEducation');
  const previewSkills = document.getElementById('previewSkills');
  const previewBullets = document.getElementById('previewBullets');
  const previewCertifications = document.getElementById('previewCertifications');
  const previewCertificationsSection = document.getElementById('previewCertificationsSection');

  const strengthPercentVal = document.getElementById('strengthPercentVal');
  const strengthProgressFill = document.getElementById('strengthProgressFill');
  const strengthTip = document.getElementById('strengthTip');
  const verbChipsContainer = document.getElementById('verbChipsContainer');

  const topUserAvatar = document.getElementById('topUserAvatar');
  const topUserName   = document.getElementById('topUserName');
  const topUserRole   = document.getElementById('topUserRole');

  function updateTopUserProfile() {
    const fullName = (inputFullName && inputFullName.value.trim()) ? inputFullName.value.trim() : 'Guest Developer';
    const jobTitle = (inputJobTitle && inputJobTitle.value.trim()) ? inputJobTitle.value.trim() : 'Software Engineer';

    const parts = fullName.split(/\s+/).filter(Boolean);
    let initials = 'GD';
    if (parts.length >= 2) {
      initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    } else if (parts.length === 1) {
      initials = parts[0].substring(0, 2).toUpperCase();
    }

    if (topUserAvatar) topUserAvatar.textContent = initials;
    if (topUserName)   topUserName.textContent = fullName;
    if (topUserRole)   topUserRole.textContent = jobTitle;
  }

  const ANALYTICS_HISTORY_KEY = 'resuai-analytics-history';

  // Floating Chart Tooltip Binder helper
  function bindChartDotEvents() {
    const dots = document.querySelectorAll('.chart-dot');
    const tooltip = document.getElementById('chartTooltip');

    if (dots && tooltip) {
      dots.forEach(dot => {
        // Remove existing to avoid double-binding if called multiple times
        const newDot = dot.cloneNode(true);
        dot.parentNode.replaceChild(newDot, dot);

        newDot.addEventListener('mouseenter', () => {
          const val = newDot.getAttribute('data-val');
          tooltip.textContent = `ATS Score: ${val}`;
          tooltip.style.display = 'block';
          
          const dotRect = newDot.getBoundingClientRect();
          const wrapper = newDot.closest('.chart-container-wrapper');
          if (wrapper) {
            const wrapperRect = wrapper.getBoundingClientRect();
            const x = dotRect.left - wrapperRect.left + (dotRect.width / 2);
            const y = dotRect.top - wrapperRect.top;
            
            tooltip.style.left = `${x}px`;
            tooltip.style.top = `${y}px`;
          }
          
          document.querySelectorAll('.chart-dot').forEach(d => d.classList.remove('active'));
          newDot.classList.add('active');
        });

        newDot.addEventListener('mouseleave', () => {
          tooltip.style.display = 'none';
        });
      });
    }
  }

  // Live Analytics Dashboard Sync
  function updateAnalyticsDashboard() {
    let history = [65, 72, 80, 85, 88, 94];
    try {
      const saved = localStorage.getItem(ANALYTICS_HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          const scores = parsed.map(item => item.score);
          if (scores.length < 6) {
            history = [65, 72, 80, 85, 88, 94].slice(0, 6 - scores.length).concat(scores);
          } else {
            history = scores.slice(-6);
          }
        }
      }
    } catch(e) {}

    const highestScore = Math.max(...history);
    let totalScansCount = 12;
    try {
      const saved = localStorage.getItem(ANALYTICS_HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        totalScansCount = Math.max(12, 12 + parsed.length);
      }
    } catch(e) {}

    const analyticsHighestScore = document.getElementById('analyticsHighestScore');
    const analyticsTotalScans = document.getElementById('analyticsTotalScans');
    const analyticsGapsResolved = document.getElementById('analyticsGapsResolved');
    const analyticsTrustRating = document.getElementById('analyticsTrustRating');

    if (analyticsHighestScore) analyticsHighestScore.textContent = `${highestScore}%`;
    if (analyticsTotalScans) analyticsTotalScans.textContent = `${totalScansCount} Scans`;

    const gapsResolvedPercent = Math.min(100, Math.round(highestScore * 0.95));
    if (analyticsGapsResolved) analyticsGapsResolved.textContent = `${gapsResolvedPercent}%`;

    let trustScore = 60;
    if (inputFullName && inputFullName.value.trim()) trustScore += 10;
    if (inputGithub && inputGithub.value.trim()) trustScore += 10;
    if (inputLinkedin && inputLinkedin.value.trim()) trustScore += 10;
    if (inputPortfolio && inputPortfolio.value.trim()) trustScore += 10;
    trustScore = Math.min(100, trustScore);
    if (analyticsTrustRating) analyticsTrustRating.textContent = `${trustScore}/100`;

    const svgChart = document.getElementById('analyticsSvgChart');
    if (svgChart) {
      const xCoords = [40, 128, 216, 304, 392, 480];
      const yCoords = history.map(score => Math.round(180 - (score / 100) * 160));

      let dPath = `M ${xCoords[0]} ${yCoords[0]}`;
      for (let i = 1; i < xCoords.length; i++) {
        dPath += ` L ${xCoords[i]} ${yCoords[i]}`;
      }

      const pathEl = svgChart.querySelector('.chart-line-path');
      if (pathEl) pathEl.setAttribute('d', dPath);

      const dotsGroup = svgChart.querySelector('.chart-dot-group');
      if (dotsGroup) {
        dotsGroup.innerHTML = history.map((score, index) => {
          const isActive = index === history.length - 1;
          return `<circle cx="${xCoords[index]}" cy="${yCoords[index]}" r="5" class="chart-dot ${isActive ? 'active' : ''}" data-val="${score}%"></circle>`;
        }).join('');
      }

      bindChartDotEvents();
    }

    const latestScore = history[history.length - 1];
    const fillBars = document.querySelectorAll('.comp-progress-fill');
    const compVals = document.querySelectorAll('.comp-val');

    const weights = [1.0, 0.92, 0.86, 0.70];
    fillBars.forEach((bar, index) => {
      const w = weights[index] || 0.8;
      const targetVal = Math.min(100, Math.round(latestScore * w));
      bar.style.width = `${targetVal}%`;
      if (compVals[index]) {
        compVals[index].textContent = `${targetVal}% Match`;
      }
    });
  }

  // Records new scan result & triggers update
  function recordNewScanResult(score) {
    const numericScore = parseInt(score) || 85;
    let history = [];
    try {
      const saved = localStorage.getItem(ANALYTICS_HISTORY_KEY);
      if (saved) {
        history = JSON.parse(saved);
      }
    } catch(e) {}

    history.push({
      timestamp: new Date().toISOString(),
      score: numericScore
    });

    if (history.length > 10) history = history.slice(-10);

    try {
      localStorage.setItem(ANALYTICS_HISTORY_KEY, JSON.stringify(history));
    } catch(e) {}

    updateAnalyticsDashboard();
  }

  /**
   * Safely extracts skill tag text content without stripping 'x' characters from skill names.
   * Uses first child text node directly to ignore delete icon markup.
   */
  function getSkillTagName(tagEl) {
    if (!tagEl) return '';
    return (tagEl.childNodes[0]?.textContent || tagEl.textContent || '').trim();
  }

  const btnDraftSaveFooter = document.getElementById('btnDraftSaveFooter');
  const btnNextStep = document.getElementById('btnNextStep');
  const btnPrintPdf = document.getElementById('btnPrintPdf');
  const btnAutoOptimize = document.getElementById('btnAutoOptimize');
  const stepItems = document.querySelectorAll('.step-item');

  // AI Auto-Optimize Button Action
  if (btnAutoOptimize) {
    btnAutoOptimize.addEventListener('click', async (e) => {
      e.preventDefault();
      const origText = btnAutoOptimize.innerHTML;
      btnAutoOptimize.innerHTML = `<i data-feather="loader"></i> <span>AI Optimizing...</span>`;
      btnAutoOptimize.disabled = true;
      if (window.feather) feather.replace();

      const jobTitle = inputJobTitle ? inputJobTitle.value : '';
      const expText = bulletPoints ? bulletPoints.value : '';
      const skills = Array.from(document.querySelectorAll('#skillsTagsContainer .tag')).map(t => getSkillTagName(t)).filter(Boolean);

      try {
        const response = await fetch('/api/optimize-resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobTitle, experienceText: expText, skills })
        });
        const data = await response.json();
        
        if (data && data.optimizedBulletPoints && bulletPoints) {
          bulletPoints.value = data.optimizedBulletPoints;
          syncLivePreview();
          autoSaveFormFields();
        }

        btnAutoOptimize.innerHTML = `<i data-feather="check"></i> <span>Optimized with AI!</span>`;
        btnAutoOptimize.disabled = false;
        if (window.feather) feather.replace();

        setTimeout(() => {
          btnAutoOptimize.innerHTML = origText;
          if (window.feather) feather.replace();
        }, 2500);
      } catch (err) {
        console.warn("Auto-Optimize API call error:", err);
        btnAutoOptimize.innerHTML = origText;
        btnAutoOptimize.disabled = false;
        if (window.feather) feather.replace();
      }
    });
  }

  /**
   * Saves all current form fields and skill tags to localStorage automatically.
   */
  function autoSaveFormFields() {
    const draftData = {
      fullName: inputFullName ? inputFullName.value : '',
      jobTitle: inputJobTitle ? inputJobTitle.value : '',
      email: inputEmail ? inputEmail.value : '',
      phone: inputPhone ? inputPhone.value : '',
      location: inputLocation ? inputLocation.value : '',
      github: inputGithub ? inputGithub.value : '',
      linkedin: inputLinkedin ? inputLinkedin.value : '',
      portfolio: inputPortfolio ? inputPortfolio.value : '',
      summary: inputSummary ? inputSummary.value : '',
      education: inputEducation ? inputEducation.value : '',
      certifications: inputCertifications ? inputCertifications.value : '',
      bulletPoints: bulletPoints ? bulletPoints.value : '',
      atsJdText: atsJdInput ? atsJdInput.value : '',
      skills: Array.from(document.querySelectorAll('#skillsTagsContainer .tag')).map(t => getSkillTagName(t)).filter(Boolean)
    };

    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
    } catch (e) {
      console.warn('Could not auto-save form fields to LocalStorage:', e);
    }
  }

  /**
   * Restores form fields from localStorage on startup (ignoring legacy sample defaults).
   */
  function loadSavedFormFields() {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        const LEGACY_DEFAULTS = [
          'github.com/kuntalmanii',
          'linkedin.com/in/manishkuntal',
          'manishkuntal.dev',
          'manish@resuai.dev',
          '+1 (415) 890-2341',
          'San Francisco, CA (US Citizen · Open to Remote)',
          'Senior UI/UX Engineer & Systems Architect'
        ];

        const isClean = (val) => val && !LEGACY_DEFAULTS.includes(val.trim());

        if (isClean(draft.fullName) && inputFullName) inputFullName.value = draft.fullName;
        if (isClean(draft.jobTitle) && inputJobTitle) inputJobTitle.value = draft.jobTitle;
        if (isClean(draft.email) && inputEmail) inputEmail.value = draft.email;
        if (isClean(draft.phone) && inputPhone) inputPhone.value = draft.phone;
        if (isClean(draft.location) && inputLocation) inputLocation.value = draft.location;
        if (isClean(draft.github) && inputGithub) inputGithub.value = draft.github;
        if (isClean(draft.linkedin) && inputLinkedin) inputLinkedin.value = draft.linkedin;
        if (isClean(draft.portfolio) && inputPortfolio) inputPortfolio.value = draft.portfolio;
        if (isClean(draft.summary) && inputSummary) inputSummary.value = draft.summary;
        if (isClean(draft.education) && inputEducation) inputEducation.value = draft.education;
        if (isClean(draft.certifications) && inputCertifications) inputCertifications.value = draft.certifications;
        if (isClean(draft.bulletPoints) && bulletPoints) bulletPoints.value = draft.bulletPoints;
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
    const skillList = Array.from(tagElements).map(tag => getSkillTagName(tag)).filter(Boolean);
    previewSkills.textContent = skillList.join(', ');
  }

  // Live Profile Strength Calculator Engine
  function calculateProfileStrength() {
    let score = 0;
    const missing = [];

    if (inputFullName && inputFullName.value.trim()) score += 10; else missing.push('Full Name');
    if (inputJobTitle && inputJobTitle.value.trim()) score += 10; else missing.push('Target Job Title');
    if (inputEmail && inputEmail.value.trim()) score += 10; else missing.push('Email');
    if (inputPhone && inputPhone.value.trim()) score += 5; else missing.push('Phone');
    if (inputLocation && inputLocation.value.trim()) score += 10; else missing.push('Location');
    if (inputGithub && inputGithub.value.trim()) score += 10; else missing.push('GitHub Link');
    if (inputLinkedin && inputLinkedin.value.trim()) score += 10; else missing.push('LinkedIn Link');
    if (inputPortfolio && inputPortfolio.value.trim()) score += 5; else missing.push('Portfolio Link');
    if (inputSummary && inputSummary.value.trim()) score += 10; else missing.push('Executive Summary');
    if (inputEducation && inputEducation.value.trim()) score += 10; else missing.push('Education');
    if (bulletPoints && bulletPoints.value.trim()) score += 10; else missing.push('Work Experience Bullets');

    const progressFill = document.getElementById('strengthProgressFill');
    const scoreVal = document.getElementById('strengthScoreVal');
    const tip = document.getElementById('strengthTip');

    if (progressFill) progressFill.style.width = `${score}%`;
    if (scoreVal) scoreVal.textContent = `${score}%`;
    if (tip) {
      if (missing.length === 0) {
        tip.textContent = '🎉 Exceptional profile strength! Ready to export PDF or run ATS diagnostics.';
      } else {
        tip.textContent = `Tip: Complete missing fields (${missing.slice(0, 2).join(', ')}) to increase recruiter response.`;
      }
    }
  }

  // Action-Verb Chip Click Handler
  if (verbChipsContainer && bulletPoints) {
    verbChipsContainer.addEventListener('click', (e) => {
      const chip = e.target.closest('.verb-chip');
      if (!chip) return;
      const verb = chip.dataset.verb || (chip.textContent + ' ');
      
      const currentVal = bulletPoints.value;
      if (currentVal && !currentVal.endsWith('\n') && !currentVal.endsWith(' ')) {
        bulletPoints.value += '\n• ' + verb;
      } else {
        bulletPoints.value += (currentVal ? '' : '• ') + verb;
      }
      
      bulletPoints.focus();
      syncLivePreview();
      autoSaveFormFields();
    });
  }

  function syncLivePreview() {
    if (inputFullName && previewName) {
      previewName.textContent = inputFullName.value.trim().toUpperCase() || 'YOUR NAME';
    }
    if (inputJobTitle && previewRole) {
      previewRole.textContent = inputJobTitle.value.trim().toUpperCase() || '';
    }
    if (previewMeta) {
      const chips = [];
      const loc  = inputLocation ? inputLocation.value.trim() : '';
      const em   = inputEmail ? inputEmail.value.trim() : '';
      const ph   = inputPhone ? inputPhone.value.trim() : '';
      const gh   = inputGithub ? inputGithub.value.trim() : '';
      const li   = inputLinkedin ? inputLinkedin.value.trim() : '';
      const port = inputPortfolio ? inputPortfolio.value.trim() : '';

      if (loc)  chips.push(`<span class="contact-chip"><i data-feather="map-pin"></i>${loc}</span>`);
      if (em)   chips.push(`<span class="contact-chip"><i data-feather="mail"></i>${em}</span>`);
      if (ph)   chips.push(`<span class="contact-chip"><i data-feather="phone"></i>${ph}</span>`);
      if (gh)   chips.push(`<span class="contact-chip"><i data-feather="github"></i>${gh}</span>`);
      if (li)   chips.push(`<span class="contact-chip"><i data-feather="linkedin"></i>${li}</span>`);
      if (port) chips.push(`<span class="contact-chip"><i data-feather="globe"></i>${port}</span>`);

      previewMeta.innerHTML = chips.join('<span class="contact-divider">·</span>');
      if (window.feather) feather.replace();
    }

    if (inputSummary && previewSummary && previewSummarySection) {
      const val = inputSummary.value.trim();
      if (val) {
        previewSummary.textContent = val;
        previewSummarySection.style.display = 'block';
      } else {
        previewSummarySection.style.display = 'none';
      }
    }

    if (inputEducation && previewEducation) {
      const val = inputEducation.value.trim();
      previewEducation.innerHTML = val ? formatEducationHTML(val) : '';
    }

    if (inputCertifications && previewCertifications && previewCertificationsSection) {
      const val = inputCertifications.value.trim();
      if (val) {
        previewCertifications.textContent = val;
        previewCertificationsSection.style.display = 'block';
      } else {
        previewCertificationsSection.style.display = 'none';
      }
    }

    if (bulletPoints && previewBullets) {
      const lines = bulletPoints.value.split('\n').filter(line => line.trim() !== '');
      if (lines.length > 0) {
        previewBullets.innerHTML = lines.map(line => `<li>${line.trim().replace(/^[-•*]\s*/, '')}</li>`).join('');
      } else {
        previewBullets.innerHTML = '';
      }
    }
    updateCharCounter();
    calculateProfileStrength();
    updateTopUserProfile();
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
  const skillPillsContainer = document.getElementById('skillPillsContainer');
  const skillCategoryFilters = document.getElementById('skillCategoryFilters');
  const btnSuggestAiSkills = document.getElementById('btnSuggestAiSkills');
  const skillAutocompleteDropdown = document.getElementById('skillAutocompleteDropdown');

  /* ==========================================================================
     7. Core Skills Suggestions Database & Engine
     ========================================================================== */
  const SKILL_DATABASE = [
    // Popular / Trending
    { name: 'TypeScript', category: 'frontend', popular: true },
    { name: 'React / Next.js', category: 'frontend', popular: true },
    { name: 'Node.js', category: 'backend', popular: true },
    { name: 'Python', category: 'backend', popular: true },
    { name: 'Docker', category: 'devops', popular: true },
    { name: 'AWS Cloud', category: 'devops', popular: true },
    { name: 'GraphQL', category: 'frontend', popular: true },
    { name: 'Tailwind CSS', category: 'frontend', popular: true },
    { name: 'PostgreSQL', category: 'backend', popular: true },
    { name: 'RESTful APIs', category: 'backend', popular: true },
    { name: 'Git & Version Control', category: 'devops', popular: true },
    { name: 'Gemini / OpenAI API', category: 'ai', popular: true },
    { name: 'Microservices Architecture', category: 'backend', popular: true },
    { name: 'Jest / Testing Library', category: 'frontend', popular: true },

    // Frontend
    { name: 'JavaScript (ES6+)', category: 'frontend' },
    { name: 'Vue.js / Nuxt', category: 'frontend' },
    { name: 'Angular', category: 'frontend' },
    { name: 'Redux Toolkit', category: 'frontend' },
    { name: 'HTML5 & Semantic Web', category: 'frontend' },
    { name: 'Webpack / Vite', category: 'frontend' },
    { name: 'Responsive Web Design', category: 'frontend' },
    { name: 'Web Vitals & Performance', category: 'frontend' },
    { name: 'WebSockets & Realtime', category: 'frontend' },

    // Backend
    { name: 'Express.js', category: 'backend' },
    { name: 'Django / FastAPI', category: 'backend' },
    { name: 'Java / Spring Boot', category: 'backend' },
    { name: 'Go (Golang)', category: 'backend' },
    { name: 'C# / .NET Core', category: 'backend' },
    { name: 'MongoDB', category: 'backend' },
    { name: 'Redis Caching', category: 'backend' },
    { name: 'SQL & Database Design', category: 'backend' },
    { name: 'Prisma ORM', category: 'backend' },
    { name: 'gRPC & Protocol Buffers', category: 'backend' },

    // DevOps & Cloud
    { name: 'Kubernetes (K8s)', category: 'devops' },
    { name: 'CI/CD Pipelines (GitHub Actions)', category: 'devops' },
    { name: 'Terraform & IaC', category: 'devops' },
    { name: 'Google Cloud Platform (GCP)', category: 'devops' },
    { name: 'Microsoft Azure', category: 'devops' },
    { name: 'Nginx & Load Balancing', category: 'devops' },
    { name: 'Linux System Admin', category: 'devops' },
    { name: 'Datadog & APM Monitoring', category: 'devops' },

    // AI & Data
    { name: 'PyTorch / TensorFlow', category: 'ai' },
    { name: 'LLM Prompt Engineering', category: 'ai' },
    { name: 'RAG Systems (LangChain / LlamaIndex)', category: 'ai' },
    { name: 'Vector Databases (Pinecone / Milvus)', category: 'ai' },
    { name: 'Data Engineering & ETL', category: 'ai' },
    { name: 'Pandas & NumPy', category: 'ai' },
    { name: 'Machine Learning Pipelines', category: 'ai' }
  ];

  // Helper to add skill tag dynamically
  function addSkillTag(skillName) {
    if (!tagsContainer || !skillName) return;
    const cleanName = skillName.trim();
    if (!cleanName) return;

    const existing = Array.from(tagsContainer.querySelectorAll('.tag'))
      .map(t => getSkillTagName(t).toLowerCase());
    
    if (existing.includes(cleanName.toLowerCase())) return;

    const newTag = document.createElement('span');
    newTag.className = 'tag';
    newTag.innerHTML = `${cleanName} <i data-feather="x"></i>`;
    if (skillInputField) {
      tagsContainer.insertBefore(newTag, skillInputField);
    } else {
      tagsContainer.appendChild(newTag);
    }

    if (window.feather) feather.replace();
    syncLiveSkills();
    autoSaveFormFields();
    updateSkillPillStates();
  }

  // Update highlighted state for skill pills
  function updateSkillPillStates() {
    if (!tagsContainer || !skillPillsContainer) return;
    const currentSkills = Array.from(tagsContainer.querySelectorAll('.tag'))
      .map(t => getSkillTagName(t).toLowerCase());

    const pills = skillPillsContainer.querySelectorAll('.skill-pill');
    pills.forEach(pill => {
      const pName = pill.dataset.skill.toLowerCase();
      if (currentSkills.includes(pName)) {
        pill.classList.add('added');
      } else {
        pill.classList.remove('added');
      }
    });
  }

  // Render skill pills for active category filter
  function renderSkillPills(category = 'popular') {
    if (!skillPillsContainer) return;
    skillPillsContainer.innerHTML = '';

    let filtered = [];
    if (category === 'popular') {
      filtered = SKILL_DATABASE.filter(s => s.popular);
    } else {
      filtered = SKILL_DATABASE.filter(s => s.category === category);
    }

    filtered.forEach(item => {
      const pill = document.createElement('span');
      pill.className = 'skill-pill';
      pill.dataset.skill = item.name;
      pill.textContent = item.name;
      pill.addEventListener('click', () => {
        addSkillTag(item.name);
      });
      skillPillsContainer.appendChild(pill);
    });

    updateSkillPillStates();
  }

  if (tagsContainer) {
    tagsContainer.addEventListener('click', (e) => {
      const closeSvg = e.target.closest('svg');
      if (closeSvg && closeSvg.parentElement.classList.contains('tag')) {
        closeSvg.parentElement.remove();
        syncLiveSkills();
        autoSaveFormFields();
        updateSkillPillStates();
      }
    });
  }

  if (skillInputField) {
    skillInputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && skillInputField.value.trim() !== '') {
        e.preventDefault();
        addSkillTag(skillInputField.value);
        skillInputField.value = '';
        if (skillAutocompleteDropdown) skillAutocompleteDropdown.style.display = 'none';
      }
    });
  }

  // Initialize Category Filters & Pills
  if (skillCategoryFilters) {
    renderSkillPills('popular');

    skillCategoryFilters.addEventListener('click', (e) => {
      const chip = e.target.closest('.category-chip');
      if (!chip) return;
      skillCategoryFilters.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderSkillPills(chip.dataset.category);
    });
  }

  // Suggest AI Skills button click handler
  if (btnSuggestAiSkills) {
    btnSuggestAiSkills.addEventListener('click', () => {
      const role = inputJobTitle ? inputJobTitle.value.trim().toLowerCase() : '';
      let recommended = [];

      if (role.includes('front') || role.includes('ui') || role.includes('ux') || role.includes('web')) {
        recommended = ['TypeScript', 'React / Next.js', 'Tailwind CSS', 'GraphQL', 'Web Vitals & Performance', 'Jest / Testing Library'];
      } else if (role.includes('back') || role.includes('api') || role.includes('system') || role.includes('data')) {
        recommended = ['Node.js', 'Python', 'PostgreSQL', 'Microservices Architecture', 'Docker', 'Redis Caching'];
      } else if (role.includes('devops') || role.includes('cloud') || role.includes('infra') || role.includes('site')) {
        recommended = ['Docker', 'Kubernetes (K8s)', 'AWS Cloud', 'CI/CD Pipelines (GitHub Actions)', 'Terraform & IaC', 'Linux System Admin'];
      } else if (role.includes('ai') || role.includes('ml') || role.includes('learning') || role.includes('intelligence')) {
        recommended = ['Python', 'Gemini / OpenAI API', 'PyTorch / TensorFlow', 'RAG Systems (LangChain / LlamaIndex)', 'Vector Databases (Pinecone / Milvus)'];
      } else {
        recommended = ['TypeScript', 'React / Next.js', 'Node.js', 'Docker', 'PostgreSQL', 'RESTful APIs'];
      }

      recommended.forEach(sk => addSkillTag(sk));

      const origHTML = btnSuggestAiSkills.innerHTML;
      btnSuggestAiSkills.innerHTML = `<i data-feather="check"></i> <span>Added ${recommended.length} Skills!</span>`;
      if (window.feather) feather.replace();
      setTimeout(() => {
        btnSuggestAiSkills.innerHTML = origHTML;
        if (window.feather) feather.replace();
      }, 2000);
    });
  }

  // Autocomplete as user types in #skillInputField
  if (skillInputField && skillAutocompleteDropdown) {
    skillInputField.addEventListener('input', () => {
      const val = skillInputField.value.trim().toLowerCase();
      if (!val) {
        skillAutocompleteDropdown.style.display = 'none';
        return;
      }

      const matches = SKILL_DATABASE.filter(s => s.name.toLowerCase().includes(val)).slice(0, 6);
      if (matches.length === 0) {
        skillAutocompleteDropdown.style.display = 'none';
        return;
      }

      skillAutocompleteDropdown.innerHTML = matches.map(m => `
        <div class="autocomplete-item" data-name="${m.name}">
          <span>${m.name}</span>
          <span class="autocomplete-category">${m.category}</span>
        </div>
      `).join('');

      skillAutocompleteDropdown.style.display = 'block';
    });

    skillAutocompleteDropdown.addEventListener('click', (e) => {
      const item = e.target.closest('.autocomplete-item');
      if (!item) return;
      addSkillTag(item.dataset.name);
      skillInputField.value = '';
      skillAutocompleteDropdown.style.display = 'none';
    });

    document.addEventListener('click', (e) => {
      if (tagsContainer && !tagsContainer.contains(e.target)) {
        skillAutocompleteDropdown.style.display = 'none';
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
    btnNextStep.addEventListener('click', async () => {
      const origHTML = btnNextStep.innerHTML;

      // Step 2: AI Generating state
      setStep(2);
      btnNextStep.innerHTML = `<i data-feather="loader"></i> <span>Generating with AI...</span>`;
      btnNextStep.disabled = true;
      if (window.feather) feather.replace();

      const jobTitle = inputJobTitle ? inputJobTitle.value.trim() : '';
      const expText = bulletPoints ? bulletPoints.value.trim() : '';
      const skills = Array.from(document.querySelectorAll('#skillsTagsContainer .tag'))
        .map(t => getSkillTagName(t))
        .filter(Boolean);

      try {
        const response = await fetch('/api/optimize-resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobTitle, experienceText: expText, skills })
        });

        const data = await response.json();

        // Step 3: Apply optimized content and show preview
        if (data && data.optimizedBulletPoints && bulletPoints) {
          bulletPoints.value = data.optimizedBulletPoints;
          syncLivePreview();
          autoSaveFormFields();
        }

        setStep(3);
        btnNextStep.innerHTML = `<i data-feather="check-circle"></i> <span>Resume Generated!</span>`;
        btnNextStep.disabled = false;
        if (window.feather) feather.replace();

        // Scroll to live preview card
        const previewCard = document.getElementById('previewCardSection');
        if (previewCard) {
          previewCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Reset button after 3 seconds
        setTimeout(() => {
          btnNextStep.innerHTML = origHTML;
          btnNextStep.disabled = false;
          if (window.feather) feather.replace();
        }, 3000);

      } catch (err) {
        console.warn("Generate Resume API error, using local preview:", err);

        // Fallback: just advance to step 3 and show preview as-is
        setStep(3);
        btnNextStep.innerHTML = `<i data-feather="check-circle"></i> <span>Resume Ready!</span>`;
        btnNextStep.disabled = false;
        if (window.feather) feather.replace();

        const previewCard = document.getElementById('previewCardSection');
        if (previewCard) previewCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

        setTimeout(() => {
          btnNextStep.innerHTML = origHTML;
          if (window.feather) feather.replace();
        }, 3000);
      }
    });
  }

  /* ==========================================================================
     8. Dynamic PDF Export & Typography Settings Engine
     ========================================================================== */
  function getPdfExportStyles() {
    let paperSize = 'letter';
    let typography = 'inter-jakarta';

    try {
      const saved = localStorage.getItem('resuai-platform-settings');
      if (saved) {
        const s = JSON.parse(saved);
        if (s.paperSize) paperSize = s.paperSize;
        if (s.typography) typography = s.typography;
      }
    } catch(e) {}

    const pageSizeCss = (paperSize === 'a4') 
      ? '@page { size: A4 portrait; margin: 12mm; }' 
      : '@page { size: letter portrait; margin: 0.5in; }';

    let fontLink = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap";
    let bodyFont = "'Inter', Arial, sans-serif";
    let headingFont = "'Plus Jakarta Sans', Arial, sans-serif";

    if (typography === 'roboto-sans') {
      fontLink = "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&family=Roboto:wght@400;500;700;900&display=swap";
      bodyFont = "'Open Sans', Roboto, sans-serif";
      headingFont = "'Roboto', sans-serif";
    } else if (typography === 'georgia-serif') {
      fontLink = "https://fonts.googleapis.com/css2?family=EB+Garamond:wght@500;600;700;800&family=Merriweather:wght@400;700&display=swap";
      bodyFont = "'Merriweather', Georgia, serif";
      headingFont = "'EB Garamond', Georgia, serif";
    }

    return { pageSizeCss, fontLink, bodyFont, headingFont };
  }

  function applyTypographyToLivePreview() {
    const styles = getPdfExportStyles();
    
    // Inject or update Google Fonts stylesheet in <head> for live preview rendering
    const fontLinkEl = document.getElementById('dynamicTypographyLink');
    if (fontLinkEl) fontLinkEl.href = styles.fontLink;

    const docs = document.querySelectorAll('.resume-preview-document');
    docs.forEach(doc => {
      doc.style.fontFamily = styles.bodyFont;
      const headers = doc.querySelectorAll('.doc-name, .section-title');
      headers.forEach(h => h.style.fontFamily = styles.headingFont);
    });
  }

  // Print PDF Trigger — opens isolated print window with dynamic paper size & typography
  if (btnPrintPdf) {
    btnPrintPdf.addEventListener('click', () => {
      const resumeDoc = document.getElementById('printableResumeDoc');
      if (!resumeDoc) { window.print(); return; }

      const printWindow = window.open('', '_blank', 'width=900,height=700');
      if (!printWindow) { window.print(); return; }

      const styles = getPdfExportStyles();
      const resumeHTML = resumeDoc.outerHTML;

      printWindow.document.write(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Resume — ${document.getElementById('previewName')?.textContent || 'Resume'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="${styles.fontLink}" rel="stylesheet" />
  <style>
    ${styles.pageSizeCss}
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      background: #ffffff;
      color: #111111;
      font-family: ${styles.bodyFont};
      font-size: 11pt;
      line-height: 1.5;
      padding: 24pt 28pt;
    }
    .resume-preview-document {
      max-width: 700px;
      margin: 0 auto;
      font-family: ${styles.bodyFont};
    }
    .preview-doc-header {
      border-bottom: 2px solid #111;
      padding-bottom: 10pt;
      margin-bottom: 14pt;
    }
    .doc-name {
      font-family: ${styles.headingFont};
      font-size: 20pt;
      font-weight: 800;
      letter-spacing: 2px;
      color: #000;
    }
    .doc-role {
      font-size: 9.5pt;
      font-weight: 600;
      letter-spacing: 1.5px;
      color: #444;
      margin-top: 2pt;
    }
    .doc-meta {
      font-size: 9pt;
      color: #555;
      margin-top: 4pt;
    }
    .preview-section {
      margin-top: 14pt;
    }
    .section-title {
      font-family: ${styles.headingFont};
      font-size: 8.5pt;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #000;
      border-bottom: 1px solid #ccc;
      padding-bottom: 3pt;
      margin-bottom: 6pt;
    }
    .section-content {
      font-size: 10pt;
      color: #222;
    }
    .exp-header {
      display: flex;
      justify-content: space-between;
      font-size: 10pt;
      font-weight: 600;
      color: #111;
      margin-bottom: 4pt;
    }
    .exp-list {
      padding-left: 14pt;
      font-size: 10pt;
      color: #222;
    }
    .exp-list li {
      margin-bottom: 3pt;
    }
    @media print {
      html, body { padding: 0; }
    }
  </style>
</head>
<body>
  ${resumeHTML}
  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  <\/script>
</body>
</html>`);

      printWindow.document.close();
    });
  }

  // New Resume Version Handler — clears all fields and resets to Step 1
  function triggerNewResumeFlow() {
    const confirmed = window.confirm('Start a new resume? This will clear all current fields.');
    if (!confirmed) return;

    // Clear all text inputs and textarea
    if (inputFullName)   inputFullName.value   = '';
    if (inputJobTitle)   inputJobTitle.value   = '';
    if (inputEmail)      inputEmail.value      = '';
    if (inputPhone)      inputPhone.value      = '';
    if (inputEducation)  inputEducation.value  = '';
    if (bulletPoints)    bulletPoints.value    = '';

    // Reset skill tags to a single default placeholder
    const tagsContainer = document.getElementById('skillsTagsContainer');
    const skillInput    = document.getElementById('skillInputField');
    if (tagsContainer) {
      tagsContainer.querySelectorAll('.tag').forEach(tag => tag.remove());
      if (skillInput && !tagsContainer.contains(skillInput)) {
        tagsContainer.appendChild(skillInput);
      }
    }

    // Reset live preview to blank defaults
    if (previewName)      previewName.textContent      = 'YOUR NAME';
    if (previewRole)      previewRole.textContent      = 'TARGET JOB TITLE';
    if (previewMeta)      previewMeta.textContent      = 'City, Country • email@domain.com • +1 000 000 0000';
    if (previewEducation) previewEducation.textContent = 'Degree, University (Year)';
    if (previewSkills)    previewSkills.textContent    = '';
    if (previewBullets)   previewBullets.innerHTML     = '<li>Your experience bullet points will appear here...</li>';

    // Clear saved draft from localStorage
    try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch(e) {}

    // Reset step progress back to Step 1
    setStep(1);

    // Update character counter
    updateCharCounter();

    // Scroll to the top of the form
    const editorCard = document.querySelector('.editor-card');
    if (editorCard) editorCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (window.feather) feather.replace();
  }

  const btnNewResume = document.getElementById('btnNewResume');
  if (btnNewResume) {
    btnNewResume.addEventListener('click', triggerNewResumeFlow);
  }

  const sidebarNewResumeBtn = document.getElementById('sidebarNewResumeBtn');
  if (sidebarNewResumeBtn) {
    sidebarNewResumeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const rbNavItem = document.querySelector('.nav-item[data-tab="resume-builder"]');
      if (rbNavItem) rbNavItem.click();
      triggerNewResumeFlow();
    });
  }

  /* ==========================================================================
     9. Export JSON / PDF Actions
     ========================================================================== */
  const btnExportJson     = document.getElementById('btnExportJson');
  const btnExportPdf      = document.getElementById('btnExportPdf');

  // Export as JSON
  if (btnExportJson) {
    btnExportJson.addEventListener('click', () => {
      const skills = Array.from(document.querySelectorAll('#skillsTagsContainer .tag'))
        .map(t => getSkillTagName(t)).filter(Boolean);

      const resumeData = {
        meta: { exportedAt: new Date().toISOString(), version: '2.5', tool: 'ResuAI' },
        personalInfo: {
          fullName:       inputFullName       ? inputFullName.value.trim()       : '',
          jobTitle:       inputJobTitle       ? inputJobTitle.value.trim()       : '',
          email:          inputEmail          ? inputEmail.value.trim()          : '',
          phone:          inputPhone          ? inputPhone.value.trim()          : '',
          location:       inputLocation       ? inputLocation.value.trim()       : '',
          github:         inputGithub         ? inputGithub.value.trim()         : '',
          linkedin:       inputLinkedin       ? inputLinkedin.value.trim()       : '',
          portfolio:      inputPortfolio      ? inputPortfolio.value.trim()      : '',
          summary:        inputSummary        ? inputSummary.value.trim()        : '',
          education:      inputEducation      ? inputEducation.value.trim()      : '',
          certifications: inputCertifications ? inputCertifications.value.trim() : '',
        },
        skills,
        experience: bulletPoints ? bulletPoints.value.trim() : '',
        preview: {
          name:           previewName           ? previewName.textContent           : '',
          role:           previewRole           ? previewRole.textContent           : '',
          meta:           previewMeta           ? previewMeta.innerHTML             : '',
          summary:        previewSummary        ? previewSummary.textContent        : '',
          education:      previewEducation      ? previewEducation.textContent      : '',
          skills:         previewSkills         ? previewSkills.textContent         : '',
          certifications: previewCertifications ? previewCertifications.textContent : '',
        }
      };

      const blob = new Blob([JSON.stringify(resumeData, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = (inputFullName && inputFullName.value.trim()
        ? inputFullName.value.trim().replace(/\s+/g, '_').toLowerCase()
        : 'resume');
      link.href     = url;
      link.download = `${safeName}_resuai.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  }

  // Export / Print as PDF — reuse same isolated print window as Download PDF button
  if (btnExportPdf) {
    btnExportPdf.addEventListener('click', () => {
      if (btnPrintPdf) btnPrintPdf.click();
    });
  }


  /* ==========================================================================
     10. ATS Analyzer Diagnostics Engine & Gemini Backend API Integration
     ========================================================================== */



  const atsDropZone = document.getElementById('atsDropZone');
  const btnSelectPdfFile = document.getElementById('btnSelectPdfFile');
  const pdfFileInput = document.getElementById('pdfFileInput');
  const selectedFileBadge = document.getElementById('selectedFileBadge');
  const selectedFileName = document.getElementById('selectedFileName');
  const btnRunAtsAnalysis = document.getElementById('btnRunAtsAnalysis');
  const btnRunAtsText = document.getElementById('btnRunAtsText');

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

    // Update UI badge
    if (selectedFileName && selectedFileBadge) {
      selectedFileName.textContent = file.name;
      selectedFileBadge.style.display = 'inline-flex';
    }

    uploadedFileText = ''; // Reset before extraction

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      // PDF — use PDF.js
      uploadedFileText = await extractPdfText(file);

    } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      // TXT — wrap FileReader in a Promise so it's properly awaited
      uploadedFileText = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload  = (e) => resolve(e.target.result || '');
        reader.onerror = ()  => resolve('');
        reader.readAsText(file);
      });

    } else if (file.name.endsWith('.docx')) {
      // DOCX — notify user that PDF or TXT is recommended for full text extraction
      uploadedFileText = '';
      if (selectedFileName) {
        selectedFileName.textContent = `${file.name} — DOCX file selected. For best ATS parsing, PDF or TXT is recommended.`;
      }
    }

    // Show extraction status in the badge for PDF/TXT
    if (!file.name.endsWith('.docx')) {
      if (selectedFileName && uploadedFileText) {
        const charCount = uploadedFileText.trim().length;
        selectedFileName.textContent = `${file.name} (${charCount} chars extracted)`;
      } else if (selectedFileName && !uploadedFileText) {
        selectedFileName.textContent = `${file.name} — could not extract text. Try PDF or TXT.`;
      }
    }

    console.log(`[ResuAI] Extracted ${uploadedFileText.length} characters from ${file.name}`);
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
    const recommendations = report.recommendations || report.formattingSuggestions || [];

    // Save scan to historical logs
    recordNewScanResult(dynamicScore);

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

    // Render Missing Keywords with 1-Click +Add Action
    if (missingKeywordsTitle) missingKeywordsTitle.innerHTML = `<i data-feather="x"></i> Missing / Gap Keywords (${missing.length})`;
    if (missingKeywordsContainer) {
      if (missing.length > 0) {
        missingKeywordsContainer.innerHTML = missing.map(kw => `
          <span class="missing-keyword-tag">
            <span>${kw}</span>
            <span class="tag-add-btn" data-keyword="${kw}" title="Click to add ${kw} to Core Skills">+ Add</span>
          </span>
        `).join('');
      } else {
        missingKeywordsContainer.innerHTML = `<span class="badge-tag green">No Critical Keyword Gaps Detected!</span>`;
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

  // 1-Click Insert Missing Keywords Event Listener
  if (missingKeywordsContainer) {
    missingKeywordsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.tag-add-btn');
      if (!btn) return;
      const kw = btn.dataset.keyword;
      if (kw) {
        addSkillTag(kw);
        btn.textContent = 'Added ✓';
        btn.classList.add('added');
        btn.style.pointerEvents = 'none';
      }
    });
  }

  // Sample Job Description Templates Dictionary & Handlers
  const SAMPLE_JD_TEMPLATES = {
    frontend: `We are looking for a Staff / Senior Frontend Architect to lead UI component design systems and web vitals optimization.

Key Requirements:
- 5+ years of experience with TypeScript, React, Next.js, and Vanilla CSS architecture.
- Deep expertise in Design Systems, Web Vitals (LCP, CLS, INP), and state management.
- Experience with GraphQL, REST APIs, and client-side performance optimization.
- Familiarity with CI/CD deployment pipelines, Kubernetes, and Redis caching is a plus.`,

    fullstack: `We are hiring a Senior Full Stack Engineer to build high-throughput microservices and real-time user interfaces.

Key Requirements:
- Proven experience with Node.js, Express, Python, and PostgreSQL database architecture.
- Frontend proficiency in TypeScript, React, Next.js, and Tailwind CSS.
- Hands-on experience with Microservices, Docker, Redis Caching, and RESTful APIs.
- Familiarity with AWS Cloud (EC2/S3/Lambda), CI/CD pipelines, and Jest testing.`,

    devops: `We are seeking a Lead DevOps & Cloud Systems Infrastructure Engineer to architect multi-region Kubernetes clusters.

Key Requirements:
- Extensive experience with Docker, Kubernetes (K8s), and Terraform Infrastructure as Code.
- Deep knowledge of AWS Cloud services, GCP, Linux System Administration, and Nginx.
- Strong proficiency in CI/CD Pipelines (GitHub Actions), Datadog Monitoring, and Shell scripting.
- Expertise in zero-downtime deployments, microservices security, and cost optimization.`,

    ai: `We are seeking an AI / Machine Learning Systems Engineer to build production RAG pipelines and LLM integrations.

Key Requirements:
- Hands-on experience with Python, Gemini / OpenAI APIs, PyTorch, and TensorFlow.
- Deep expertise in RAG Systems (LangChain / LlamaIndex) and Vector Databases (Pinecone / Milvus).
- Experience building scalable Data Engineering & ETL pipelines with Pandas & NumPy.
- Familiarity with Docker, FastAPI, and ML model evaluation frameworks.`
  };

  const sampleJdSelect = document.getElementById('sampleJdSelect');
  const atsEngineChipsContainer = document.getElementById('atsEngineChipsContainer');

  if (sampleJdSelect && atsJdInput) {
    sampleJdSelect.addEventListener('change', () => {
      const selected = sampleJdSelect.value;
      if (selected && SAMPLE_JD_TEMPLATES[selected]) {
        atsJdInput.value = SAMPLE_JD_TEMPLATES[selected];
        autoSaveFormFields();
      }
    });
  }

  if (atsEngineChipsContainer) {
    atsEngineChipsContainer.addEventListener('click', (e) => {
      const chip = e.target.closest('.parser-chip');
      if (!chip) return;
      atsEngineChipsContainer.querySelectorAll('.parser-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
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

          // Only show tailored CTA if resume was actually uploaded & parsed
          const tailoredCta = document.getElementById('tailoredResumeCta');
          const tailoredCtaDesc = tailoredCta ? tailoredCta.querySelector('.cta-text p') : null;
          if (tailoredCta) {
            if (uploadedFileText && uploadedFileText.trim().length > 50) {
              tailoredCtaDesc && (tailoredCtaDesc.textContent = 'Let Gemini 2.5 Flash rewrite your resume, optimised specifically for this job description — with matched keywords, a custom summary, and impact-driven bullets.');
              document.getElementById('btnGenerateTailored') && (document.getElementById('btnGenerateTailored').disabled = false);
            } else {
              tailoredCtaDesc && (tailoredCtaDesc.textContent = '⚠️ No resume file detected. Please upload your resume PDF in the drop zone above and re-run analysis to enable tailored generation.');
              document.getElementById('btnGenerateTailored') && (document.getElementById('btnGenerateTailored').disabled = true);
            }
            tailoredCta.style.display = 'block';
            tailoredCta.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

        // Show CTA but disable generate button if no resume was uploaded
        const tailoredCtaFallback = document.getElementById('tailoredResumeCta');
        const tailoredCtaDescFb  = tailoredCtaFallback ? tailoredCtaFallback.querySelector('.cta-text p') : null;
        if (tailoredCtaFallback) {
          if (!uploadedFileText || uploadedFileText.trim().length < 50) {
            tailoredCtaDescFb && (tailoredCtaDescFb.textContent = '⚠️ No resume file detected. Please upload your resume PDF in the drop zone above and re-run analysis to enable tailored generation.');
            document.getElementById('btnGenerateTailored') && (document.getElementById('btnGenerateTailored').disabled = true);
          }
          tailoredCtaFallback.style.display = 'block';
        }
      }
    });
  }

  // Restore form persistence & initial live preview sync
  loadSavedFormFields();
  syncLivePreview();
  syncLiveSkills();
  updateAnalyticsDashboard();

  /* ==========================================================================
     11. AI Tailored Resume Generator
     ========================================================================== */
  const btnGenerateTailored  = document.getElementById('btnGenerateTailored');
  const tailoredLoadingState = document.getElementById('tailoredLoadingState');
  const tailoredResumeResult = document.getElementById('tailoredResumeResult');
  const tailoredResumeDoc    = document.getElementById('tailoredResumeDoc');
  const tailoredProgressFill = document.getElementById('tailoredProgressFill');
  const tailoredProgressPct  = document.getElementById('tailoredProgressPercent');
  const btnPrintTailored     = document.getElementById('btnPrintTailored');

  function fillMissingCandidateDetails(data, rawResumeText) {
    const text = (rawResumeText || '').trim();

    // 1. Email
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const extractedEmail = emailMatch ? emailMatch[0] : (inputEmail ? inputEmail.value.trim() : '');

    // 2. Phone
    const phoneMatch = text.match(/(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
    const extractedPhone = phoneMatch ? phoneMatch[0] : (inputPhone ? inputPhone.value.trim() : '');

    // 3. Name
    let extractedName = inputFullName ? inputFullName.value.trim() : '';
    if ((!extractedName || extractedName === 'Manish Kuntal') && text) {
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      const ignoreWords = ['resume', 'curriculum', 'vitae', 'cv', 'contact', 'summary', 'profile', 'experience', 'education', 'skills', 'email', 'phone'];
      for (const line of lines.slice(0, 5)) {
        const lower = line.toLowerCase();
        if (!lower.includes('@') && !/\d{4,}/.test(lower) && !ignoreWords.some(w => lower.includes(w))) {
          if (line.length >= 2 && line.length <= 40 && !/[;{}]/.test(line)) {
            extractedName = line;
            break;
          }
        }
      }
    }

    // 4. Education
    let extractedEdu = inputEducation ? inputEducation.value.trim() : '';
    if (!extractedEdu && text) {
      const eduKeywords = ['university', 'college', 'institute', 'bachelor', 'b.s.', 'b.tech', 'b.e.', 'master', 'm.s.', 'm.tech', 'ph.d', 'degree', 'diploma', 'stanford', 'mit', 'harvard', 'iit', 'certif'];
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const eduLines = [];
      for (const line of lines) {
        if (eduKeywords.some(kw => line.toLowerCase().includes(kw))) {
          const clean = line.replace(/^[•\-\*\s]+/, '').trim();
          if (!eduLines.includes(clean)) eduLines.push(clean);
        }
      }
      if (eduLines.length > 0) extractedEdu = eduLines;
    }

    // Fill missing / placeholder fields in response data
    const nameStr = (data.name || '').toLowerCase().trim();
    if ((!data.name || ['not provided', 'your name', 'candidate name', 'undefined', 'null'].includes(nameStr)) && extractedName) {
      data.name = extractedName;
    }

    const emailStr = (data.email || '').toLowerCase().trim();
    if ((!data.email || ['not provided', 'your@email.com', 'candidate@email.com', 'email@example.com', 'undefined', 'null'].includes(emailStr)) && extractedEmail) {
      data.email = extractedEmail;
    }

    const phoneStr = (data.phone || '').toLowerCase().trim();
    if ((!data.phone || ['not provided', '+1 000 000 0000', 'undefined', 'null'].includes(phoneStr)) && extractedPhone) {
      data.phone = extractedPhone;
    }

    const eduStr = typeof data.education === 'string' ? data.education.toLowerCase().trim() : '';
    if ((!data.education || (Array.isArray(data.education) && data.education.length === 0) || ['not provided', 'education details (from resume)', 'b.s. computer science — university (year)', 'undefined', 'null'].includes(eduStr)) && extractedEdu) {
      data.education = extractedEdu;
    }

    if (!data.location || data.location.toLowerCase().includes('not provided')) {
      data.location = '';
    }

    return data;
  }

  function formatEducationHTML(eduData) {
    if (!eduData) return '';

    let items = [];
    if (Array.isArray(eduData)) {
      items = eduData;
    } else if (typeof eduData === 'object' && eduData !== null) {
      items = [eduData];
    } else {
      items = String(eduData).split(/\n|;|•|\|/).map(s => s.trim()).filter(Boolean);
    }

    if (items.length === 0) return '';

    return items.map(item => {
      if (typeof item === 'object' && item !== null) {
        const degree = item.degree || item.title || item.name || '';
        const school = item.institution || item.school || item.university || '';
        const year   = item.year || item.period || item.date || '';
        return `
          <div class="edu-item" style="margin-bottom: 6px;">
            <div class="exp-header">
              <strong>${degree}${school ? ' &mdash; ' + school : ''}</strong>
              <span>${year}</span>
            </div>
          </div>`;
      }

      const str = String(item).trim();
      const dateMatch = str.match(/(\((?:19|20)\d{2}(?:\s*[\-–]\s*(?:19|20)\d{2}|Present)?\)|(?:19|20)\d{2}\s*[\-–]\s*(?:19|20)\d{2}|(?:19|20)\d{2})/);
      let mainText = str;
      let dateText = '';

      if (dateMatch) {
        dateText = dateMatch[0].replace(/[\(\)]/g, '');
        mainText = str.replace(dateMatch[0], '').replace(/[\s—\-\|]+$/, '').trim();
      }

      if (dateText && mainText) {
        return `
          <div class="edu-item" style="margin-bottom: 6px;">
            <div class="exp-header">
              <strong>${mainText}</strong>
              <span>${dateText}</span>
            </div>
          </div>`;
      }

      return `<p class="section-content" style="margin-bottom: 4px;">&bull; ${str}</p>`;
    }).join('');
  }

  function parseBulletsList(rawBullets) {
    if (!rawBullets) return [];
    
    let items = [];
    if (Array.isArray(rawBullets)) {
      rawBullets.forEach(item => {
        if (typeof item === 'string') {
          const splitLines = item.split(/\r?\n|•|&bull;/).map(s => s.trim().replace(/^[•\-\*\s]+/, '')).filter(Boolean);
          items.push(...splitLines);
        } else if (item) {
          items.push(String(item));
        }
      });
    } else if (typeof rawBullets === 'string') {
      items = rawBullets.split(/\r?\n|•|&bull;/).map(s => s.trim().replace(/^[•\-\*\s]+/, '')).filter(Boolean);
    }

    if (items.length === 1 && items[0].length > 120 && items[0].includes('. ')) {
      const sentences = items[0].split(/(?<=\.)\s+/).map(s => s.trim()).filter(s => s.length > 10);
      if (sentences.length > 1) {
        items = sentences;
      }
    }

    return items;
  }

  function renderTailoredResume(data) {
    if (!tailoredResumeDoc) return;

    // Post-process data to ensure contact info and name are never empty
    data = fillMissingCandidateDetails(data, uploadedFileText);

    const skills = Array.isArray(data.skills) ? data.skills.join(' · ') : (data.skills || '');

    const expBlocks = (data.experience || []).map(job => {
      const bulletsList = parseBulletsList(job.bullets);
      const bulletsHTML = bulletsList.map(b => `<li class="tailored-bullet-item" style="margin-bottom: 0.35rem; line-height: 1.5; color: #374151;">${escapeHTML(b)}</li>`).join('');

      return `
        <div class="experience-block" style="margin-bottom: 1.1rem;">
          <div class="exp-header" style="display: flex; justify-content: space-between; align-items: baseline; font-size: 0.92rem; margin-bottom: 0.3rem;">
            <div>
              <strong style="color: #111827; font-weight: 700;">${escapeHTML(job.title || '')}</strong>
              ${job.company ? `<span style="color: #4f46e5; font-weight: 600;"> // ${escapeHTML(job.company)}</span>` : ''}
            </div>
            ${job.period ? `<span class="exp-date-pill" style="font-size: 0.75rem; color: #6b7280; font-weight: 600;">${escapeHTML(job.period)}</span>` : ''}
          </div>
          ${bulletsList.length > 0 ? `<ul class="exp-list tailored-bullets-ul" style="list-style-type: disc !important; padding-left: 1.25rem; margin-top: 0.35rem; margin-bottom: 0.5rem;">${bulletsHTML}</ul>` : ''}
        </div>
      `;
    }).join('');

    const contactParts = [];
    if (data.location) contactParts.push(`<span>${escapeHTML(data.location)}</span>`);
    if (data.email) contactParts.push(`<span>${escapeHTML(data.email)}</span>`);
    if (data.phone) contactParts.push(`<span>${escapeHTML(data.phone)}</span>`);

    tailoredResumeDoc.innerHTML = `
      <div class="paper-document-card" style="background: #ffffff; padding: 2rem; border-radius: 12px; border: 1px solid var(--border-color); box-shadow: 0 8px 24px rgba(0,0,0,0.06); font-family: 'Inter', sans-serif;">
        <!-- Header -->
        <div class="paper-candidate-header" style="text-align: center; border-bottom: 2px solid #6366f1; padding-bottom: 0.85rem; margin-bottom: 1.1rem;">
          <h2 style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.55rem; font-weight: 800; color: #111827; margin: 0; letter-spacing: -0.02em;">${(escapeHTML(data.name) || 'CANDIDATE RESUME').toUpperCase()}</h2>
          <div style="font-size: 0.85rem; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0.2rem;">${escapeHTML(data.jobTitle || 'TARGET ROLE')}</div>
          <div style="font-size: 0.78rem; color: #4b5563; margin-top: 0.4rem; display: flex; align-items: center; justify-content: center; gap: 0.6rem; flex-wrap: wrap;">${contactParts.join(' • ')}</div>
        </div>

        <!-- Professional Summary -->
        ${data.summary ? `
        <div class="paper-section" style="margin-bottom: 1.1rem;">
          <div class="paper-section-title" style="font-size: 0.78rem; font-weight: 800; letter-spacing: 0.08em; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.25rem; margin-bottom: 0.5rem;">PROFESSIONAL SUMMARY</div>
          <p style="font-size: 0.85rem; line-height: 1.55; color: #374151; margin: 0;">${escapeHTML(data.summary)}</p>
        </div>` : ''}

        <!-- Technical Expertise -->
        ${skills ? `
        <div class="paper-section" style="margin-bottom: 1.1rem;">
          <div class="paper-section-title" style="font-size: 0.78rem; font-weight: 800; letter-spacing: 0.08em; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.25rem; margin-bottom: 0.5rem;">TECHNICAL EXPERTISE</div>
          <p style="font-size: 0.85rem; line-height: 1.55; color: #374151; margin: 0; font-weight: 500;">${escapeHTML(skills)}</p>
        </div>` : ''}

        <!-- Work Experience -->
        <div class="paper-section" style="margin-bottom: 1.1rem;">
          <div class="paper-section-title" style="font-size: 0.78rem; font-weight: 800; letter-spacing: 0.08em; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.25rem; margin-bottom: 0.65rem;">WORK EXPERIENCE & KEY IMPACT PROJECTS</div>
          ${expBlocks}
        </div>

        <!-- Education -->
        ${data.education ? `
        <div class="paper-section" style="margin-bottom: 0.5rem;">
          <div class="paper-section-title" style="font-size: 0.78rem; font-weight: 800; letter-spacing: 0.08em; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.25rem; margin-bottom: 0.5rem;">EDUCATION & CREDENTIALS</div>
          <div>${formatEducationHTML(data.education)}</div>
        </div>` : ''}
      </div>
    `;
  }

  if (btnGenerateTailored) {
    btnGenerateTailored.addEventListener('click', async () => {
      const jdText = atsJdInput ? atsJdInput.value.trim() : '';

      // STRICT: only use the uploaded resume — no form-field fallback
      const resumeText = (uploadedFileText || '').trim();

      if (!resumeText) {
        // Show an inline error nudging the user to upload their resume
        const cta = document.getElementById('tailoredResumeCta');
        const existingErr = document.getElementById('tailoredUploadError');
        if (!existingErr && cta) {
          const err = document.createElement('p');
          err.id = 'tailoredUploadError';
          err.style.cssText = 'color:#ef4444;font-size:0.82rem;margin-top:0.6rem;display:flex;align-items:center;gap:0.4rem;';
          err.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Please upload your resume PDF above before generating a tailored version.`;
          cta.appendChild(err);
          setTimeout(() => err.remove(), 5000);
        }
        return;
      }

      if (!jdText) {
        alert('Please paste a job description in the ATS Analyzer before generating a tailored resume.');
        return;
      }

      // Show loading, hide previous result
      const tailoredCta = document.getElementById('tailoredResumeCta');
      if (tailoredCta) tailoredCta.style.display = 'none';
      if (tailoredResumeResult) tailoredResumeResult.style.display = 'none';
      if (tailoredLoadingState) {
        tailoredLoadingState.style.display = 'flex';
        tailoredLoadingState.scrollIntoView({ behavior: 'smooth' });
      }

      // Animate progress bar
      let prog = 0;
      if (tailoredProgressFill) tailoredProgressFill.style.width = '0%';
      if (tailoredProgressPct)  tailoredProgressPct.textContent  = '0%';
      const progInterval = setInterval(() => {
        prog = Math.min(prog + 8, 90);
        if (tailoredProgressFill) tailoredProgressFill.style.width = `${prog}%`;
        if (tailoredProgressPct)  tailoredProgressPct.textContent  = `${prog}%`;
        if (prog >= 90) clearInterval(progInterval);
      }, 80);

      try {
        const res = await fetch('/api/generate-tailored-resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jdText, resumeText })
        });
        const data = await res.json();

        clearInterval(progInterval);
        if (tailoredProgressFill) tailoredProgressFill.style.width = '100%';
        if (tailoredProgressPct)  tailoredProgressPct.textContent  = '100%';

        setTimeout(() => {
          if (tailoredLoadingState) tailoredLoadingState.style.display = 'none';
          renderTailoredResume(data);
          if (tailoredResumeResult) {
            tailoredResumeResult.style.display = 'block';
            tailoredResumeResult.scrollIntoView({ behavior: 'smooth' });
          }
          if (window.feather) feather.replace();
        }, 300);

      } catch (err) {
        console.warn('Tailored resume generation error:', err);
        clearInterval(progInterval);
        if (tailoredLoadingState) tailoredLoadingState.style.display = 'none';
        if (tailoredCta) tailoredCta.style.display = 'block';
        alert('Could not generate tailored resume. Please check your API key or try again.');
      }
    });
  }


  // Print Tailored Resume
  if (btnPrintTailored) {
    btnPrintTailored.addEventListener('click', () => {
      if (!tailoredResumeDoc) return;
      const printWindow = window.open('', '_blank', 'width=900,height=700');
      if (!printWindow) return;

      const styles = getPdfExportStyles();

      printWindow.document.write(`
<!DOCTYPE html><html lang="en"><head>
  <meta charset="UTF-8" />
  <title>Tailored Resume</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="${styles.fontLink}" rel="stylesheet" />
  <style>
    ${styles.pageSizeCss}
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{background:#fff;color:#111;font-family:${styles.bodyFont};font-size:11pt;line-height:1.5;padding:24pt 28pt}
    .paper-document-card{max-width:720px;margin:0 auto;font-family:${styles.bodyFont};box-shadow:none !important;border:none !important;padding:0 !important;}
    .paper-candidate-header{text-align:center;border-bottom:2px solid #111;padding-bottom:10pt;margin-bottom:14pt}
    .paper-section{margin-bottom:14pt}
    .paper-section-title{font-family:${styles.headingFont};font-size:8.5pt;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#000;border-bottom:1px solid #ccc;padding-bottom:3pt;margin-bottom:6pt}
    .experience-block{margin-bottom:12pt}
    .exp-header{display:flex;justify-content:space-between;align-items:baseline;font-size:10pt;font-weight:600;color:#111;margin-bottom:4pt}
    .tailored-bullets-ul{list-style-type:disc !important;padding-left:18pt !important;margin-top:4pt !important;margin-bottom:6pt !important}
    .tailored-bullet-item{margin-bottom:4pt !important;line-height:1.5 !important;color:#222 !important;font-size:9.5pt !important;display:list-item !important}
    @media print{html,body{padding:0}}
  </style>
</head><body>
  ${tailoredResumeDoc.outerHTML}
  <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();};}<\/script>
</body></html>`);
      printWindow.document.close();
    });
  }

  /* ==========================================================================
     12. Platform Settings & Preferences Manager Engine
     ========================================================================== */
  const SETTINGS_STORAGE_KEY = 'resuai-platform-settings';

  const settingGeminiModel              = document.getElementById('settingGeminiModel');
  const settingOptimizationSensitivity  = document.getElementById('settingOptimizationSensitivity');
  const sensitivityVal                  = document.getElementById('sensitivityVal');
  const btnSaveAiSettings               = document.getElementById('btnSaveAiSettings');

  const settingAtsEngine                = document.getElementById('settingAtsEngine');
  const settingSeniority                = document.getElementById('settingSeniority');
  const settingKeywordMatchStrategy     = document.getElementById('settingKeywordMatchStrategy');
  const btnSaveAtsSettings              = document.getElementById('btnSaveAtsSettings');

  const settingPaperSize                = document.getElementById('settingPaperSize');
  const settingTypography               = document.getElementById('settingTypography');
  const btnSavePdfSettings              = document.getElementById('btnSavePdfSettings');

  const settingAutoSaveToggle           = document.getElementById('settingAutoSaveToggle');
  const btnExportAllData                = document.getElementById('btnExportAllData');
  const btnResetAllData                 = document.getElementById('btnResetAllData');

  // Sensitivity range slider value text update
  if (settingOptimizationSensitivity && sensitivityVal) {
    settingOptimizationSensitivity.addEventListener('input', () => {
      const val = parseFloat(settingOptimizationSensitivity.value);
      let label = 'Balanced';
      if (val <= 0.3) label = 'Strict ATS Keywords';
      else if (val >= 0.8) label = 'Creative Impact';
      sensitivityVal.textContent = `${label} (${val})`;
    });
  }

  // Save Settings state to LocalStorage
  function savePlatformSettings() {
    const settings = {
      geminiModel: settingGeminiModel ? settingGeminiModel.value : 'gemini-2.5-flash',
      sensitivity: settingOptimizationSensitivity ? settingOptimizationSensitivity.value : '0.7',
      atsEngine: settingAtsEngine ? settingAtsEngine.value : 'greenhouse-lever',
      seniority: settingSeniority ? settingSeniority.value : 'senior',
      matchStrategy: settingKeywordMatchStrategy ? settingKeywordMatchStrategy.value : 'semantic',
      paperSize: settingPaperSize ? settingPaperSize.value : 'letter',
      typography: settingTypography ? settingTypography.value : 'inter-jakarta',
      autoSave: settingAutoSaveToggle ? settingAutoSaveToggle.checked : true,
      savedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Could not save settings to LocalStorage:', e);
    }
  }

  // Restore Settings state from LocalStorage on load
  function loadPlatformSettings() {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!saved) {
        syncSettingsThemeSwatches();
        updateLocalStorageDiagnostics();
        return;
      }
      const s = JSON.parse(saved);

      if (s.geminiModel && settingGeminiModel) settingGeminiModel.value = s.geminiModel;
      if (s.sensitivity && settingOptimizationSensitivity) {
        settingOptimizationSensitivity.value = s.sensitivity;
        if (sensitivityVal) {
          const val = parseFloat(s.sensitivity);
          let label = 'Balanced';
          if (val <= 0.3) label = 'Strict ATS Keywords';
          else if (val >= 0.8) label = 'Creative Impact';
          sensitivityVal.textContent = `${label} (${val})`;
        }
      }
      if (s.atsEngine && settingAtsEngine) settingAtsEngine.value = s.atsEngine;
      if (s.seniority && settingSeniority) settingSeniority.value = s.seniority;
      if (s.matchStrategy && settingKeywordMatchStrategy) settingKeywordMatchStrategy.value = s.matchStrategy;
      if (s.paperSize && settingPaperSize) settingPaperSize.value = s.paperSize;
      if (s.typography && settingTypography) settingTypography.value = s.typography;
      if (typeof s.autoSave === 'boolean' && settingAutoSaveToggle) settingAutoSaveToggle.checked = s.autoSave;
      
      applyTypographyToLivePreview();
      syncSettingsThemeSwatches();
      updateLocalStorageDiagnostics();
    } catch (e) {
      console.warn('Could not restore settings from LocalStorage:', e);
    }
  }

  // --- Platform LocalStorage Diagnostics Size Calculator ---
  function updateLocalStorageDiagnostics() {
    let sizeInBytes = 0;
    try {
      const keys = ['resuai-draft-resume', 'resuai-platform-settings', 'resuai-dashboard-theme', 'resuai-analytics-history', 'resuai-logged-in'];
      let totalStr = '';
      keys.forEach(k => {
        totalStr += (localStorage.getItem(k) || '');
      });
      sizeInBytes = totalStr.length * 2;
    } catch(e) {}

    const sizeInKB = (sizeInBytes / 1024).toFixed(2);
    const diagPayloadSize = document.getElementById('diagPayloadSize');
    if (diagPayloadSize) diagPayloadSize.textContent = `${sizeInKB} KB`;

    const percentUsed = Math.min(100, Math.max(0.01, (parseFloat(sizeInKB) / 5120) * 100));
    
    const storagePercentText = document.getElementById('storagePercentText');
    const storageProgressFill = document.getElementById('storageProgressFill');
    
    if (storagePercentText) storagePercentText.textContent = `${percentUsed.toFixed(3)}% of 5MB limit`;
    if (storageProgressFill) storageProgressFill.style.width = `${percentUsed}%`;
  }

  // --- Toast Notifications Engine ---
  function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-item ${type}`;

    let iconName = 'check-circle';
    if (type === 'info') iconName = 'info';
    else if (type === 'warning') iconName = 'alert-triangle';
    else if (type === 'error') iconName = 'alert-octagon';

    toast.innerHTML = `
      <span class="toast-icon ${type}"><i data-feather="${iconName}"></i></span>
      <span>${message}</span>
    `;
    
    container.appendChild(toast);
    if (window.feather) feather.replace();

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }
  window.showToast = showToast;

  // Visual feedback for save buttons
  function handleSettingsSaveFeedback(buttonEl, label) {
    savePlatformSettings();
    applyTypographyToLivePreview();
    updateLocalStorageDiagnostics();
    if (typeof showToast === 'function') {
      showToast(label || 'Saved Successfully!', 'success');
    }
    if (buttonEl) {
      const orig = buttonEl.innerHTML;
      buttonEl.innerHTML = `<i data-feather="check"></i> <span>Saved!</span>`;
      if (window.feather) feather.replace();
      setTimeout(() => {
        buttonEl.innerHTML = orig;
        if (window.feather) feather.replace();
      }, 2000);
    }
  }

  const aiEngineSettingsForm = document.getElementById('aiEngineSettingsForm');
  const pdfExportSettingsForm = document.getElementById('pdfExportSettingsForm');

  if (aiEngineSettingsForm) {
    aiEngineSettingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSettingsSaveFeedback(btnSaveAiSettings, 'AI Engine & Target Profile Saved!');
    });
  }

  if (pdfExportSettingsForm) {
    pdfExportSettingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSettingsSaveFeedback(btnSavePdfSettings, 'Typography & Export Formats Saved!');
    });
  }

  if (settingAutoSaveToggle) {
    settingAutoSaveToggle.addEventListener('change', () => {
      savePlatformSettings();
      updateLocalStorageDiagnostics();
      showToast('Auto-save preference updated.', 'info');
    });
  }

  // Backup All Workspace Data & Settings as JSON
  if (btnExportAllData) {
    btnExportAllData.addEventListener('click', () => {
      const draftRaw = localStorage.getItem('resuai-draft-resume');
      const settingsRaw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      const themeRaw = localStorage.getItem('resuai-dashboard-theme');

      const backupPackage = {
        exportedAt: new Date().toISOString(),
        version: '2.5',
        theme: themeRaw || 'twilight-haze',
        settings: settingsRaw ? JSON.parse(settingsRaw) : {},
        draftResume: draftRaw ? JSON.parse(draftRaw) : {}
      };

      const blob = new Blob([JSON.stringify(backupPackage, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resuai_workspace_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (typeof showToast === 'function') {
        showToast('Workspace backup JSON exported successfully!', 'success');
      }
    });
  }

  // Danger Zone: Reset All Local Workspace Data
  if (btnResetAllData) {
    btnResetAllData.addEventListener('click', () => {
      const confirm1 = window.confirm('DANGER: This will delete all saved resume drafts, ATS history, job applications, custom API keys, and workspace settings. Continue?');
      if (!confirm1) return;

      try {
        localStorage.removeItem('resuai-draft-resume');
        localStorage.removeItem(SETTINGS_STORAGE_KEY);
        localStorage.removeItem('resuai-dashboard-theme');
        localStorage.removeItem(ANALYTICS_HISTORY_KEY);
        localStorage.removeItem(JOB_APPS_STORAGE_KEY);
      } catch (e) {}

      alert('Workspace reset complete. Reloading application...');
      window.location.reload();
    });
  }

  // --- Interactive Score Analytics Hover Tooltips ---
  const chartDots = document.querySelectorAll('.chart-dot');
  const chartTooltip = document.getElementById('chartTooltip');

  if (chartDots && chartTooltip) {
    chartDots.forEach(dot => {
      dot.addEventListener('mouseenter', () => {
        const val = dot.getAttribute('data-val');
        chartTooltip.textContent = `ATS Score: ${val}`;
        chartTooltip.style.display = 'block';
        
        const dotRect = dot.getBoundingClientRect();
        const wrapper = dot.closest('.chart-container-wrapper');
        if (wrapper) {
          const wrapperRect = wrapper.getBoundingClientRect();
          const x = dotRect.left - wrapperRect.left + (dotRect.width / 2);
          const y = dotRect.top - wrapperRect.top;
          
          chartTooltip.style.left = `${x}px`;
          chartTooltip.style.top = `${y}px`;
        }
        
        chartDots.forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
      });

      dot.addEventListener('mouseleave', () => {
        chartTooltip.style.display = 'none';
      });
    });
  }

  /* ==========================================================================
     13. Job Applications Pipeline & Kanban Tracker Module
     ========================================================================== */

  const JOB_APPS_STORAGE_KEY = 'resuai_job_applications';
  let activeQuickFilterChip = 'all';

  const DEFAULT_SEED_JOBS = [
    {
      id: 'job-101',
      company: 'Microsoft',
      title: 'Senior Frontend Engineer',
      stage: 'interview',
      salary: '$170,000 - $210,000',
      date: '2026-07-20',
      location: 'Redmond, WA (Hybrid)',
      atsScore: 94,
      tags: ['TypeScript', 'React', 'Design Systems', 'Performance'],
      url: 'https://careers.microsoft.com/us/en/job/168923',
      jdText: 'Seeking Senior Frontend Engineer with expert TypeScript, React, System Design, Web Performance, and Accessible Design Systems skills.',
      notes: 'Passed Technical Screen. Next: 4-round Virtual Onsite focusing on UI Architecture and State Management.'
    },
    {
      id: 'job-102',
      company: 'Stripe',
      title: 'Staff Systems Architect',
      stage: 'offer',
      salary: '$220,000 - $265,000',
      date: '2026-07-15',
      location: 'Remote',
      atsScore: 91,
      tags: ['Go', 'Microservices', 'Distributed Systems', 'API'],
      url: 'https://stripe.com/jobs/staff-architect',
      jdText: 'Architect resilient payment APIs, microservices, distribution protocols, latency reduction, and high availability systems.',
      notes: 'Written offer received! Base: $235k + Equity. Reviewing offer letter details before deadline.'
    },
    {
      id: 'job-103',
      company: 'OpenAI',
      title: 'Full Stack AI Platform Lead',
      stage: 'applied',
      salary: '$200,000 - $250,000',
      date: '2026-07-22',
      location: 'San Francisco, CA',
      atsScore: 88,
      tags: ['Python', 'Next.js', 'LLM Streaming', 'Tailwind'],
      url: 'https://openai.com/careers/full-stack-lead',
      jdText: 'Build high-performance web interfaces and streaming API clients for next-generation intelligence models.',
      notes: 'Application submitted via employee referral link.'
    },
    {
      id: 'job-104',
      company: 'Google',
      title: 'Senior Software Engineer (Cloud)',
      stage: 'interview',
      salary: '$180,000 - $225,000',
      date: '2026-07-18',
      location: 'Sunnyvale, CA',
      atsScore: 95,
      tags: ['C++', 'Kubernetes', 'GCP', 'Observability'],
      url: 'https://careers.google.com/jobs/results/123456',
      jdText: 'Distributed systems, Go, C++, Kubernetes, Cloud platform scalability and observability.',
      notes: 'Coding round completed successfully. Scheduled System Design round for next Monday.'
    },
    {
      id: 'job-105',
      company: 'Meta',
      title: 'UI Infrastructure Engineer',
      stage: 'wishlist',
      salary: '$175,000 - $215,000',
      date: '2026-07-24',
      location: 'Menlo Park, CA',
      atsScore: 85,
      tags: ['React Core', 'Vite', 'Bundle Optimization', 'SSR'],
      url: 'https://metacareers.com/jobs/ui-infra',
      jdText: 'Core React framework contributions, bundle optimization, SSR rendering pipeline, and web vitals.',
      notes: 'Tailoring specific resume version with focus on performance optimization metrics.'
    }
  ];

  let jobApplicationsList = [];

  function loadJobApplications() {
    try {
      const stored = localStorage.getItem(JOB_APPS_STORAGE_KEY);
      if (stored) {
        jobApplicationsList = JSON.parse(stored);
      } else {
        jobApplicationsList = [...DEFAULT_SEED_JOBS];
        saveJobApplications();
      }
    } catch (e) {
      console.warn('Error loading job applications:', e);
      jobApplicationsList = [...DEFAULT_SEED_JOBS];
    }
  }

  function saveJobApplications() {
    try {
      localStorage.setItem(JOB_APPS_STORAGE_KEY, JSON.stringify(jobApplicationsList));
    } catch (e) {
      console.warn('Error saving job applications:', e);
    }
  }

  // Render KPIs
  function updatePipelineKPIs() {
    const totalCount = jobApplicationsList.length;
    const interviewCount = jobApplicationsList.filter(j => j.stage === 'interview').length;
    const offerCount = jobApplicationsList.filter(j => j.stage === 'offer').length;

    const scores = jobApplicationsList.map(j => Number(j.atsScore) || 0).filter(s => s > 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const elTotal = document.getElementById('kpiTotalApps');
    const elInterview = document.getElementById('kpiActiveInterviews');
    const elOffer = document.getElementById('kpiOffersCount');
    const elAvg = document.getElementById('kpiAvgAtsScore');

    if (elTotal) elTotal.textContent = totalCount;
    if (elInterview) elInterview.textContent = interviewCount;
    if (elOffer) elOffer.textContent = offerCount;
    if (elAvg) elAvg.textContent = `${avgScore}%`;
  }

  // Get Company Initial Avatar string
  function getCompanyInitials(name) {
    if (!name) return 'JOB';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  // Render Tech Pills Helper
  function renderTechPills(tags) {
    if (!tags || !Array.isArray(tags) || !tags.length) return '';
    const colorClasses = ['pill-blue', 'pill-purple', 'pill-emerald', 'pill-orange', 'pill-slate'];
    return `<div class="tech-pills-row">
      ${tags.map((tag, idx) => `<span class="tech-pill ${colorClasses[idx % colorClasses.length]}">${escapeHTML(tag)}</span>`).join('')}
    </div>`;
  }

  const NEXT_STAGE_LABEL_MAP = {
    'wishlist': { next: 'applied', label: 'Apply ➔' },
    'applied': { next: 'interview', label: 'Interview ➔' },
    'interview': { next: 'offer', label: 'Got Offer! 🎉' }
  };

  // Render Kanban Board
  function renderKanbanBoard(filteredList) {
    const stages = ['wishlist', 'applied', 'interview', 'offer', 'rejected'];

    stages.forEach(stage => {
      const colCardsList = document.getElementById(`column-cards-${stage}`);
      const countEl = document.getElementById(`count-${stage}`);

      if (!colCardsList) return;

      const stageJobs = filteredList.filter(j => j.stage === stage);
      if (countEl) countEl.textContent = stageJobs.length;

      colCardsList.innerHTML = '';

      if (stageJobs.length === 0) {
        colCardsList.innerHTML = `<div class="empty-stage-placeholder" style="font-size:0.78rem; color:var(--text-muted); text-align:center; padding:1.5rem 0.5rem; border:1px dashed var(--border-color); border-radius:8px;">No ${stage} apps</div>`;
        return;
      }

      stageJobs.forEach(job => {
        const card = document.createElement('div');
        card.className = 'kanban-card';
        card.setAttribute('draggable', 'true');
        card.setAttribute('data-id', job.id);

        const atsClass = (job.atsScore >= 90) ? 'ats-high' : (job.atsScore >= 75) ? 'ats-med' : 'ats-low';
        const nextStageInfo = NEXT_STAGE_LABEL_MAP[job.stage];

        card.innerHTML = `
          <div class="kanban-card-header">
            <div class="company-logo-avatar">${getCompanyInitials(job.company)}</div>
            <div class="company-info">
              <div class="company-name">${escapeHTML(job.company)}</div>
              <div class="job-role-title">${escapeHTML(job.title)}</div>
            </div>
            ${job.atsScore ? `<span class="ats-score-pill ${atsClass}"><i data-feather="zap"></i> ${job.atsScore}%</span>` : ''}
          </div>
          ${renderTechPills(job.tags)}
          <div class="card-meta-details">
            ${job.salary ? `<span class="meta-chip"><i data-feather="dollar-sign"></i> ${escapeHTML(job.salary)}</span>` : ''}
            ${job.location ? `<span class="meta-chip"><i data-feather="map-pin"></i> ${escapeHTML(job.location)}</span>` : ''}
            ${job.date ? `<span class="meta-chip"><i data-feather="calendar"></i> ${escapeHTML(job.date)}</span>` : ''}
          </div>
          <div class="card-actions-bar">
            <div style="display:flex; gap:0.3rem;">
              <button class="card-action-btn btn-edit-job" data-id="${job.id}" title="Edit Application">
                <i data-feather="edit-2"></i> Edit
              </button>
              ${job.jdText ? `<button class="card-action-btn btn-scan-ats" data-id="${job.id}" title="Scan JD in ATS Analyzer" style="color:var(--primary); font-weight:700;"><i data-feather="sparkles"></i> ATS Scan</button>` : ''}
            </div>
            ${nextStageInfo ? `<button class="btn-stage-advance" data-id="${job.id}" data-next="${nextStageInfo.next}">${nextStageInfo.label}</button>` : ''}
          </div>
        `;

        // Drag events
        card.addEventListener('dragstart', (e) => {
          card.classList.add('dragging');
          e.dataTransfer.setData('text/plain', job.id);
        });
        card.addEventListener('dragend', () => {
          card.classList.remove('dragging');
        });

        colCardsList.appendChild(card);
      });
    });

    if (window.feather) window.feather.replace();
  }

  // Render Table View
  function renderTableView(filteredList) {
    const tableBody = document.getElementById('pipelineTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (filteredList.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted);">No job applications found matching filter criteria.</td></tr>`;
      return;
    }

    filteredList.forEach(job => {
      const tr = document.createElement('tr');
      const atsClass = (job.atsScore >= 90) ? 'ats-high' : (job.atsScore >= 75) ? 'ats-med' : 'ats-low';

      tr.innerHTML = `
        <td>
          <div style="display:flex; align-items:center; gap:0.65rem;">
            <div class="company-logo-avatar">${getCompanyInitials(job.company)}</div>
            <div>
              <strong style="color:var(--text-primary); font-size:0.9rem;">${escapeHTML(job.company)}</strong>
              <div style="font-size:0.78rem; color:var(--text-muted);">${escapeHTML(job.title)}</div>
              ${renderTechPills(job.tags)}
            </div>
          </div>
        </td>
        <td><span class="stage-pill stage-${job.stage}">${escapeHTML(job.stage)}</span></td>
        <td>${escapeHTML(job.date || 'N/A')}</td>
        <td>${escapeHTML(job.salary || 'Unspecified')}</td>
        <td>${job.atsScore ? `<span class="ats-score-pill ${atsClass}">${job.atsScore}%</span>` : 'N/A'}</td>
        <td class="text-right">
          <div class="table-actions-cell">
            <button class="btn-edit-job" data-id="${job.id}" title="Edit"><i data-feather="edit-2"></i> Edit</button>
            ${job.jdText ? `<button class="btn-scan-ats" data-id="${job.id}" title="Run ATS Scan" style="color:var(--primary);"><i data-feather="sparkles"></i> Scan</button>` : ''}
            <button class="btn-delete-job" data-id="${job.id}" title="Delete" style="color:#ef4444;"><i data-feather="trash-2"></i> Delete</button>
          </div>
        </td>
      `;

      tableBody.appendChild(tr);
    });

    if (window.feather) window.feather.replace();
  }

  function renderPipelineViews() {
    const searchVal = (document.getElementById('jobSearchInput')?.value || '').toLowerCase().trim();
    const stageFilter = document.getElementById('jobStageFilter')?.value || 'all';

    const faangCompanies = ['google', 'microsoft', 'stripe', 'openai', 'meta', 'apple', 'amazon', 'netflix'];

    let filtered = jobApplicationsList.filter(job => {
      const matchStage = (stageFilter === 'all') || (job.stage === stageFilter);
      const matchQuery = !searchVal || 
        job.company.toLowerCase().includes(searchVal) ||
        job.title.toLowerCase().includes(searchVal) ||
        (job.location && job.location.toLowerCase().includes(searchVal)) ||
        (job.notes && job.notes.toLowerCase().includes(searchVal)) ||
        (job.tags && job.tags.some(t => t.toLowerCase().includes(searchVal)));

      let matchChip = true;
      if (activeQuickFilterChip === 'faang') {
        matchChip = faangCompanies.includes(job.company.toLowerCase());
      } else if (activeQuickFilterChip === 'remote') {
        matchChip = Boolean(job.location && job.location.toLowerCase().includes('remote'));
      } else if (activeQuickFilterChip === 'high-ats') {
        matchChip = Number(job.atsScore) >= 90;
      }

      return matchStage && matchQuery && matchChip;
    });

    updatePipelineKPIs();
    renderKanbanBoard(filtered);
    renderTableView(filtered);
    bindJobActionButtons();
  }

  // Setup Column Drag & Drop Listeners
  function initKanbanDragAndDrop() {
    const columns = document.querySelectorAll('.kanban-column');
    columns.forEach(col => {
      col.addEventListener('dragover', (e) => {
        e.preventDefault();
        col.classList.add('drag-over');
      });

      col.addEventListener('dragleave', () => {
        col.classList.remove('drag-over');
      });

      col.addEventListener('drop', (e) => {
        e.preventDefault();
        col.classList.remove('drag-over');
        const jobId = e.dataTransfer.getData('text/plain');
        const targetStage = col.getAttribute('data-stage');

        if (jobId && targetStage) {
          const job = jobApplicationsList.find(j => j.id === jobId);
          if (job && job.stage !== targetStage) {
            job.stage = targetStage;
            saveJobApplications();
            renderPipelineViews();
            if (typeof showToast === 'function') {
              showToast(`Moved ${job.company} application to ${targetStage}!`, 'success');
            }
          }
        }
      });
    });
  }

  // Event Delegation for Edit, Delete, ATS Scan, Stage Advance
  function bindJobActionButtons() {
    document.querySelectorAll('.btn-edit-job').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        openJobModal(id);
      };
    });

    document.querySelectorAll('.btn-delete-job').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const job = jobApplicationsList.find(j => j.id === id);
        if (job && window.confirm(`Delete application for ${job.company} (${job.title})?`)) {
          jobApplicationsList = jobApplicationsList.filter(j => j.id !== id);
          saveJobApplications();
          renderPipelineViews();
          if (typeof showToast === 'function') {
            showToast('Application deleted.', 'info');
          }
        }
      };
    });

    document.querySelectorAll('.btn-scan-ats').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const job = jobApplicationsList.find(j => j.id === id);
        if (job && job.jdText) {
          const atsJdInput = document.getElementById('atsJdInput');
          if (atsJdInput) {
            atsJdInput.value = job.jdText;
          }
          switchTab('ats-analyzer');
          if (typeof showToast === 'function') {
            showToast(`Loaded ${job.company} JD into ATS Analyzer!`, 'success');
          }
        }
      };
    });

    // 1-Click Stage Advance Button
    document.querySelectorAll('.btn-stage-advance').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const nextStage = btn.getAttribute('data-next');
        const job = jobApplicationsList.find(j => j.id === id);
        if (job && nextStage) {
          job.stage = nextStage;
          saveJobApplications();
          renderPipelineViews();
          if (typeof showToast === 'function') {
            showToast(`Advanced ${job.company} application to ${nextStage.toUpperCase()}! 🚀`, 'success');
          }
        }
      };
    });
  }

  // Quick Filter Chips listeners
  const quickFilterChips = document.querySelectorAll('.filter-chip');
  if (quickFilterChips) {
    quickFilterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        quickFilterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeQuickFilterChip = chip.getAttribute('data-chip') || 'all';
        renderPipelineViews();
      });
    });
  }

  // Modal Open / Close / Save Handlers
  const jobModal = document.getElementById('jobModal');
  const jobForm = document.getElementById('jobForm');
  const btnAddNewJob = document.getElementById('btnAddNewJob');
  const btnCloseJobModal = document.getElementById('btnCloseJobModal');
  const btnCancelJobModal = document.getElementById('btnCancelJobModal');

  function openJobModal(jobId = null) {
    if (!jobModal || !jobForm) return;

    jobForm.reset();
    document.getElementById('jobId').value = '';

    if (jobId) {
      const job = jobApplicationsList.find(j => j.id === jobId);
      if (job) {
        document.getElementById('jobModalTitle').textContent = 'Edit Job Application';
        document.getElementById('jobId').value = job.id;
        document.getElementById('jobCompany').value = job.company || '';
        document.getElementById('jobTitle').value = job.title || '';
        document.getElementById('jobStage').value = job.stage || 'applied';
        document.getElementById('jobSalary').value = job.salary || '';
        document.getElementById('jobDate').value = job.date || '';
        document.getElementById('jobLocation').value = job.location || '';
        document.getElementById('jobAtsScore').value = job.atsScore || '';
        document.getElementById('jobUrl').value = job.url || '';
        document.getElementById('jobJdText').value = job.jdText || '';
        document.getElementById('jobNotes').value = job.notes || '';
      }
    } else {
      document.getElementById('jobModalTitle').textContent = 'Add Job Application';
      document.getElementById('jobDate').value = new Date().toISOString().split('T')[0];
    }

    jobModal.style.display = 'flex';
  }

  function closeJobModal() {
    if (jobModal) jobModal.style.display = 'none';
  }

  if (btnAddNewJob) btnAddNewJob.addEventListener('click', () => openJobModal());
  if (btnCloseJobModal) btnCloseJobModal.addEventListener('click', closeJobModal);
  if (btnCancelJobModal) btnCancelJobModal.addEventListener('click', closeJobModal);

  if (jobModal) {
    jobModal.addEventListener('click', (e) => {
      if (e.target === jobModal) closeJobModal();
    });
  }

  if (jobForm) {
    jobForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const id = document.getElementById('jobId').value;
      const company = document.getElementById('jobCompany').value.trim();
      const title = document.getElementById('jobTitle').value.trim();

      if (!company || !title) return;

      const jobData = {
        id: id || `job-${Date.now()}`,
        company,
        title,
        stage: document.getElementById('jobStage').value,
        salary: document.getElementById('jobSalary').value.trim(),
        date: document.getElementById('jobDate').value,
        location: document.getElementById('jobLocation').value.trim(),
        atsScore: Number(document.getElementById('jobAtsScore').value) || 0,
        url: document.getElementById('jobUrl').value.trim(),
        jdText: document.getElementById('jobJdText').value.trim(),
        notes: document.getElementById('jobNotes').value.trim()
      };

      if (id) {
        const index = jobApplicationsList.findIndex(j => j.id === id);
        if (index !== -1) jobApplicationsList[index] = jobData;
      } else {
        jobApplicationsList.unshift(jobData);
      }

      saveJobApplications();
      renderPipelineViews();
      closeJobModal();

      if (typeof showToast === 'function') {
        showToast(id ? 'Application updated successfully!' : 'New application added to pipeline!', 'success');
      }
    });
  }

  // View Switcher (Board vs Table)
  const btnViewKanban = document.getElementById('btnViewKanban');
  const btnViewTable = document.getElementById('btnViewTable');
  const kanbanBoardContainer = document.getElementById('kanbanBoardContainer');
  const tableViewContainer = document.getElementById('tableViewContainer');

  if (btnViewKanban && btnViewTable) {
    btnViewKanban.addEventListener('click', () => {
      btnViewKanban.classList.add('active');
      btnViewTable.classList.remove('active');
      if (kanbanBoardContainer) kanbanBoardContainer.style.display = 'grid';
      if (tableViewContainer) tableViewContainer.style.display = 'none';
    });

    btnViewTable.addEventListener('click', () => {
      btnViewTable.classList.add('active');
      btnViewKanban.classList.remove('active');
      if (kanbanBoardContainer) kanbanBoardContainer.style.display = 'none';
      if (tableViewContainer) tableViewContainer.style.display = 'block';
    });
  }

  // Search & Filter event listeners
  const jobSearchInput = document.getElementById('jobSearchInput');
  const jobStageFilter = document.getElementById('jobStageFilter');

  if (jobSearchInput) jobSearchInput.addEventListener('input', renderPipelineViews);
  if (jobStageFilter) jobStageFilter.addEventListener('change', renderPipelineViews);

  // Helper escape HTML string function
  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }

  // Initialize pipeline
  loadJobApplications();
  renderPipelineViews();
  initKanbanDragAndDrop();

  // Load saved settings on startup
  loadPlatformSettings();

});



