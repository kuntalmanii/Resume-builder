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

    // Hide New Resume button on ATS Analyzer & non-builder tabs
    const btnNewResume = document.getElementById('btnNewResume');
    if (btnNewResume) {
      btnNewResume.style.display = (tabId === 'resume-builder') ? 'inline-flex' : 'none';
    }

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
      const skills = Array.from(document.querySelectorAll('#skillsTagsContainer .tag')).map(t => t.textContent.replace('x', '').trim());

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
      const val = inputEducation.value.trim();
      previewEducation.innerHTML = val ? formatEducationHTML(val) : `
        <div class="edu-item" style="margin-bottom: 6px;">
          <div class="exp-header">
            <strong>B.S. Computer Science & Design &mdash; Stanford University</strong>
            <span>2022</span>
          </div>
        </div>`;
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
  const skillPillsContainer = document.getElementById('skillPillsContainer');
  const skillCategoryFilters = document.getElementById('skillCategoryFilters');
  const btnSuggestAiSkills = document.getElementById('btnSuggestAiSkills');
  const skillAutocompleteDropdown = document.getElementById('skillAutocompleteDropdown');

  /* ==========================================================================
     Core Skills Suggestions Database & Engine
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
      .map(t => t.textContent.replace('x', '').trim().toLowerCase());
    
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
      .map(t => t.textContent.replace('x', '').trim().toLowerCase());

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
        .map(t => t.textContent.replace('×', '').replace('x', '').trim())
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
     Dynamic PDF Export & Typography Settings Engine
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

  // New Resume Version Button — clears all fields and resets to Step 1
  const btnNewResume = document.getElementById('btnNewResume');
  if (btnNewResume) {
    btnNewResume.addEventListener('click', () => {
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
        // Remove all existing tags
        tagsContainer.querySelectorAll('.tag').forEach(tag => tag.remove());
        // Re-insert the input field if it was removed
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
    });
  }

  /* ==========================================================================
     7.5 Export JSON / PDF — Flat Action Buttons (no dropdown)
     ========================================================================== */
  const btnExportJson     = document.getElementById('btnExportJson');
  const btnExportPdf      = document.getElementById('btnExportPdf');

  // Export as JSON
  if (btnExportJson) {
    btnExportJson.addEventListener('click', () => {
      const skills = Array.from(document.querySelectorAll('#skillsTagsContainer .tag'))
        .map(t => t.textContent.replace('x', '').trim()).filter(Boolean);

      const resumeData = {
        meta: { exportedAt: new Date().toISOString(), version: '2.5', tool: 'ResuAI' },
        personalInfo: {
          fullName:  inputFullName  ? inputFullName.value.trim()  : '',
          jobTitle:  inputJobTitle  ? inputJobTitle.value.trim()  : '',
          email:     inputEmail     ? inputEmail.value.trim()     : '',
          phone:     inputPhone     ? inputPhone.value.trim()     : '',
          education: inputEducation ? inputEducation.value.trim() : '',
        },
        skills,
        experience: bulletPoints ? bulletPoints.value.trim() : '',
        preview: {
          name:      previewName      ? previewName.textContent      : '',
          role:      previewRole      ? previewRole.textContent      : '',
          meta:      previewMeta      ? previewMeta.textContent      : '',
          education: previewEducation ? previewEducation.textContent : '',
          skills:    previewSkills    ? previewSkills.textContent    : '',
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
     7. ATS Analyzer Diagnostics Engine & Gemini Backend API Integration
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
      // DOCX — it's a ZIP of XML files; extract raw text by stripping XML tags
      // This gives good-enough plain text for Gemini to parse
      try {
        const arrayBuffer = await file.arrayBuffer();
        // Convert buffer to string and strip all XML/markup tags
        const bytes = new Uint8Array(arrayBuffer);
        let raw = '';
        for (let i = 0; i < bytes.length; i++) {
          if (bytes[i] >= 32 && bytes[i] < 127) raw += String.fromCharCode(bytes[i]);
        }
        // Pull readable text between XML word tags
        const matches = raw.match(/[A-Za-z0-9@._\-+,()&%$#!?:;\/' "\n]{4,}/g);
        uploadedFileText = matches ? matches.join(' ') : '';
      } catch (e) {
        console.warn('DOCX extraction error:', e);
        uploadedFileText = '';
      }
    }

    // Show extraction status in the badge
    if (selectedFileName && uploadedFileText) {
      const charCount = uploadedFileText.trim().length;
      selectedFileName.textContent = `${file.name} (${charCount} chars extracted)`;
    } else if (selectedFileName && !uploadedFileText) {
      selectedFileName.textContent = `${file.name} — could not extract text. Try PDF or TXT.`;
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

  /* ==========================================================================
     8. AI Tailored Resume Generator
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

  function renderTailoredResume(data) {
    if (!tailoredResumeDoc) return;

    // Post-process data to ensure contact info and name are never empty
    data = fillMissingCandidateDetails(data, uploadedFileText);

    const skills = (data.skills || []).join(', ');
    const expBlocks = (data.experience || []).map(job => `
      <div class="experience-block">
        <div class="exp-header">
          <strong>${job.title || ''} // ${job.company || ''}</strong>
          <span>${job.period || ''}</span>
        </div>
        <ul class="exp-list">
          ${(job.bullets || []).map(b => `<li>${b}</li>`).join('')}
        </ul>
      </div>
    `).join('');

    // Format header meta string dynamically
    const metaParts = [];
    if (data.location) metaParts.push(data.location);
    if (data.email) metaParts.push(data.email);
    if (data.phone) metaParts.push(data.phone);

    tailoredResumeDoc.innerHTML = `
      <div class="preview-doc-header">
        <div class="doc-name">${(data.name || 'CANDIDATE RESUME').toUpperCase()}</div>
        <div class="doc-role">${(data.jobTitle || 'TARGET ROLE').toUpperCase()}</div>
        <div class="doc-meta">${metaParts.join(' &bull; ')}</div>
      </div>

      ${data.summary ? `
      <div class="preview-section">
        <div class="section-title">PROFESSIONAL SUMMARY</div>
        <p class="section-content">${data.summary}</p>
      </div>` : ''}

      ${skills ? `
      <div class="preview-section">
        <div class="section-title">TECHNICAL EXPERTISE</div>
        <p class="section-content">${skills}</p>
      </div>` : ''}

      <div class="preview-section">
        <div class="section-title">WORK EXPERIENCE & KEY IMPACT PROJECTS</div>
        ${expBlocks}
      </div>

      ${data.education ? `
      <div class="preview-section">
        <div class="section-title">EDUCATION & CREDENTIALS</div>
        ${formatEducationHTML(data.education)}
      </div>` : ''}
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
    .resume-preview-document{max-width:700px;margin:0 auto;font-family:${styles.bodyFont}}
    .preview-doc-header{border-bottom:2px solid #111;padding-bottom:10pt;margin-bottom:14pt}
    .doc-name{font-family:${styles.headingFont};font-size:20pt;font-weight:800;letter-spacing:2px;color:#000}
    .doc-role{font-size:9.5pt;font-weight:600;letter-spacing:1.5px;color:#444;margin-top:2pt}
    .doc-meta{font-size:9pt;color:#555;margin-top:4pt}
    .preview-section{margin-top:14pt}
    .section-title{font-family:${styles.headingFont};font-size:8.5pt;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#000;border-bottom:1px solid #ccc;padding-bottom:3pt;margin-bottom:6pt}
    .section-content{font-size:10pt;color:#222}
    .experience-block{margin-bottom:10pt}
    .exp-header{display:flex;justify-content:space-between;font-size:10pt;font-weight:600;color:#111;margin-bottom:4pt}
    .exp-list{padding-left:14pt;font-size:10pt;color:#222}
    .exp-list li{margin-bottom:3pt}
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
     9. Platform Settings & Preferences Manager Engine
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
      if (!saved) return;
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
    } catch (e) {
      console.warn('Could not restore settings from LocalStorage:', e);
    }
  }

  // Visual feedback for save buttons
  function handleSettingsSaveFeedback(buttonEl, label) {
    savePlatformSettings();
    applyTypographyToLivePreview();
    if (buttonEl) {
      const orig = buttonEl.innerHTML;
      buttonEl.innerHTML = `<i data-feather="check-circle"></i> <span>${label || 'Saved!'}</span>`;
      if (window.feather) feather.replace();
      setTimeout(() => {
        buttonEl.innerHTML = orig;
        if (window.feather) feather.replace();
      }, 2000);
    }
  }

  if (btnSaveAiSettings) btnSaveAiSettings.addEventListener('click', () => handleSettingsSaveFeedback(btnSaveAiSettings, 'AI Preferences Saved!'));
  if (btnSaveAtsSettings) btnSaveAtsSettings.addEventListener('click', () => handleSettingsSaveFeedback(btnSaveAtsSettings, 'Target Profile Saved!'));
  if (btnSavePdfSettings) btnSavePdfSettings.addEventListener('click', () => handleSettingsSaveFeedback(btnSavePdfSettings, 'Format Defaults Saved!'));

  if (settingAutoSaveToggle) {
    settingAutoSaveToggle.addEventListener('change', savePlatformSettings);
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
        theme: themeRaw || 'light-modern',
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
    });
  }

  // Danger Zone: Reset All Local Workspace Data
  if (btnResetAllData) {
    btnResetAllData.addEventListener('click', () => {
      const confirm1 = window.confirm('DANGER: This will delete all saved resume drafts, ATS history, custom API keys, and workspace settings. Continue?');
      if (!confirm1) return;

      try {
        localStorage.removeItem('resuai-draft-resume');
        localStorage.removeItem(SETTINGS_STORAGE_KEY);
        localStorage.removeItem('resuai-dashboard-theme');
      } catch (e) {}

      alert('Workspace reset complete. Reloading application...');
      window.location.reload();
    });
  }

  // Load saved settings on startup
  loadPlatformSettings();

});


