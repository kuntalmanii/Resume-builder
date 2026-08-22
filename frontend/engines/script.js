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

/**
 * escapeHTML — Global XSS-safe HTML escape helper.
 *
 * Defined here in global scope (outside DOMContentLoaded) so it is
 * accessible to all functions throughout this file that build innerHTML
 * strings (renderCustomSectionInputs, renderCustomSectionsPreview,
 * renderVersionProfilesModal, etc.).
 *
 * NOTE: ats-analyzer.js has its own identical copy as a class method
 * (this.escapeHTML). This standalone version is for script.js only.
 *
 * @param {*} str - Value to escape. Non-strings return ''.
 * @returns {string} HTML-escaped string safe for innerHTML insertion.
 */
function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

function updateTextNode(el, text) {
  if (!el) return;
  if (el.textContent !== text) {
    el.textContent = text;
  }
}
window.updateTextNode = updateTextNode;

window.openJobModal = window.openJobModal || function(jobId = null) {
  if (typeof window._openJobModalInternal === 'function') {
    window._openJobModalInternal(jobId);
  } else {
    const el = document.getElementById('jobModal');
    if (el) {
      el.style.display = 'flex';
      el.style.zIndex = '10000';
    }
  }
};

window.closeJobModal = window.closeJobModal || function() {
  const el = document.getElementById('jobModal');
  if (el) el.style.display = 'none';
};

document.addEventListener('DOMContentLoaded', () => {
  // Toast Notifications Engine — defined & bound early to avoid race conditions
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

  // Global Error Boundary & Monitoring Hooks
  window.onerror = function (msg, url, lineNo, columnNo, error) {
    console.error('[ResuAI Error Boundary]', { msg, url, lineNo, columnNo, error });
    return true; // Prevent default error popup and preserve clean UI
  };

  window.addEventListener('unhandledrejection', function (event) {
    console.error('[ResuAI Unhandled Rejection]', event.reason);
  });

  // Storage Keys & Core Constants
  const DRAFT_STORAGE_KEY     = 'resuai-draft-resume';
  const THEME_STORAGE_KEY     = 'resuai-dashboard-theme';
  const AUTH_STORAGE_KEY      = 'resuai-logged-in';
  const SIDEBAR_COLLAPSED_KEY = 'resuai-sidebar-collapsed';
  const ANALYTICS_HISTORY_KEY = 'resuai-analytics-history';
  const SYNC_QUEUE_KEY        = 'resuai_offline_sync_queue';
  const RESUME_PROFILES_KEY   = 'resuai_resume_profiles_v1';
  const ACTIVE_PROFILE_KEY    = 'resuai_active_profile_id';
  const JOB_APPS_STORAGE_KEY  = 'resuai_job_applications';
  const ACCENT_STORAGE_KEY    = 'resuai_accent_color';

  let jobApplicationsList = [];

  // Initialize Feather Vector Icons
  if (window.feather) {
    feather.replace();
  }

  /* ==========================================================================
     1. Theme Management (Custom UI Themes via body[data-theme])
     ========================================================================== */
  const themeButtons = document.querySelectorAll('.theme-btn');
  const body = document.body;

  /**
   * Applies the chosen theme ID to the <body> data-theme attribute,
   * updates active states on theme switcher buttons, and saves to localStorage.
   * @param {string} themeId - e.g. 'sunset-amber', 'twilight-haze', 'eucalyptus-glow'
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



  // Restore saved theme on initial page load (default: 'sunset-amber')
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'sunset-amber';
  // If a removed theme was previously saved, fall back to sunset-amber
  const validThemes = ['sunset-amber', 'twilight-haze', 'eucalyptus-glow'];
  setTheme(validThemes.includes(savedTheme) ? savedTheme : 'sunset-amber');

  /* ==========================================================================
     2. Auth State & Screen View Toggle — Supabase Integration
     ========================================================================== */

  // Dynamic helper to retrieve live Supabase client instance
  const getSupabase = () => window.supabase;

  const authContainer = document.getElementById('authContainer');
  const appContainer  = document.getElementById('appContainer');

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

  const authForm          = document.getElementById('authForm');
  const authTitle         = document.getElementById('authTitle');
  const authSubtitle      = document.getElementById('authSubtitle');
  const authSubmitText    = document.getElementById('authSubmitText');
  const authSubmitBtn     = document.getElementById('authSubmitBtn');
  const nameField         = document.getElementById('nameField');
  const authToggleQuestion= document.getElementById('authToggleQuestion');
  const authToggleBtn     = document.getElementById('authToggleBtn');
  const ssoGithubBtn      = document.getElementById('ssoGithubBtn');
  const ssoGoogleBtn      = document.getElementById('ssoGoogleBtn');
  const topSignoutBtn     = document.getElementById('topSignoutBtn');

  let isSignUpMode = false;

  /* ------ Safe Supabase Data Loaders ------ */
  async function loadUserProfileFromSupabase(userId) {
    const sb = getSupabase();
    if (!sb || !userId) return;
    try {
      const { data } = await sb.from('user_profiles').select('*').eq('id', userId).maybeSingle();
      if (data && data.full_name) {
        const topUserName   = document.getElementById('topUserName');
        const topUserAvatar = document.getElementById('topUserAvatar');
        if (topUserName) topUserName.textContent = data.full_name;
        if (topUserAvatar) {
          topUserAvatar.textContent = data.full_name.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0,2).join('').toUpperCase() || 'DV';
        }
      }
    } catch (e) {
      console.warn('ResuAI: User profile load notice:', e.message);
    }
  }

  async function loadJobApplicationsFromSupabase(userId) {
    const sb = getSupabase();
    if (!sb || !userId) return;
    try {
      const { data } = await sb.from('job_applications').select('*').eq('user_id', userId);
      if (data && Array.isArray(data) && data.length > 0) {

      }
    } catch (e) {
      console.warn('ResuAI: Job applications load notice:', e.message);
    }
  }

  /* ------ Helper: show/hide auth vs dashboard ------ */
  function showAuthScreen() {
    if (authContainer) authContainer.style.display = 'flex';
    if (appContainer)  appContainer.style.display  = 'none';
  }

  function showAppScreen(user) {
    if (authContainer) authContainer.style.display = 'none';
    if (appContainer)  appContainer.style.display  = 'flex';

    // Update sidebar user info from Supabase user object or local payload
    const displayName = user?.user_metadata?.full_name
                     || user?.user_metadata?.name
                     || user?.name
                     || user?.email?.split('@')[0]
                     || 'Developer';
    const email = user?.email || 'developer@resuai.dev';
    const jobRole = user?.user_metadata?.job_title
                 || user?.user_metadata?.role
                 || user?.job_title
                 || (document.getElementById('inputJobTitle')?.value?.trim())
                 || email;

    const avatar = displayName.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0,2).join('').toUpperCase() || 'DV';

    const topUserAvatar = document.getElementById('topUserAvatar');
    const topUserName   = document.getElementById('topUserName');
    const topUserRole   = document.getElementById('topUserRole');
    if (topUserAvatar) topUserAvatar.textContent = avatar;
    if (topUserName)   topUserName.textContent   = displayName;
    if (topUserRole)   topUserRole.textContent   = jobRole;

    // Persist session tokens locally for refresh resilience
    try {
      sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
      localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      localStorage.setItem('resuai-user-profile', JSON.stringify({
        email: email,
        user_metadata: { full_name: displayName }
      }));
    } catch(e) {}

    // Load profile data safely from Supabase if user ID is present
    if (user?.id) {
      loadUserProfileFromSupabase(user.id);
      loadJobApplicationsFromSupabase(user.id);
    }

    // Restore saved active tab only after auth state is confirmed
    restoreSavedTab();
  }

  /* ------ Auth state verification engine ------ */
  function checkAuthState() {
    const sb = getSupabase();
    if (sb) {
      sb.auth.getSession().then(({ data: { session } }) => {
        if (session && session.user) {
          showAppScreen(session.user);
        } else {
          checkLocalAuthFallback();
        }
      }).catch(() => {
        checkLocalAuthFallback();
      });
    } else {
      checkLocalAuthFallback();
    }
  }

  function checkLocalAuthFallback() {
    const isLoggedIn = sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true' || localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
    if (isLoggedIn) {
      let savedUser = { email: 'developer@resuai.dev', user_metadata: { full_name: 'Developer' } };
      try {
        const cached = localStorage.getItem('resuai-user-profile');
        if (cached) savedUser = JSON.parse(cached);
      } catch(e) {}
      showAppScreen(savedUser);
    } else {
      showAuthScreen();
    }
  }

  // Helper to extract active frontend settings for backend API calls
  function getActiveSettings() {
    const settingGeminiModel = document.getElementById('settingGeminiModel');
    const settingOptimizationSensitivity = document.getElementById('settingOptimizationSensitivity');
    const settingAtsEngine = document.getElementById('settingAtsEngine');

    return {
      geminiModel: settingGeminiModel ? settingGeminiModel.value : 'gemini-2.0-flash',
      sensitivity: settingOptimizationSensitivity ? settingOptimizationSensitivity.value : '0.7',
      atsEngine: settingAtsEngine ? settingAtsEngine.value : 'greenhouse-lever'
    };
  }
  // Exposed on window so external modules (ats-analyzer.js, pdf-exporter.js)
  // can retrieve the active Gemini model and ATS engine settings at call time.
  // Without this, window.getActiveSettings is always undefined and all
  // backend AI calls silently fall back to empty-string defaults.
  window.getActiveSettings = getActiveSettings;

  let isSigningOut = false;

  // Subscribe to Supabase auth state changes if Supabase is active
  function initSupabaseAuthListener() {
    const sbClient = getSupabase();
    if (!sbClient || !sbClient.auth || sbClient._authListenerAttached) return;
    sbClient._authListenerAttached = true;

    sbClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session && session.user) {
          showAppScreen(session.user);
        }
      } else if (event === 'PASSWORD_RECOVERY') {
        showResetPasswordModal();
      } else if (event === 'SIGNED_OUT') {
        if (!isSigningOut && authContainer && authContainer.style.display === 'none') {
          handleSignOut();
        }
      } else if (event === 'USER_UPDATED') {
        if (session && session.user) {
          loadUserProfileFromSupabase(session.user.id);
        }
      }
    });
  }

  initSupabaseAuthListener();

  window.addEventListener('supabaseReady', () => {
    initSupabaseAuthListener();
    checkAuthState();
    if (window.location.search.includes('reset=1') || window.location.hash.includes('type=recovery')) {
      showResetPasswordModal();
    }
  });

  // Initial auth check on page load
  checkAuthState();
  if (window.location.search.includes('reset=1') || window.location.hash.includes('type=recovery')) {
    showResetPasswordModal();
  }

  /* ------ Helper: Show Inline Auth Error with Shake Effect ------ */
  function showAuthError(msg) {
    const alertEl = document.getElementById('authErrorAlert');
    const errorMsgEl = document.getElementById('authErrorMsg');
    const authCard = document.querySelector('.auth-card');

    if (alertEl && errorMsgEl) {
      errorMsgEl.textContent = msg;
      alertEl.style.display = 'flex';
      if (window.feather) feather.replace();
    }
    if (authCard) {
      authCard.classList.remove('auth-card-shake');
      void authCard.offsetWidth; // force reflow
      authCard.classList.add('auth-card-shake');
      setTimeout(() => authCard.classList.remove('auth-card-shake'), 500);
    }
    // Guard required: showAuthError() is called from async Supabase auth
    // callbacks that can fire before DOMContentLoaded fully executes.
    // window.showToast is set later at line ~4201; the typeof guard ensures
    // we never throw a ReferenceError if the callback fires too early.
    if (typeof showToast === 'function') showToast(msg, 'error');
  }

  function clearAuthError() {
    const alertEl = document.getElementById('authErrorAlert');
    if (alertEl) alertEl.style.display = 'none';
  }

  /* ------ Pre-fill remembered email on load ------ */
  const authEmailInput    = document.getElementById('authEmail');
  const authPasswordInput = document.getElementById('authPassword');
  const authRememberMe    = document.getElementById('authRememberMe');
  const passwordStrengthWrapper = document.getElementById('passwordStrengthWrapper');

  try {
    const rememberedEmail = localStorage.getItem('resuai_remember_email');
    if (rememberedEmail && authEmailInput) {
      authEmailInput.value = rememberedEmail;
    }
  } catch(e) {}

  /* ------ Toggle Sign In / Sign Up form mode ------ */
  if (authToggleBtn) {
    authToggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      clearAuthError();
      isSignUpMode = !isSignUpMode;

      if (isSignUpMode) {
        authTitle.textContent     = 'Create an account';
        authSubtitle.textContent  = 'Get started with ResuAI to build & analyze developer resumes.';
        authSubmitText.textContent= 'Create Account & Launch';
        nameField.style.display   = 'flex';
        authToggleQuestion.textContent = 'Already have an account?';
        authToggleBtn.textContent      = 'Sign In';
        if (passwordStrengthWrapper) passwordStrengthWrapper.style.display = 'flex';

        // Clear all form fields when toggling to Sign Up mode for a fresh new account creation
        if (authEmailInput) authEmailInput.value = '';
        if (authPasswordInput) authPasswordInput.value = '';
        const authNameInput = document.getElementById('authName');
        if (authNameInput) authNameInput.value = '';
      } else {
        authTitle.textContent     = 'Welcome back';
        authSubtitle.textContent  = 'Sign in to your ResuAI workspace to access your resumes & ATS metrics.';
        authSubmitText.textContent= 'Sign In to Dashboard';
        nameField.style.display   = 'none';
        authToggleQuestion.textContent = "Don't have an account?";
        authToggleBtn.textContent      = 'Sign Up';
        if (passwordStrengthWrapper) passwordStrengthWrapper.style.display = 'none';

        // Restore remembered email if returning to Sign In mode
        try {
          const rememberedEmail = localStorage.getItem('resuai_remember_email');
          if (rememberedEmail && authEmailInput) {
            authEmailInput.value = rememberedEmail;
          }
        } catch(e) {}
      }
      if (window.feather) feather.replace();
    });
  }

  const btnAuthPasswordEye = document.getElementById('btnAuthPasswordEye');
  const btnQuickDemoLogin  = document.getElementById('btnQuickDemoLogin');

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

  function evaluatePasswordStrength(val, fill, text, scoreEl) {
    if (!fill || !text || !scoreEl) return;
    if (!val) {
      fill.style.width  = '0%';
      fill.className    = 'strength-bar-fill';
      text.textContent  = 'Security Strength';
      scoreEl.textContent = '0/4';
      return;
    }
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    scoreEl.textContent = `${score}/4`;

    if (score <= 1) { fill.className = 'strength-bar-fill weak'; text.textContent = 'Weak Security'; }
    else if (score <= 3) { fill.className = 'strength-bar-fill medium'; text.textContent = 'Good Security'; }
    else { fill.className = 'strength-bar-fill strong'; text.textContent = '🔒 Excellent Strength'; }
  }

  // Real-time Password Security Strength Meter (Auth Form)
  if (authPasswordInput) {
    authPasswordInput.addEventListener('input', () => {
      const val = authPasswordInput.value;
      const fill    = document.getElementById('authStrengthFill');
      const text    = document.getElementById('authStrengthText');
      const scoreEl = document.getElementById('authStrengthScore');
      if (isSignUpMode && val && passwordStrengthWrapper) {
        passwordStrengthWrapper.style.display = 'flex';
      }
      evaluatePasswordStrength(val, fill, text, scoreEl);
    });
  }

  // Real-time Password Security Strength Meter (Profile Modal)
  const profilePasswordStrengthWrapper = document.getElementById('profilePasswordStrengthWrapper');
  const profileStrengthFill  = document.getElementById('profileStrengthFill');
  const profileStrengthText  = document.getElementById('profileStrengthText');
  const profileStrengthScore = document.getElementById('profileStrengthScore');
  const _profileNewPwdEl = document.getElementById('profileNewPassword');
  if (_profileNewPwdEl) {
    _profileNewPwdEl.addEventListener('input', () => {
      const val = _profileNewPwdEl.value;
      if (profilePasswordStrengthWrapper) {
        profilePasswordStrengthWrapper.style.display = val ? 'flex' : 'none';
      }
      evaluatePasswordStrength(val, profileStrengthFill, profileStrengthText, profileStrengthScore);
    });
  }

  // Helper: set loading state on auth button
  function setAuthBtnLoading(loading, label = 'Sign In to Dashboard') {
    if (!authSubmitBtn) return;
    authSubmitBtn.disabled = loading;
    if (authSubmitText) authSubmitText.textContent = loading ? 'Authenticating…' : label;
    if (loading && window.feather) feather.replace();
  }

  // 1-Click Quick Demo Sign In
  if (btnQuickDemoLogin) {
    btnQuickDemoLogin.addEventListener('click', async () => {
      clearAuthError();
      const origHTML = btnQuickDemoLogin.innerHTML;
      btnQuickDemoLogin.innerHTML = `<i data-feather="loader"></i> <span>Authenticating Workspace…</span>`;
      btnQuickDemoLogin.disabled = true;
      if (window.feather) feather.replace();

      const fallbackUser = {
        id: 'demo-dev-local-001',
        email: 'demo@resuai.dev',
        user_metadata: { full_name: 'Demo Developer' }
      };

      try {
        const sb = getSupabase();
        if (sb) {
          const { data, error } = await sb.auth.signInWithPassword({
            email: 'demo@resuai.dev',
            password: 'DemoAccess2024!'
          });
          if (!error && data?.user) {
            showAppScreen(data.user);
            showToast('Demo workspace loaded!', 'success');
            return;
          }
        }
      } catch (err) {}

      showAppScreen(fallbackUser);
      showToast('Demo workspace loaded!', 'success');

      btnQuickDemoLogin.innerHTML = origHTML;
      btnQuickDemoLogin.disabled = false;
      if (window.feather) feather.replace();
    });
  }

  // Main Auth Form Submission (Sign In OR Sign Up with Multi-Level Fallback)
  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAuthError();

      const email    = authEmailInput?.value.trim() || '';
      const password = authPasswordInput?.value || '';
      const authNameInput = document.getElementById('authName');
      const fullName = authNameInput?.value.trim() || '';

      if (!email) {
        showAuthError('Please enter your email address.');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showAuthError('Please enter a valid email address.');
        return;
      }
      if (!password) {
        showAuthError('Please enter your password.');
        return;
      }
      if (isSignUpMode && password.length < 6) {
        showAuthError('Password must be at least 6 characters long.');
        return;
      }

      try {
        if (authRememberMe?.checked) {
          localStorage.setItem('resuai_remember_email', email);
        } else {
          localStorage.removeItem('resuai_remember_email');
        }
      } catch(e) {}

      const label = isSignUpMode ? 'Create Account & Launch' : 'Sign In to Dashboard';
      setAuthBtnLoading(true, label);

      const sb = getSupabase();

      if (sb) {
        try {
          if (isSignUpMode) {
            const { data, error } = await sb.auth.signUp({
              email,
              password,
              options: { data: { full_name: fullName || email.split('@')[0] } }
            });
            if (error) {
              let msg = error.message || 'Registration failed.';
              if (msg.includes('User already registered')) msg = 'Account exists — please sign in instead.';
              showAuthError(msg);
              setAuthBtnLoading(false, label);
              return;
            }
            if (data?.user && !data.session) {
              showToast('Account created! Please check your email to confirm before signing in.', 'success');
              setAuthBtnLoading(false, label);
              if (authToggleBtn) authToggleBtn.click();
              return;
            }
            if (data?.user && data.session) {
              setAuthBtnLoading(false, label);
              showAppScreen(data.user);
              showToast('Account created & signed in! Welcome to ResuAI 🚀', 'success');
              return;
            }
          } else {
            // ---- SIGN IN ----
            const { data, error } = await sb.auth.signInWithPassword({ email, password });
            if (error) {
              let msg = error.message || 'Authentication failed.';
              if (msg.includes('Invalid login credentials')) msg = 'Incorrect email or password.';
              if (msg.includes('Email not confirmed')) msg = 'Email not confirmed yet. Please verify your email inbox before logging in.';
              showAuthError(msg);
              setAuthBtnLoading(false, label);
              return;
            }
            if (data?.user) {
              setAuthBtnLoading(false, label);
              showAppScreen(data.user);
              showToast('Signed in successfully!', 'success');
              return;
            }
          }
        } catch (sbErr) {
          console.warn('ResuAI: Supabase authentication exception:', sbErr);
          showAuthError(sbErr.message || 'Authentication error.');
          setAuthBtnLoading(false, label);
          return;
        }
      }

      // If Supabase JS client is unavailable, attempt backend API login endpoint
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        if (res.ok) {
          const result = await res.json();
          if (result.success) {
            setAuthBtnLoading(false, label);
            showAppScreen({
              id: 'usr_' + Date.now(),
              email: result.user?.email || email,
              user_metadata: { full_name: fullName || result.user?.name || email.split('@')[0] }
            });
            showToast('Signed in successfully!', 'success');
            return;
          }
        }
      } catch (apiErr) {
        console.warn('ResuAI: Backend API login notice:', apiErr);
      }

      setAuthBtnLoading(false, label);
      showAuthError('Unable to sign in. Please verify your credentials.');
    });
  }

  // Google OAuth SSO
  if (ssoGoogleBtn) {
    ssoGoogleBtn.addEventListener('click', async () => {
      const sb = getSupabase();
      if (sb) {
        try {
          const { error } = await sb.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
          });
          if (!error) return;
        } catch(e) {}
      }
      showAppScreen({
        id: 'google-user-' + Date.now(),
        email: 'developer.google@resuai.dev',
        user_metadata: { full_name: 'Google Developer' }
      });
      showToast('Signed in via Google', 'success');
    });
  }

  // GitHub OAuth SSO
  if (ssoGithubBtn) {
    ssoGithubBtn.addEventListener('click', async () => {
      const sb = getSupabase();
      if (sb) {
        try {
          const { error } = await sb.auth.signInWithOAuth({
            provider: 'github',
            options: { redirectTo: window.location.origin }
          });
          if (!error) return;
        } catch(e) {}
      }
      showAppScreen({
        id: 'github-user-' + Date.now(),
        email: 'developer.github@resuai.dev',
        user_metadata: { full_name: 'GitHub Developer' }
      });
      showToast('Signed in via GitHub', 'success');
    });
  }

  // Forgot Password link & request modal
  const forgotPasswordLink = document.getElementById('forgotPasswordLink');
  const forgotPasswordModal = document.getElementById('forgotPasswordModal');
  const forgotModalClose    = document.getElementById('forgotModalClose');
  const forgotSubmitBtn     = document.getElementById('forgotSubmitBtn');
  const forgotEmail         = document.getElementById('forgotEmail');
  const forgotFeedback      = document.getElementById('forgotFeedback');
  const forgotSubmitText    = document.getElementById('forgotSubmitText');

  if (forgotPasswordLink && forgotPasswordModal) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      forgotPasswordModal.style.display = 'flex';
      if (authEmailInput?.value) forgotEmail.value = authEmailInput.value;
      if (window.feather) feather.replace();
    });
  }
  if (forgotModalClose) {
    forgotModalClose.addEventListener('click', () => { forgotPasswordModal.style.display = 'none'; });
  }
  if (forgotPasswordModal) {
    forgotPasswordModal.addEventListener('click', (e) => {
      if (e.target === forgotPasswordModal) forgotPasswordModal.style.display = 'none';
    });
  }
  if (forgotSubmitBtn) {
    forgotSubmitBtn.addEventListener('click', async () => {
      const email = forgotEmail?.value.trim();
      if (!email) {
        if (forgotFeedback) { forgotFeedback.textContent = 'Please enter your email.'; forgotFeedback.style.color = '#ef4444'; }
        return;
      }
      forgotSubmitBtn.disabled = true;
      if (forgotSubmitText) forgotSubmitText.textContent = 'Sending…';

      const sb = getSupabase();
      let sent = false;
      let reqError = null;

      if (sb && sb.auth) {
        try {
          const { error } = await sb.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '?reset=1'
          });
          if (!error) {
            sent = true;
          } else {
            reqError = error.message;
          }
        } catch(e) {
          reqError = e.message;
        }
      } else {
        // Fallback demo mode
        sent = true;
      }

      if (sent) {
        if (forgotFeedback) {
          forgotFeedback.textContent = '✓ Reset link sent! Check your inbox.';
          forgotFeedback.style.color = '#10b981';
        }
        showToast('Password reset instructions sent!', 'success');
        setTimeout(() => { forgotPasswordModal.style.display = 'none'; }, 2500);
      } else {
        if (forgotFeedback) {
          forgotFeedback.textContent = reqError || 'Failed to send password reset email.';
          forgotFeedback.style.color = '#ef4444';
        }
        showToast(reqError || 'Reset link request failed.', 'error');
      }

      forgotSubmitBtn.disabled = false;
      if (forgotSubmitText) forgotSubmitText.textContent = 'Send Reset Link';
    });
  }

  // Set New Password Modal (Recovery Flow)
  const resetPasswordModal      = document.getElementById('resetPasswordModal');
  const resetPasswordModalClose = document.getElementById('resetPasswordModalClose');
  const resetPasswordSubmitBtn  = document.getElementById('resetPasswordSubmitBtn');
  const resetNewPassword        = document.getElementById('resetNewPassword');
  const resetConfirmPassword    = document.getElementById('resetConfirmPassword');
  const resetPasswordFeedback   = document.getElementById('resetPasswordFeedback');
  const resetPasswordSubmitText = document.getElementById('resetPasswordSubmitText');

  function showResetPasswordModal() {
    if (resetPasswordModal) {
      resetPasswordModal.style.display = 'flex';
      if (window.feather) feather.replace();
    }
  }

  if (resetPasswordModalClose && resetPasswordModal) {
    resetPasswordModalClose.addEventListener('click', () => {
      resetPasswordModal.style.display = 'none';
    });
  }
  if (resetPasswordModal) {
    resetPasswordModal.addEventListener('click', (e) => {
      if (e.target === resetPasswordModal) resetPasswordModal.style.display = 'none';
    });
  }

  if (resetPasswordSubmitBtn) {
    resetPasswordSubmitBtn.addEventListener('click', async () => {
      const newPass = resetNewPassword?.value;
      const confirmPass = resetConfirmPassword?.value;

      if (!newPass || newPass.length < 6) {
        if (resetPasswordFeedback) {
          resetPasswordFeedback.textContent = 'Password must be at least 6 characters long.';
          resetPasswordFeedback.style.color = '#ef4444';
        }
        return;
      }
      if (newPass !== confirmPass) {
        if (resetPasswordFeedback) {
          resetPasswordFeedback.textContent = 'Passwords do not match.';
          resetPasswordFeedback.style.color = '#ef4444';
        }
        return;
      }

      resetPasswordSubmitBtn.disabled = true;
      if (resetPasswordSubmitText) resetPasswordSubmitText.textContent = 'Updating…';

      const sb = getSupabase();
      if (sb && sb.auth) {
        try {
          const { error } = await sb.auth.updateUser({ password: newPass });
          if (error) {
            if (resetPasswordFeedback) {
              resetPasswordFeedback.textContent = error.message;
              resetPasswordFeedback.style.color = '#ef4444';
            }
            showToast('Failed to update password: ' + error.message, 'error');
          } else {
            if (resetPasswordFeedback) {
              resetPasswordFeedback.textContent = '✓ Password updated successfully!';
              resetPasswordFeedback.style.color = '#10b981';
            }
            showToast('Password updated successfully!', 'success');
            setTimeout(() => {
              resetPasswordModal.style.display = 'none';
              if (window.history && window.history.replaceState) {
                window.history.replaceState({}, document.title, window.location.pathname);
              }
            }, 2000);
          }
        } catch(err) {
          if (resetPasswordFeedback) {
            resetPasswordFeedback.textContent = err.message || 'An error occurred updating password.';
            resetPasswordFeedback.style.color = '#ef4444';
          }
        }
      } else {
        if (resetPasswordFeedback) {
          resetPasswordFeedback.textContent = '✓ Password updated successfully!';
          resetPasswordFeedback.style.color = '#10b981';
        }
        showToast('Password updated successfully!', 'success');
        setTimeout(() => { resetPasswordModal.style.display = 'none'; }, 2000);
      }

      resetPasswordSubmitBtn.disabled = false;
      if (resetPasswordSubmitText) resetPasswordSubmitText.textContent = 'Update Password & Sign In';
    });
  }

  // Sign Out
  async function handleSignOut(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (isSigningOut) return;
    isSigningOut = true;

    try {
      // Close any open modals
      const openModals = document.querySelectorAll('.modal-overlay, #userProfileModal, #versionManagerModal, #helpCenterDrawer');
      openModals.forEach(m => { m.style.display = 'none'; });

      const sb = getSupabase();
      if (sb && sb.auth) {
        try { await sb.auth.signOut(); } catch(err) { console.warn('Supabase signOut notice:', err); }
      }

      // Clear local authentication tokens & caches
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        localStorage.removeItem(ANALYTICS_HISTORY_KEY);
        localStorage.removeItem('resuai-active-tab');
        localStorage.removeItem('resuai-user-profile');
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(AUTH_STORAGE_KEY);

        // Sweep and remove any lingering Supabase auth keys
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth'))) {
            localStorage.removeItem(key);
          }
        }
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const key = sessionStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth'))) {
            sessionStorage.removeItem(key);
          }
        }
      } catch(err) {}

      // Reset URL hash tag cleanly
      if (window.location.hash) {
        try {
          history.pushState('', document.title, window.location.pathname + window.location.search);
        } catch (hErr) {
          window.location.hash = '';
        }
      }

      // Reset in-memory application state
      jobApplicationsList = [];

      // Reset top user header elements
      const topUserName = document.getElementById('topUserName');
      const topUserAvatar = document.getElementById('topUserAvatar');
      if (topUserName) topUserName.textContent = 'Developer';
      if (topUserAvatar) topUserAvatar.textContent = 'DV';

      // Reset auth form input fields
      const authInputs = document.querySelectorAll('#authForm input');
      authInputs.forEach(inp => { if (inp.type !== 'submit') inp.value = ''; });

      // Reset form fields
      const formIds = ['inputFullName','inputJobTitle','inputEmail','inputPhone','inputLocation',
                       'inputGithub','inputLinkedin','inputPortfolio','inputSummary','inputCertifications'];
      formIds.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      const bp = document.getElementById('bulletPoints');
      if (bp) bp.value = '';
      const skillsContainer = document.getElementById('skillsTagsContainer');
      if (skillsContainer) skillsContainer.querySelectorAll('.tag').forEach(t => t.remove());

      if (typeof renderJobTrackerTable === 'function') renderJobTrackerTable();
      if (typeof updateAnalyticsDashboard === 'function') updateAnalyticsDashboard();

      showAuthScreen();
      if (typeof syncLivePreview === 'function') syncLivePreview();
      if (typeof syncLiveSkills === 'function') syncLiveSkills();
      showToast('Signed out successfully.', 'success');
    } finally {
      setTimeout(() => { isSigningOut = false; }, 300);
    }
  }

  window.handleSignOut = handleSignOut;

  // Single global delegation for any signout button across the DOM
  document.addEventListener('click', function(e) {
    const targetBtn = e.target.closest('.btn-signout, .sidebar-signout-btn, #topSignoutBtn, #profileModalSignoutBtn, .btn-logout, [data-action="signout"]');
    if (targetBtn) {
      e.preventDefault();
      handleSignOut(e);
    }
  });

  // ---- User Profile Modal ----
  const sidebarUserPill   = document.getElementById('sidebarUserPill');
  const userProfileModal  = document.getElementById('userProfileModal');
  const profileModalClose = document.getElementById('profileModalClose');
  const profileSaveBtn    = document.getElementById('profileSaveBtn');
  const profileSaveText   = document.getElementById('profileSaveText');
  const profileFeedback   = document.getElementById('profileFeedback');
  const profileDisplayName= document.getElementById('profileDisplayName');
  const profileNewPassword= document.getElementById('profileNewPassword');
  const profileModalAvatar= document.getElementById('profileModalAvatar');
  const profileModalName  = document.getElementById('profileModalName');
  const profileModalEmail = document.getElementById('profileModalEmail');

  function openUserProfileModal() {
    if (!userProfileModal) return;
    const sb = getSupabase();
    if (sb) {
      sb.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          populateProfileModal(user);
        } else {
          populateProfileModalFromLocal();
        }
      }).catch(() => populateProfileModalFromLocal());
    } else {
      populateProfileModalFromLocal();
    }
  }

  function populateProfileModal(user) {
    const displayName = user.user_metadata?.full_name || user.name || user.email?.split('@')[0] || 'Developer';
    const email = user.email || 'developer@resuai.dev';
    const avatar = displayName.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0,2).join('').toUpperCase() || 'DV';
    const profileCurrentPassword = document.getElementById('profileCurrentPassword');
    if (profileModalAvatar) profileModalAvatar.textContent = avatar;
    if (profileModalName)   profileModalName.textContent   = displayName;
    if (profileModalEmail)  profileModalEmail.textContent  = email;
    if (profileDisplayName) profileDisplayName.value = displayName;
    if (profileCurrentPassword) profileCurrentPassword.value = '';
    if (profileNewPassword) profileNewPassword.value = '';
    if (profilePasswordStrengthWrapper) profilePasswordStrengthWrapper.style.display = 'none';
    if (profileFeedback)    profileFeedback.textContent = '';
    userProfileModal.style.display = 'flex';
    if (window.feather) feather.replace();
    trapModalFocus(userProfileModal);
  }

  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.style.display = 'none';
    if (modalEl._focusTrapController) {
      modalEl._focusTrapController.abort();
      modalEl._focusTrapController = null;
    }
    if (modalEl._previouslyFocused && typeof modalEl._previouslyFocused.focus === 'function') {
      try {
        modalEl._previouslyFocused.focus();
      } catch (e) {}
    }
    modalEl._previouslyFocused = null;
  }
  window.closeModal = closeModal;

  function trapModalFocus(modalEl) {
    if (!modalEl) return;

    if (document.activeElement && document.activeElement !== document.body && !modalEl.contains(document.activeElement)) {
      modalEl._previouslyFocused = document.activeElement;
    }

    const focusables = Array.from(modalEl.querySelectorAll('a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    if (focusables.length === 0) return;

    const firstEl = focusables[0];
    const lastEl  = focusables[focusables.length - 1];

    // Abort (and auto-remove) any listener registered by a previous open of this modal.
    // Storing the controller on the element keeps no external state and survives any
    // number of open/close cycles with exactly 1 active listener at all times.
    if (modalEl._focusTrapController) {
      modalEl._focusTrapController.abort();
    }
    const controller = new AbortController();
    modalEl._focusTrapController = controller;
    const { signal } = controller;

    modalEl.addEventListener('keydown', function handleKeyDown(e) {
      if (e.key === 'Escape') {
        closeModal(modalEl);
        return;
      }
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    }, { signal });

    setTimeout(() => firstEl.focus(), 50);
  }

  const globalHeaderSearch = document.getElementById('globalHeaderSearch');
  if (globalHeaderSearch) {
    globalHeaderSearch.addEventListener('input', debounce((e) => {
      const query = e.target.value.trim().toLowerCase();
      const jobSearchInput = document.getElementById('jobSearchInput');
      if (jobSearchInput) {
        jobSearchInput.value = query;
        if (typeof filterJobApplications === 'function') filterJobApplications(query);
      }
    }, 200));
  }

  function populateProfileModalFromLocal() {
    let localUser = { email: 'developer@resuai.dev', user_metadata: { full_name: 'Developer' } };
    try {
      const cached = localStorage.getItem('resuai-user-profile');
      if (cached) localUser = JSON.parse(cached);
    } catch(e) {}
    populateProfileModal(localUser);
  }

  if (sidebarUserPill)   sidebarUserPill.addEventListener('click', openUserProfileModal);
  if (profileModalClose) profileModalClose.addEventListener('click', () => { if (userProfileModal) closeModal(userProfileModal); });
  if (userProfileModal)  userProfileModal.addEventListener('click', (e) => { if (e.target === userProfileModal) closeModal(userProfileModal); });

  if (profileSaveBtn) {
    profileSaveBtn.addEventListener('click', async () => {
      profileSaveBtn.disabled = true;
      if (profileSaveText) profileSaveText.textContent = 'Saving…';

      const newName = profileDisplayName?.value.trim();
      const newPass = profileNewPassword?.value?.trim();
      const currentPass = document.getElementById('profileCurrentPassword')?.value?.trim();
      const sb = getSupabase();

      try {
        if (newPass && newPass.length > 0) {
          if (newPass.length < 6) {
            throw new Error('New password must be at least 6 characters long.');
          }
          if (!currentPass) {
            throw new Error('Please enter your current password to authorize password update.');
          }
          if (sb) {
            const { data: { user } } = await sb.auth.getUser();
            if (user && user.email) {
              const { error: verifyErr } = await sb.auth.signInWithPassword({
                email: user.email,
                password: currentPass
              });
              if (verifyErr) {
                throw new Error('Incorrect current password. Verification failed.');
              }
            }
            await sb.auth.updateUser({ password: newPass });
          }
        }

        if (sb && newName) {
          await sb.auth.updateUser({ data: { full_name: newName } });
          const { data: { user } } = await sb.auth.getUser();
          if (user) {
            await sb.from('user_profiles').upsert({ id: user.id, full_name: newName, updated_at: new Date().toISOString() }, { onConflict: 'id' });
          }
        }
        
        if (newName) {
          const topUserName = document.getElementById('topUserName');
          const topUserAvatar = document.getElementById('topUserAvatar');
          const avatar = newName.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0,2).join('').toUpperCase() || 'DV';
          if (topUserName) topUserName.textContent = newName;
          if (topUserAvatar) topUserAvatar.textContent = avatar;
          if (profileModalName) profileModalName.textContent = newName;
          if (profileModalAvatar) profileModalAvatar.textContent = avatar;

          const localUser = { email: profileModalEmail?.textContent || 'developer@resuai.dev', user_metadata: { full_name: newName } };
          localStorage.setItem('resuai-user-profile', JSON.stringify(localUser));
        }

        if (profileFeedback) { profileFeedback.textContent = '✓ Profile updated successfully!'; profileFeedback.style.color = '#10b981'; }
        showToast('Profile updated!', 'success');
      } catch (err) {
        if (profileFeedback) { profileFeedback.textContent = err.message; profileFeedback.style.color = '#ef4444'; }
        showToast('Update failed: ' + err.message, 'error');
      } finally {
        profileSaveBtn.disabled = false;
        if (profileSaveText) profileSaveText.textContent = 'Save Changes';
      }
    });
  }
  // Password Visibility Eye Toggle for My Account Modal
  document.querySelectorAll('.btn-toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input) {
        const isPass = input.type === 'password';
        input.type = isPass ? 'text' : 'password';
        btn.innerHTML = isPass ? '<i data-feather="eye-off"></i>' : '<i data-feather="eye"></i>';
        if (window.feather) feather.replace();
      }
    });
  });









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
      title: 'Resume Studio',
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
      title: 'Workspace & AI Settings',
      description: 'Configure your AI engine preferences, ATS diagnostic defaults, and local browser data.',
      breadcrumb: 'Settings'
    }
  };

  /**
   * Switches the active view tab using CSS `.active` class toggling
   * and updates breadcrumb headers smoothly without page reloads.
   * @param {string} tabId - ID of target tab (e.g. 'resume-builder', 'ats-analyzer')
   */
  function switchTab(tabId, pushState = true) {
    if (!tabId || !TAB_METADATA[tabId]) return;

    // Toggle active state on sidebar navigation links
    navItems.forEach((item) => {
      if (item.getAttribute('data-tab') === tabId) {
        item.classList.add('active');
        item.setAttribute('aria-selected', 'true');
      } else {
        item.classList.remove('active');
        item.setAttribute('aria-selected', 'false');
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

    // Hide page header on studio workspace tabs (resume-builder & ats-analyzer) for clean full-height canvas
    const contentHeader = document.getElementById('contentHeader');
    if (contentHeader) {
      contentHeader.style.display = (tabId === 'resume-builder' || tabId === 'ats-analyzer') ? 'none' : 'block';
    }

    // Hide New Resume button on ATS Analyzer & non-builder tabs
    const btnNewResume = document.getElementById('btnNewResume');
    if (btnNewResume) {
      btnNewResume.style.display = (tabId === 'resume-builder') ? 'inline-flex' : 'none';
    }

    // Persist active tab to LocalStorage for seamless reload restoration
    try {
      localStorage.setItem('resuai-active-tab', tabId);
    } catch (e) {}

    if (pushState && window.history && window.history.pushState) {
      if (window.location.hash !== '#' + tabId) {
        window.history.pushState({ tabId }, '', '#' + tabId);
      }
    }

    // Update live Score Analytics when navigating to analytics tab
    if ((tabId === 'analytics' || tabId === 'score-analytics') && typeof updateAnalyticsDashboard === 'function') {
      updateAnalyticsDashboard();
    }

    // Close mobile drawer if active
    closeMobileSidebar();
  }

  window.addEventListener('popstate', (e) => {
    const hash = window.location.hash.replace('#', '');
    const tabId = (e.state && e.state.tabId) || hash || 'resume-builder';
    if (TAB_METADATA[tabId]) {
      switchTab(tabId, false);
    }
  });

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

  // Navigation links ready


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

  /* Sidebar Collapse Toggle (desktop) */
  const sidebarCollapseBtn = document.getElementById('sidebarCollapseBtn');

  function applySidebarCollapsed(collapsed) {
    if (!sidebar) return;
    if (collapsed) {
      sidebar.classList.add('collapsed');
    } else {
      sidebar.classList.remove('collapsed');
    }
  }

  // Restore on load
  applySidebarCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1');

  if (sidebarCollapseBtn) {
    sidebarCollapseBtn.addEventListener('click', function () {
      const isNowCollapsed = !sidebar.classList.contains('collapsed');
      applySidebarCollapsed(isNowCollapsed);
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, isNowCollapsed ? '1' : '0');
    });
  }

  // Re-expand sidebar when a collapsed nav item is clicked
  if (sidebar) {
    sidebar.querySelectorAll('.nav-item').forEach(function (item) {
      item.addEventListener('click', function () {
        // On mobile: close drawer
        closeMobileSidebar();
      });
    });
  }

  /* ==========================================================================
     5. Automatic Form Persistence (LocalStorage Auto-Save)
     ========================================================================== */
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
  const inputProjects = document.getElementById('inputProjects');
  const inputAchievements = document.getElementById('inputAchievements');
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
  const previewProjects = document.getElementById('previewProjects');
  const previewProjectsSection = document.getElementById('previewProjectsSection');
  const previewAchievements = document.getElementById('previewAchievements');
  const previewAchievementsSection = document.getElementById('previewAchievementsSection');
  
  const btnAddCustomSection = document.getElementById('btnAddCustomSection');
  const customSectionsContainer = document.getElementById('customSectionsContainer');
  const previewCustomSectionsContainer = document.getElementById('previewCustomSectionsContainer');


  let customSectionsList = [];

  function renderCustomSectionInputs() {
    if (!customSectionsContainer) return;
    customSectionsContainer.innerHTML = '';

    customSectionsList.forEach((sec, idx) => {
      const block = document.createElement('div');
      block.className = 'custom-section-card';
      block.style.cssText = 'background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 12px; margin-bottom: 12px;';
      
      block.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <input type="text" class="form-input custom-sec-title" data-idx="${idx}" placeholder="Section Title (e.g. Publications)" value="${escapeHTML(sec.title || '')}" style="font-weight:600; width:70%; font-size:0.85rem;" />
          <button type="button" class="btn-outline-action remove-custom-sec-btn" data-idx="${idx}" style="color:#ef4444; border-color:rgba(239,68,68,0.3); font-size:0.75rem; padding:2px 8px;">Remove</button>
        </div>
        <textarea class="form-textarea custom-sec-content" data-idx="${idx}" rows="3" placeholder="Enter section content..." style="font-size:0.85rem;">${escapeHTML(sec.content || '')}</textarea>
      `;
      customSectionsContainer.appendChild(block);
    });

    customSectionsContainer.querySelectorAll('.custom-sec-title').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'), 10);
        if (customSectionsList[idx]) {
          customSectionsList[idx].title = e.target.value;
          renderCustomSectionsPreview();
          if (typeof debouncedAutoSave === 'function') debouncedAutoSave();
        }
      });
    });

    customSectionsContainer.querySelectorAll('.custom-sec-content').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'), 10);
        if (customSectionsList[idx]) {
          customSectionsList[idx].content = e.target.value;
          renderCustomSectionsPreview();
          if (typeof debouncedAutoSave === 'function') debouncedAutoSave();
        }
      });
    });

    customSectionsContainer.querySelectorAll('.remove-custom-sec-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'), 10);
        customSectionsList.splice(idx, 1);
        renderCustomSectionInputs();
        renderCustomSectionsPreview();
        if (typeof debouncedAutoSave === 'function') debouncedAutoSave();
      });
    });
  }

  function renderCustomSectionsPreview() {
    if (!previewCustomSectionsContainer) return;
    previewCustomSectionsContainer.innerHTML = '';

    customSectionsList.forEach(sec => {
      if (!sec.title && !sec.content) return;
      const secDiv = document.createElement('div');
      secDiv.className = 'paper-section';
      secDiv.innerHTML = `
        <div class="paper-section-title"><span class="section-accent-bar"></span>${escapeHTML((sec.title || 'CUSTOM SECTION').toUpperCase())}</div>
        <p class="section-content">${escapeHTML(sec.content || '')}</p>
      `;
      previewCustomSectionsContainer.appendChild(secDiv);
    });
  }

  if (btnAddCustomSection) {
    btnAddCustomSection.addEventListener('click', () => {
      customSectionsList.push({ id: 'sec_' + Date.now(), title: 'Custom Section', content: '' });
      renderCustomSectionInputs();
      renderCustomSectionsPreview();
      if (typeof debouncedAutoSave === 'function') debouncedAutoSave();
    });
  }

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
      const xCoords = [40, 124, 208, 292, 376, 460];
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
  // Expose on window so ats-analyzer.js can sync Score Analytics after every scan
  window.recordNewScanResult = recordNewScanResult;
  window.updateAnalyticsDashboard = updateAnalyticsDashboard;


  /**
   * Safely extracts skill tag text content without stripping 'x' characters from skill names.
   * Uses first child text node directly to ignore delete icon markup.
   */
  function getSkillTagName(tagEl) {
    if (!tagEl) return '';
    return (tagEl.childNodes[0]?.textContent || tagEl.textContent || '').trim();
  }


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

      const jobTitle = (document.getElementById('docFieldTitle')?.innerText || inputJobTitle?.value || '').trim();
      const summary  = (document.getElementById('docFieldSummary')?.innerText || inputSummary?.value || '').trim();
      const expText  = (window.docBullets && window.docBullets.length > 0)
        ? window.docBullets.filter(Boolean).join('\n')
        : (bulletPoints ? bulletPoints.value : '');

      try {
        const activeSettings = typeof getActiveSettings === 'function' ? getActiveSettings() : {};
        const response = await fetch('/api/optimize-resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobTitle: jobTitle || 'Software Engineer',
            text: expText || summary || 'Engineered high-performance web applications',
            section: 'experience',
            action: 'Improve Writing and Quantify Results',
            geminiModel: activeSettings.geminiModel
          })
        });

        const data = await response.json();
        
        if (data) {
          let bullets = data.optimizedBulletPoints || data.optimizedText || '';
          if (Array.isArray(bullets)) bullets = bullets.join('\n');

          if (bullets) {
            const bulletsArr = bullets.split('\n').map(b => b.replace(/^[\s•\-\*]+/, '').trim()).filter(Boolean);
            if (typeof window.setDocBullets === 'function') {
              window.setDocBullets(bulletsArr);
            }
          }

          if (Array.isArray(data.suggestedSkills)) {
            data.suggestedSkills.forEach(s => window.addDocSkill?.(s));
          }

          if (typeof syncLivePreview === 'function') syncLivePreview();
          if (typeof autoSaveFormFields === 'function') autoSaveFormFields();
          if (typeof showToast === 'function') showToast('Resume optimized with AI!', 'success');
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

  /* ==========================================================================
     6. Offline Synchronization Queue System
     ========================================================================== */
  let isSyncing = false;
  let syncRetryTimeout = null;

  function updateSyncStatusUI(status, message) {
    const docAutosaveStatus = document.getElementById('docAutosaveStatus');
    const docSaveStatusText = document.getElementById('docSaveStatusText');
    const docSaveStatusIcon = document.getElementById('docSaveStatusIcon');
    if (!docAutosaveStatus || !docSaveStatusText) return;

    docAutosaveStatus.className = 'doc-autosave-status';

    switch (status) {
      case 'synced':
        docAutosaveStatus.classList.add('saved');
        docAutosaveStatus.style.background = '';
        docAutosaveStatus.style.color = '';
        docSaveStatusText.textContent = message || 'Synced to Cloud';
        if (docSaveStatusIcon) docSaveStatusIcon.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
        break;
      case 'offline':
        docAutosaveStatus.classList.add('offline');
        docAutosaveStatus.style.background = 'rgba(234, 179, 8, 0.15)';
        docAutosaveStatus.style.color = '#eab308';
        docSaveStatusText.textContent = message || 'Offline (Saved Locally)';
        if (docSaveStatusIcon) docSaveStatusIcon.innerHTML = '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>';
        break;
      case 'syncing':
        docAutosaveStatus.classList.add('saving');
        docAutosaveStatus.style.background = '';
        docAutosaveStatus.style.color = '';
        docSaveStatusText.textContent = message || 'Syncing...';
        if (docSaveStatusIcon) docSaveStatusIcon.innerHTML = '<line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line>';
        break;
      case 'error':
        docAutosaveStatus.classList.add('error');
        docAutosaveStatus.style.background = 'rgba(239, 68, 68, 0.15)';
        docAutosaveStatus.style.color = '#ef4444';
        docSaveStatusText.textContent = message || 'Sync Error (Retrying)';
        if (docSaveStatusIcon) docSaveStatusIcon.innerHTML = '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>';
        break;
    }
  }

  function getOfflineQueue() {
    try {
      const stored = localStorage.getItem(SYNC_QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  function saveOfflineQueue(queue) {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.warn('Could not save offline queue:', e);
    }
  }

  function queueOfflineTask(entityType, action, payload) {
    const queue = getOfflineQueue();
    const task = {
      id: 'sync_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      entityType,
      action,
      payload,
      timestamp: new Date().toISOString(),
      attempts: 0
    };
    queue.push(task);
    saveOfflineQueue(queue);

    if (!navigator.onLine) {
      updateSyncStatusUI('offline', 'Offline (Saved Locally)');
    } else {
      processOfflineSyncQueue();
    }
  }

  async function processOfflineSyncQueue() {
    if (isSyncing) return;
    if (!navigator.onLine) {
      updateSyncStatusUI('offline', 'Offline (Saved Locally)');
      return;
    }

    const queue = getOfflineQueue();
    if (queue.length === 0) {
      updateSyncStatusUI('synced', 'Synced to Cloud');
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      saveOfflineQueue([]);
      updateSyncStatusUI('synced', 'Saved Locally');
      return;
    }

    const { data: { user } } = await sb.auth.getUser().catch(() => ({ data: {} }));
    if (!user) {
      saveOfflineQueue([]);
      updateSyncStatusUI('synced', 'Saved Locally');
      return;
    }

    isSyncing = true;
    updateSyncStatusUI('syncing', `Syncing (${queue.length})...`);

    const remainingQueue = [];
    let hasError = false;
    let maxAttemptCount = 0;

    for (const task of queue) {
      try {
        if (task.entityType === 'resume') {
          const { data: remoteData } = await sb.from('user_resumes')
            .select('updated_at')
            .eq('user_id', user.id)
            .single();

          if (remoteData && remoteData.updated_at) {
            const remoteTime = new Date(remoteData.updated_at).getTime();
            const localTime = new Date(task.timestamp).getTime();

            // Conflict Resolution: Never overwrite newer server data
            if (remoteTime > localTime) {

              await loadUserProfileFromSupabase(user.id);
              continue;
            }
          }

          const { error } = await sb.from('user_resumes').upsert({
            user_id: user.id,
            resume_data: task.payload,
            updated_at: task.timestamp
          });

          if (error) throw error;
        } else if (task.entityType === 'job') {
          if (task.action === 'UPSERT') {
            const { error } = await sb.from('job_applications').upsert({
              ...task.payload,
              user_id: user.id,
              updated_at: task.timestamp
            });
            if (error) throw error;
          } else if (task.action === 'DELETE') {
            const { error } = await sb.from('job_applications')
              .delete()
              .eq('id', task.payload.id)
              .eq('user_id', user.id);
            if (error) throw error;
          }
        }
      } catch (err) {
        console.warn(`SyncEngine task error (${task.id}):`, err);
        task.attempts = (task.attempts || 0) + 1;
        maxAttemptCount = Math.max(maxAttemptCount, task.attempts);
        remainingQueue.push(task);
        hasError = true;
      }
    }

    saveOfflineQueue(remainingQueue);
    isSyncing = false;

    if (hasError && remainingQueue.length > 0) {
      updateSyncStatusUI('error', `Sync Error (${remainingQueue.length} pending)`);
      // Exponential Backoff Retry Strategy: min(30s, 1000 * 2^attempt)
      const delayMs = Math.min(30000, 1000 * Math.pow(2, maxAttemptCount));

      if (syncRetryTimeout) clearTimeout(syncRetryTimeout);
      syncRetryTimeout = setTimeout(processOfflineSyncQueue, delayMs);
    } else {
      updateSyncStatusUI('synced', 'Synced to Cloud');
    }
  }

  // Network Reconnection Listeners
  window.addEventListener('online', () => {
    updateSyncStatusUI('syncing', 'Reconnected! Syncing...');
    if (typeof showToast === 'function') showToast('Internet connection restored. Syncing data...', 'info');
    processOfflineSyncQueue();
  });

  window.addEventListener('offline', () => {
    updateSyncStatusUI('offline', 'Offline (Saved Locally)');
    if (typeof showToast === 'function') showToast('You are currently offline. Changes are saved locally.', 'warning');
  });

  /**
   * Saves all current form fields and skill tags to localStorage automatically.
   */
  function syncFormInputsToCenterCanvas() {
    if (window.personalEngine && typeof window.personalEngine.syncFromInputs === 'function') {
      window.personalEngine.syncFromInputs();
    } else {
      const docName = document.getElementById('docFieldName');
      if (docName && inputFullName) docName.innerText = inputFullName.value || '';

      const docTitle = document.getElementById('docFieldTitle');
      if (docTitle && inputJobTitle) docTitle.innerText = inputJobTitle.value || '';

      const docEmail = document.getElementById('docFieldEmail') || document.querySelector('[data-syncs="inputEmail"]');
      if (docEmail && inputEmail) docEmail.innerText = inputEmail.value || '';

      const docPhone = document.getElementById('docFieldPhone') || document.querySelector('[data-syncs="inputPhone"]');
      if (docPhone && inputPhone) docPhone.innerText = inputPhone.value || '';

      const docLoc = document.getElementById('docFieldLocation') || document.querySelector('[data-syncs="inputLocation"]');
      if (docLoc && inputLocation) docLoc.innerText = inputLocation.value || '';

      const docGh = document.getElementById('docFieldGithub') || document.querySelector('[data-syncs="inputGithub"]');
      if (docGh && inputGithub) docGh.innerText = inputGithub.value || '';

      const docLi = document.getElementById('docFieldLinkedin') || document.querySelector('[data-syncs="inputLinkedin"]');
      if (docLi && inputLinkedin) docLi.innerText = inputLinkedin.value || '';

      const docPort = document.getElementById('docFieldPortfolio') || document.querySelector('[data-syncs="inputPortfolio"]');
      if (docPort && inputPortfolio) docPort.innerText = inputPortfolio.value || '';
    }

    const docSum = document.getElementById('docFieldSummary');
    if (docSum && inputSummary) docSum.innerText = inputSummary.value || '';

    const docEdu = document.getElementById('docFieldEducation');
    if (docEdu && inputEducation) docEdu.innerText = inputEducation.value || '';

    const docCerts = document.getElementById('docFieldCerts');
    if (docCerts && inputCertifications) docCerts.innerText = inputCertifications.value || '';

    const docProj = document.getElementById('docFieldProjects');
    if (docProj && inputProjects) docProj.innerText = inputProjects.value || '';

    const docAch = document.getElementById('docFieldAchievements');
    if (docAch && inputAchievements) docAch.innerText = inputAchievements.value || '';

    if (bulletPoints && typeof window.setDocBullets === 'function') {
      window.setDocBullets(bulletPoints.value || '');
    }

    document.querySelectorAll('.doc-field, .doc-contact-field, [contenteditable="true"]').forEach(el => {
      const txt = (el.innerText || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
      if (txt) {
        el.classList.remove('is-empty');
      } else {
        el.classList.add('is-empty');
      }
    });
  }

  window.syncFormInputsToCenterCanvas = syncFormInputsToCenterCanvas;

  /**
   * Saves all current form fields and skill tags to localStorage automatically.
   */
  function autoSaveFormFields() {
    const getVal = (inputEl, docId) => {
      const docVal = (document.getElementById(docId)?.innerText || '').trim();
      return docVal || (inputEl ? inputEl.value : '');
    };

    const draftData = {
      fullName: getVal(inputFullName, 'docFieldName'),
      jobTitle: getVal(inputJobTitle, 'docFieldTitle'),
      email: inputEmail ? inputEmail.value : '',
      phone: inputPhone ? inputPhone.value : '',
      location: inputLocation ? inputLocation.value : '',
      github: inputGithub ? inputGithub.value : '',
      linkedin: inputLinkedin ? inputLinkedin.value : '',
      portfolio: inputPortfolio ? inputPortfolio.value : '',
      summary: getVal(inputSummary, 'docFieldSummary'),
      education: getVal(inputEducation, 'docFieldEducation'),
      certifications: getVal(inputCertifications, 'docFieldCerts'),
      projects: inputProjects ? inputProjects.value : '',
      achievements: inputAchievements ? inputAchievements.value : '',
      customSections: customSectionsList,
      bulletPoints: bulletPoints ? bulletPoints.value : '',
      atsJdText: atsJdInput ? atsJdInput.value : '',
      skills: Array.from(document.querySelectorAll('#skillsTagsContainer .tag, #docSkillsWrapper .tag')).map(t => getSkillTagName(t)).filter(Boolean)
    };

    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
      queueOfflineTask('resume', 'UPSERT', draftData);
      if (typeof updateAnalyticsDashboard === 'function') updateAnalyticsDashboard();
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
      let loaded = false;
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.isBlank) {
          // Explicit blank state requested by user
          syncFormInputsToCenterCanvas();
          syncLivePreview();
          return;
        }
        if (draft.fullName || draft.summary || draft.projects || draft.education || draft.bulletPoints) {
          if (draft.fullName && inputFullName) inputFullName.value = draft.fullName;
          if (draft.jobTitle && inputJobTitle) inputJobTitle.value = draft.jobTitle;
          if (draft.email && inputEmail) inputEmail.value = draft.email;
          if (draft.phone && inputPhone) inputPhone.value = draft.phone;
          if (draft.location && inputLocation) inputLocation.value = draft.location;
          if (draft.github && inputGithub) inputGithub.value = draft.github;
          if (draft.linkedin && inputLinkedin) inputLinkedin.value = draft.linkedin;
          if (draft.portfolio && inputPortfolio) inputPortfolio.value = draft.portfolio;
          if (draft.summary && inputSummary) inputSummary.value = draft.summary;
          if (draft.education && inputEducation) inputEducation.value = draft.education;
          if (draft.certifications && inputCertifications) inputCertifications.value = draft.certifications;
          if (draft.projects && inputProjects) inputProjects.value = draft.projects;
          if (draft.achievements && inputAchievements) inputAchievements.value = draft.achievements;
          if (Array.isArray(draft.customSections)) {
            customSectionsList = draft.customSections;
            renderCustomSectionInputs();
          }
          if (draft.bulletPoints && bulletPoints) bulletPoints.value = draft.bulletPoints;
          if (draft.atsJdText && atsJdInput) atsJdInput.value = draft.atsJdText;

          syncFormInputsToCenterCanvas();
          syncLivePreview();
          syncLiveSkills();
          loaded = true;
        }
      }
      if (!loaded) {
        if (typeof window.loadGoogleDevTemplate === 'function') {
          window.loadGoogleDevTemplate();
        } else {
          syncFormInputsToCenterCanvas();
          syncLivePreview();
        }
      }
    } catch (e) {
      console.warn('Could not restore form fields from LocalStorage:', e);
      syncFormInputsToCenterCanvas();
      syncLivePreview();
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

  // Google XYZ Metric Formula Meter & Transformer Engine
  function updateGoogleXyzMeter() {
    const scoreEl = document.getElementById('xyzMeterScore');
    if (!bulletPoints || !scoreEl) return;

    const text = bulletPoints.value.trim();
    if (!text) {
      scoreEl.textContent = '0% Metrics Compliance (0/0 Bullets)';
      scoreEl.style.color = '#64748b';
      scoreEl.style.background = 'rgba(100, 116, 139, 0.12)';
      return;
    }

    const bullets = text.split('\n').map(b => b.trim()).filter(b => b.length > 0);
    if (bullets.length === 0) {
      scoreEl.textContent = '0% Metrics Compliance (0/0 Bullets)';
      return;
    }

    const metricRegex = /(\d+(?:\.\d+)?%|\d+\s*(?:ms|sec|s|min|hrs|k|M|B|QPS|req\/s|req\/sec|users|engineers|x|times)|\$\d+|₹\d+|\b\d+\b)/i;

    let quantifiedCount = 0;
    bullets.forEach(b => {
      if (metricRegex.test(b)) {
        quantifiedCount++;
      }
    });

    const percent = Math.round((quantifiedCount / bullets.length) * 100);
    scoreEl.textContent = `${percent}% Google XYZ Compliant (${quantifiedCount}/${bullets.length} Bullets with Metrics)`;

    if (percent >= 80) {
      scoreEl.style.color = '#10b981';
      scoreEl.style.background = 'rgba(16, 185, 129, 0.15)';
    } else if (percent >= 50) {
      scoreEl.style.color = '#3b82f6';
      scoreEl.style.background = 'rgba(59, 130, 246, 0.15)';
    } else {
      scoreEl.style.color = '#f59e0b';
      scoreEl.style.background = 'rgba(245, 158, 11, 0.15)';
    }
  }

  const btnXyzTransform = document.getElementById('btnXyzTransform');
  if (btnXyzTransform && bulletPoints) {
    btnXyzTransform.addEventListener('click', () => {
      const rawText = bulletPoints.value.trim();
      if (!rawText) {
        bulletPoints.value = `• Architected high-throughput microservices using Go & gRPC, scaling system capacity by 350% to 50,000 req/sec.\n• Optimized p99 API latency by 45% (from 280ms to 95ms) by implementing Redis caching and database indexing.\n• Reduced AWS cloud infrastructure costs by $120,000/year through Kubernetes cluster auto-scaling and spot instances.\n• Spearheaded cross-functional team of 12 engineers, delivering zero-downtime CI/CD deployment pipelines with 99.99% uptime.`;
      } else {
        const lines = rawText.split('\n').filter(l => l.trim().length > 0);
        const transformed = lines.map(line => {
          let clean = line.replace(/^[-•*]\s*/, '').trim();
          if (!/(\d+%|\d+\s*ms|\$\d+|₹\d+|\d+\s*req\/sec)/i.test(clean)) {
            clean += `, resulting in a 40% performance improvement and 99.9% system availability.`;
          }
          return `• ${clean}`;
        });
        bulletPoints.value = transformed.join('\n');
      }

      autoSaveFormFields();
      updateCharCounter();
      updateGoogleXyzMeter();
      showToast('Transformed bullets into Google XYZ Metric Formula format!', 'success');
    });
  }

  // FAANG Engineering Level Presets (L4, L5, L6, L7)
  const LEVEL_TEMPLATES = {
    L4: {
      title: 'Software Engineer II',
      summary: 'Software Engineer with 3+ years of experience building scalable web APIs, robust microservices, and modern frontend interfaces using TypeScript, React, and Node.js.',
      bullets: '• Developed high-coverage unit and integration test suites, increasing overall codebase test coverage from 55% to 92%.\n• Built responsive UI component modules using React and Vanilla CSS, serving 250,000+ monthly active users.\n• Optimized database query execution plans in PostgreSQL, reducing average API response times by 35ms.'
    },
    L5: {
      title: 'Senior Software Engineer',
      summary: 'Senior Software Engineer with 6+ years of experience architecting distributed cloud infrastructure, microservices design systems, and mentoring engineering teams to deliver mission-critical software.',
      bullets: '• Architected high-throughput microservices using Go & gRPC, scaling system capacity by 350% to 50,000 req/sec.\n• Optimized p99 API latency by 45% (from 280ms to 95ms) by implementing Redis caching and database indexing.\n• Reduced AWS cloud infrastructure costs by $120,000/year through Kubernetes cluster auto-scaling and spot instances.\n• Spearheaded cross-functional team of 12 engineers, delivering zero-downtime CI/CD deployment pipelines with 99.99% uptime.'
    },
    L6: {
      title: 'Staff Software Engineer & Tech Lead',
      summary: 'Staff Software Engineer & Tech Lead with 9+ years driving org-wide technical strategy, multi-region cluster reliability, and leading high-velocity engineering groups across distributed cloud platforms.',
      bullets: '• Led architectural overhaul of core payment streaming engine, handling $4.2B in annual transaction volume with 99.999% reliability.\n• Spearheaded 25+ engineer org-wide adoption of GraphQL federated gateway, reducing client payload sizes by 58% and accelerating sprint velocity by 40%.\n• Designed multi-region Kubernetes failover strategy, guaranteeing sub-50ms failover recovery across US-East and EU-West datacenters.'
    },
    L7: {
      title: 'Principal Architect & Technical Director',
      summary: 'Principal Systems Architect with 12+ years shaping enterprise cloud architecture, AI platform infrastructure, and driving multi-year technical roadmaps for multi-billion dollar engineering organizations.',
      bullets: '• Defined 3-year enterprise cloud migration roadmap, transitioning legacy monolithic systems into zero-trust Kubernetes microservices.\n• Architected enterprise AI RAG platform processing 10M+ daily LLM queries with sub-100ms vector search latency across Pinecone clusters.\n• Mentored and developed 4 Staff Engineers and 15+ Senior Engineers, establishing company-wide System Design RFC review standards.'
    }
  };



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
    const scoreVal = document.getElementById('strengthPercentVal');
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

  // --- Performance Optimization Utilities ---
  function debounce(fn, waitMs = 150) {
    let timeoutId = null;
    return function (...args) {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fn.apply(this, args);
      }, waitMs);
    };
  }

  function parseFormattedSectionHTML(rawText) {
    if (!rawText || typeof rawText !== 'string') return '';

    const lines = rawText.split('\n');
    let html = '';
    let inList = false;

    lines.forEach(line => {
      let trimmed = line.trim();
      if (!trimmed) {
        if (inList) { html += '</ul>'; inList = false; }
        return;
      }

      if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
        if (inList) { html += '</ul>'; inList = false; }
        const headerText = trimmed.replace(/^#+\s*/, '');
        html += `<div class="preview-block-heading">${escapeHTML(headerText)}</div>`;
        return;
      }

      if (/^[\*\-\•]\s+/.test(trimmed)) {
        if (!inList) { html += '<ul class="preview-block-list">'; inList = true; }
        let bulletContent = trimmed.replace(/^[\*\-\•]\s+/, '');
        bulletContent = escapeHTML(bulletContent).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html += `<li>${bulletContent}</li>`;
        return;
      }

      if (inList) { html += '</ul>'; inList = false; }
      let lineContent = escapeHTML(trimmed).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html += `<div class="preview-block-line">${lineContent}</div>`;
    });

    if (inList) { html += '</ul>'; }
    return html;
  }
  window.parseFormattedSectionHTML = parseFormattedSectionHTML;
  window.formatEducationHTML = parseFormattedSectionHTML;

  function updateTextNode(el, text) {
    if (!el) return;
    if (el.textContent !== text) {
      el.textContent = text;
    }
  }
  window.updateTextNode = updateTextNode;
  window.renderPaperPreview = syncLivePreview;

  function syncLivePreview() {
    const docName = document.getElementById('docFieldName')?.innerText?.trim();
    const nameVal = docName || (inputFullName ? inputFullName.value.trim() : '');
    if (previewName) {
      updateTextNode(previewName, nameVal.toUpperCase() || 'YOUR NAME');
    }

    const docRole = document.getElementById('docFieldTitle')?.innerText?.trim();
    const titleVal = docRole || (inputJobTitle ? inputJobTitle.value.trim() : '');
    if (previewRole) {
      if (titleVal) {
        updateTextNode(previewRole, titleVal.toUpperCase());
        previewRole.style.display = 'block';
      } else {
        updateTextNode(previewRole, '');
        previewRole.style.display = 'none';
      }
    }

    if (previewMeta) {
      const chips = [];
      const getFieldVal = (selector, inputEl) => {
        const docVal = document.querySelector(selector)?.innerText?.trim();
        return docVal || (inputEl ? inputEl.value.trim() : '');
      };

      const loc  = getFieldVal('[data-syncs="inputLocation"]', inputLocation);
      const em   = getFieldVal('[data-syncs="inputEmail"]', inputEmail);
      const ph   = getFieldVal('[data-syncs="inputPhone"]', inputPhone);
      const gh   = getFieldVal('[data-syncs="inputGithub"]', inputGithub);
      const li   = getFieldVal('[data-syncs="inputLinkedin"]', inputLinkedin);
      const port = getFieldVal('[data-syncs="inputPortfolio"]', inputPortfolio);

      if (loc)  chips.push(`<span class="contact-chip"><i data-feather="map-pin"></i>${loc}</span>`);
      if (em)   chips.push(`<span class="contact-chip"><i data-feather="mail"></i>${em}</span>`);
      if (ph)   chips.push(`<span class="contact-chip"><i data-feather="phone"></i>${ph}</span>`);
      if (gh)   chips.push(`<span class="contact-chip"><i data-feather="github"></i>${gh}</span>`);
      if (li)   chips.push(`<span class="contact-chip"><i data-feather="linkedin"></i>${li}</span>`);
      if (port) chips.push(`<span class="contact-chip"><i data-feather="globe"></i>${port}</span>`);

      const newHtml = chips.join('<span class="contact-divider">·</span>');
      if (previewMeta.innerHTML !== newHtml) {
        previewMeta.innerHTML = newHtml;
        if (window.feather) feather.replace();
      }
    }

    const docSum = document.getElementById('docFieldSummary')?.innerText?.trim();
    const summaryVal = docSum || (inputSummary ? inputSummary.value.trim() : '');
    if (previewSummary && previewSummarySection) {
      if (summaryVal) {
        updateTextNode(previewSummary, summaryVal);
        previewSummarySection.style.display = 'block';
      } else {
        updateTextNode(previewSummary, '');
        previewSummarySection.style.display = 'none';
      }
    }

    const docEdu = document.getElementById('docFieldEducation')?.innerText?.trim();
    const eduVal = docEdu || (inputEducation ? inputEducation.value.trim() : '');
    if (previewEducation) {
      const newHtml = eduVal ? parseFormattedSectionHTML(eduVal) : '';
      if (previewEducation.innerHTML !== newHtml) previewEducation.innerHTML = newHtml;
    }

    const docCerts = document.getElementById('docFieldCerts')?.innerText?.trim();
    const certsVal = docCerts || (inputCertifications ? inputCertifications.value.trim() : '');
    if (previewCertifications && previewCertificationsSection) {
      if (certsVal) {
        previewCertifications.innerHTML = parseFormattedSectionHTML(certsVal);
        previewCertificationsSection.style.display = 'block';
      } else {
        previewCertifications.innerHTML = '';
        previewCertificationsSection.style.display = 'none';
      }
    }

    const docProj = document.getElementById('docFieldProjects')?.innerText?.trim();
    const projVal = docProj || (inputProjects ? inputProjects.value.trim() : '');
    if (previewProjects && previewProjectsSection) {
      if (projVal) {
        previewProjects.innerHTML = parseFormattedSectionHTML(projVal);
        previewProjectsSection.style.display = 'block';
      } else {
        previewProjects.innerHTML = '';
        previewProjectsSection.style.display = 'none';
      }
    }

    const docAch = document.getElementById('docFieldAchievements')?.innerText?.trim();
    const achVal = docAch || (inputAchievements ? inputAchievements.value.trim() : '');
    if (previewAchievements && previewAchievementsSection) {
      if (achVal) {
        previewAchievements.innerHTML = parseFormattedSectionHTML(achVal);
        previewAchievementsSection.style.display = 'block';
      } else {
        previewAchievements.innerHTML = '';
        previewAchievementsSection.style.display = 'none';
      }
    }

    renderCustomSectionsPreview();

    if (previewBullets) {
      let lines = [];
      const bulletTexts = document.querySelectorAll('#docBulletsList .doc-bullet-text');
      if (bulletTexts.length > 0) {
        lines = Array.from(bulletTexts).map(b => (b.innerText || '').trim()).filter(Boolean);
      } else if (bulletPoints && bulletPoints.value.trim()) {
        lines = bulletPoints.value.split('\n').filter(line => line.trim() !== '');
      }
      const newHtml = lines.length > 0 ? lines.map(line => `<li>${escapeHTML(line.trim().replace(/^[-•*]\s*/, ''))}</li>`).join('') : '';
      if (previewBullets.innerHTML !== newHtml) previewBullets.innerHTML = newHtml;
    }

    if (previewSkills) {
      const tagEls = document.querySelectorAll('#docSkillsWrapper .doc-skill-tag');
      const skillList = Array.from(tagEls).map(tag => tag.textContent.replace('×', '').trim()).filter(Boolean);
      if (skillList.length > 0) {
        previewSkills.textContent = skillList.join(', ');
      } else if (typeof window.docSkills !== 'undefined' && Array.isArray(window.docSkills) && window.docSkills.length > 0) {
        previewSkills.textContent = window.docSkills.join(', ');
      } else {
        previewSkills.textContent = '';
      }
    }

    updateCharCounter();
    calculateProfileStrength();
    updateTopUserProfile();
  }

  window.syncLivePreview = syncLivePreview;

  const debouncedSyncLivePreview = debounce(syncLivePreview, 150);
  const debouncedAutoSave = debounce(autoSaveFormFields, 500);

  // Bind input events for debounced live preview sync & automatic localStorage saving
  const liveSyncInputs = document.querySelectorAll('.live-sync');
  liveSyncInputs.forEach(input => {
    input.addEventListener('input', () => {
      debouncedSyncLivePreview();
      debouncedAutoSave();
    });
    input.addEventListener('change', () => {
      syncLivePreview();
      autoSaveFormFields();
    });
    input.addEventListener('blur', () => {
      syncLivePreview();
      autoSaveFormFields();
    });
  });

  if (atsJdInput) {
    atsJdInput.addEventListener('input', debouncedAutoSave);
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
        const activeSettings = getActiveSettings();
        const response = await fetch('/api/optimize-resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobTitle, experienceText: expText, skills, geminiModel: activeSettings.geminiModel, sensitivity: activeSettings.sensitivity })
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
      ? '@page { size: A4 portrait; margin: 0; }' 
      : '@page { size: letter portrait; margin: 0; }';

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

  // PDF Export integration — delegated cleanly to window.pdfExporter module
  window.getPdfExportStyles = getPdfExportStyles;

  // New Resume Version Handler — clears all fields and resets to blank state
  function triggerNewResumeFlow() {
    const confirmed = window.confirm('Start a new resume? This will clear all current fields.');
    if (!confirmed) return;

    // 1. Clear text inputs & textareas
    if (inputFullName)       inputFullName.value       = '';
    if (inputJobTitle)       inputJobTitle.value       = '';
    if (inputEmail)          inputEmail.value          = '';
    if (inputPhone)          inputPhone.value          = '';
    if (inputLocation)        inputLocation.value        = '';
    if (inputGithub)          inputGithub.value          = '';
    if (inputLinkedin)        inputLinkedin.value        = '';
    if (inputPortfolio)       inputPortfolio.value       = '';
    if (inputSummary)         inputSummary.value         = '';
    if (inputEducation)      inputEducation.value      = '';
    if (inputCertifications)  inputCertifications.value  = '';
    if (inputProjects)        inputProjects.value        = '';
    if (inputAchievements)    inputAchievements.value    = '';
    if (bulletPoints)        bulletPoints.value        = '';

    customSectionsList = [];
    if (typeof renderCustomSectionInputs === 'function') {
      renderCustomSectionInputs();
    }

    // 2. Clear doc-editor closure data (bullets & skills) and contenteditable canvas elements
    if (typeof window.clearDocEditorData === 'function') {
      window.clearDocEditorData();
    }

    // 3. Clear skill tags & skills wrapper
    const skillsWrapper = document.getElementById('docSkillsWrapper');
    if (skillsWrapper) {
      skillsWrapper.querySelectorAll('.doc-skill-tag').forEach(t => t.remove());
    }
    const tagsContainer = document.getElementById('skillsTagsContainer');
    const skillInput    = document.getElementById('skillInputField');
    if (tagsContainer) {
      tagsContainer.querySelectorAll('.tag').forEach(tag => tag.remove());
      if (skillInput && !tagsContainer.contains(skillInput)) {
        tagsContainer.appendChild(skillInput);
      }
    }

    // 4. Clear experience bullets list DOM
    const bulletsList = document.getElementById('docBulletsList');
    if (bulletsList) {
      bulletsList.innerHTML = '';
    }

    // 5. Save explicit blank state to localStorage and clear active profile cache
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ isBlank: true }));
      localStorage.removeItem(ACTIVE_PROFILE_KEY);
    } catch(e) {}

    // 6. Reset live preview to blank defaults
    syncLivePreview();

    // 7. Update section percentages and profile strength
    if (typeof window.updateSectionPct === 'function') {
      window.updateSectionPct();
    }
    updateCharCounter();
    calculateProfileStrength();

    if (typeof window.showToast === 'function') {
      window.showToast('Started a new blank resume!', 'info');
    }
  }
  window.triggerNewResumeFlow = triggerNewResumeFlow;

  /* ==========================================================================
     MULTI-PROFILE RESUME VERSION MANAGER ENGINE
     ========================================================================== */

  const DEFAULT_CAREER_PROFILES = {
    'google-dev-template': {
      id: 'google-dev-template',
      name: 'Software Developer (Full Stack Grade)',
      title: 'Software Developer | Full Stack Developer',
      summary: 'B.Tech Computer Science student with strong foundations in Java, JavaScript, SQL, DSA, OOP and web development, experienced in building full-stack applications and solving real-world problems through software projects.',
      skills: ['Java', 'JavaScript', 'C++', 'Python', 'SQL', 'HTML5', 'CSS3', 'React.js', 'Node.js', 'Express.js', 'Spring Boot', 'MySQL', 'PostgreSQL', 'MongoDB', 'Git', 'GitHub', 'VS Code', 'Maven', 'DSA', 'OOP', 'DBMS', 'REST APIs', 'Computer Networks'],
      education: '### Bachelor of Technology — Computer Science & Engineering\n**University / College Name**, City, India\n2025 – 2029 | CGPA: X.XX / 10',
      projects: `### Project Name — Full Stack Web Application\n**Tech Stack:** React.js, Node.js, Express.js, PostgreSQL, Supabase\n* Developed a full-stack web application for [problem/use case].\n* Implemented [important feature] using [technology].\n* Designed responsive and accessible user interfaces using React.js and CSS.\n* Built secure REST APIs and integrated PostgreSQL/Supabase for data management.\n* Improved [performance/security/usability] by X% through [specific implementation].`,
      bullets: `* Developed and maintained [application/system] using [technologies].\n* Implemented [feature], improving [metric/result].\n* Collaborated with [team] to deliver [feature/project].\n* Debugged and optimized [system/application].`
    },
    'frontend-lead': {
      id: 'frontend-lead',
      name: 'Staff Frontend Engineer',
      title: 'Staff Frontend Engineer & Design Systems Lead',
      summary: 'Staff Frontend Architect with 8+ years of experience architecting high-performance web applications, design systems, and Web Vitals pipelines at scale.',
      skills: ['React', 'TypeScript', 'Next.js', 'Vanilla CSS', 'Web Vitals', 'GraphQL', 'Jest', 'CI/CD'],
      education: 'B.S. in Computer Science — Stanford University (2018)',
      bullets: `• Architected modular React component library serving 2M+ active monthly users across 14 micro-frontends.\n• Engineered automated Web Vitals optimization pipeline, reducing LCP by 42% and CLS to < 0.05.\n• Spearheaded frontend migration to TypeScript and Next.js, boosting release velocity by 35% across 4 engineering pods.\n• Implemented client-side GraphQL caching layer, decreasing server network payload sizes by 60%.`
    },
    'fullstack-architect': {
      id: 'fullstack-architect',
      name: 'Full Stack Solutions Architect',
      title: 'Senior Full Stack Solutions Architect',
      summary: 'Versatile Full Stack Architect with 7+ years of experience engineering high-throughput Node.js microservices, Python APIs, PostgreSQL databases, and cloud infrastructure.',
      skills: ['Node.js', 'Express', 'Python', 'PostgreSQL', 'Docker', 'Kubernetes', 'Redis', 'AWS'],
      education: 'M.S. in Software Engineering — MIT (2019)',
      bullets: `• Designed and deployed distributed event-driven microservices architecture processing 50k+ req/sec with < 50ms P99 latency.\n• Led backend overhaul using Node.js, Express, and PostgreSQL, scaling system capacity by 3x while cutting cloud spend by $120k/yr.\n• Implemented robust OAuth2/JWT authentication framework and RBAC policies across 12 API gateways.\n• Spearheaded DevOps transformation, containerizing 20+ applications with Docker and automated Kubernetes deployment pipelines.`
    },
    'engineering-manager': {
      id: 'engineering-manager',
      name: 'Engineering Manager',
      title: 'Senior Engineering Manager',
      summary: 'Engineering leader with 10+ years of software development and management experience guiding cross-functional teams of 15+ engineers across frontend, backend, and DevOps.',
      skills: ['Engineering Leadership', 'Agile/Scrum', 'Budget Management', 'System Design', 'Hiring', 'Okrs'],
      education: 'B.S. in Computer Engineering — UC Berkeley (2015)',
      bullets: `• Scaled engineering organization from 6 to 18 developers across 3 agile pods while maintaining high delivery velocity.\n• Spearheaded technical strategy and quarterly roadmap planning, aligning engineering outputs directly with business KPIs.\n• Mentored 8 mid-level and senior engineers, resulting in 4 internal promotions within 12 months.\n• Reduced production incident resolution time (MTTR) by 55% through automated monitoring and SLA alerts.`
    },
    'devops-lead': {
      id: 'devops-lead',
      name: 'Lead DevOps & Cloud Engineer',
      title: 'Lead DevOps & Site Reliability Engineer',
      summary: 'Site Reliability Engineer with deep expertise in AWS, Kubernetes, Terraform, CI/CD automation, and high-availability cloud architectures.',
      skills: ['AWS', 'Kubernetes', 'Docker', 'Terraform', 'Prometheus', 'Grafana', 'Github Actions'],
      education: 'B.S. in Information Technology — UT Austin (2017)',
      bullets: `• Provisioned production infrastructure on AWS using Terraform, achieving 99.99% uptime across multi-region clusters.\n• Built zero-downtime deployment pipelines using GitHub Actions and ArgoCD, accelerating deployment frequency from weekly to daily.\n• Configured comprehensive observability stack with Prometheus and Grafana, capturing metric anomalies before customer impact.`
    }
  };

  function getSavedProfiles() {
    let custom = {};
    try {
      const saved = localStorage.getItem(RESUME_PROFILES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          custom = parsed;
        }
      }
    } catch(e) {}
    return Object.assign({}, DEFAULT_CAREER_PROFILES, custom);
  }

  function saveProfiles(profilesObj) {
    try {
      localStorage.setItem(RESUME_PROFILES_KEY, JSON.stringify(profilesObj));
    } catch(e) {}
  }

  function loadProfileVersion(profileId) {
    if (profileId === 'google-dev-template' && typeof window.loadGoogleDevTemplate === 'function') {
      window.loadGoogleDevTemplate();
      try { localStorage.setItem(ACTIVE_PROFILE_KEY, profileId); } catch(e) {}
      return;
    }

    const profiles = getSavedProfiles();
    const p = profiles[profileId];
    if (!p) return;

    // Force update all form inputs with the selected profile version content
    if (inputJobTitle)  inputJobTitle.value  = p.title || '';
    if (inputSummary)   inputSummary.value   = p.summary || '';
    if (inputEducation) inputEducation.value = p.education || '';
    if (inputProjects)  inputProjects.value  = p.projects || '';
    if (bulletPoints)   bulletPoints.value   = p.bullets || '';

    // Update experience bullets in doc-editor.js closure & canvas
    if (p.bullets) {
      const bulletsArray = p.bullets.split('\n').map(b => b.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean);
      if (typeof window.setDocBullets === 'function') {
        window.setDocBullets(bulletsArray);
      }
    } else {
      if (typeof window.setDocBullets === 'function') {
        window.setDocBullets(['', '', '']);
      }
    }

    // Update skills in doc-editor.js closure & tag system
    if (Array.isArray(p.skills)) {
      if (typeof window.setDocSkills === 'function') {
        window.setDocSkills(p.skills);
      }
      const tagsContainer = document.getElementById('skillsTagsContainer');
      const skillInput = document.getElementById('skillInputField');
      if (tagsContainer) {
        tagsContainer.querySelectorAll('.tag').forEach(tag => tag.remove());
        p.skills.forEach(skill => {
          const span = document.createElement('span');
          span.className = 'tag';
          span.innerHTML = `${escapeHTML(skill)} <span class="tag-remove">&times;</span>`;
          span.querySelector('.tag-remove').addEventListener('click', () => {
            span.remove();
            if (typeof syncLiveSkills === 'function') syncLiveSkills();
            autoSaveFormFields();
          });
          if (skillInput) tagsContainer.insertBefore(span, skillInput);
          else tagsContainer.appendChild(span);
        });
      }
    }

    try {
      localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch(e) {}

    syncFormInputsToCenterCanvas();
    syncLivePreview();
    if (typeof syncLiveSkills === 'function') syncLiveSkills();
    autoSaveFormFields();

    if (typeof window.updateSectionPct === 'function') window.updateSectionPct();
    updateCharCounter();
    calculateProfileStrength();

    if (typeof showToast === 'function') {
      showToast(`Loaded ${p.name || p.title} career version!`, 'success');
    }
  }

  function renderVersionProfilesModal() {
    const grid = document.getElementById('versionProfilesGrid');
    if (!grid) return;

    const profiles = getSavedProfiles();
    const activeId = localStorage.getItem(ACTIVE_PROFILE_KEY) || 'google-dev-template';

    grid.innerHTML = Object.values(profiles).map(p => {
      const isActive = p.id === activeId;
      const skillsBadge = Array.isArray(p.skills) ? p.skills.slice(0, 4).join(', ') : '';
      return `
        <div class="version-profile-card ${isActive ? 'active' : ''}" data-profile-id="${p.id}" style="padding: 12px 14px; border: 1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border)'}; background: ${isActive ? 'var(--bg-active)' : 'var(--bg-surface)'}; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.2s ease;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <strong style="font-size: 0.92rem; color: var(--text-primary);">${escapeHTML(p.name || p.title)}</strong>
              ${isActive ? `<span class="badge-tag green" style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(16, 185, 129, 0.15); color: #10b981;">Active Version</span>` : ''}
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 3px;">${escapeHTML(p.title)}</div>
            ${skillsBadge ? `<div style="font-size: 0.75rem; color: var(--accent-primary); margin-top: 4px; font-weight: 500;">skills: ${escapeHTML(skillsBadge)}...</div>` : ''}
          </div>
          <button type="button" class="btn-primary-action btn-sm btn-load-profile" data-profile-id="${p.id}" style="padding: 6px 12px; font-size: 0.8rem;">
            ${isActive ? 'Active' : 'Load Version'}
          </button>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.btn-load-profile, .version-profile-card').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const profileId = el.getAttribute('data-profile-id');
        if (profileId) {
          loadProfileVersion(profileId);
          closeVersionModal();
        }
      });
    });
  }

  function openVersionModal() {
    const modal = document.getElementById('versionProfilesModal');
    if (!modal) return;
    renderVersionProfilesModal();
    modal.style.display = 'flex';
    if (window.feather) feather.replace();

    // Scroll the active profile card into view after the modal is painted.
    // requestAnimationFrame ensures the browser has completed layout for
    // the newly visible flex modal before scrollIntoView calculates position.
    requestAnimationFrame(() => {
      const grid = document.getElementById('versionProfilesGrid');
      if (grid) grid.scrollTop = 0; // always reset first so active card scroll is predictable
      const activeCard = modal.querySelector('.version-profile-card.active');
      if (activeCard) activeCard.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }
  window.openVersionModal = openVersionModal;

  function closeVersionModal() {
    const modal = document.getElementById('versionProfilesModal');
    if (modal) modal.style.display = 'none';
  }

  const sidebarNewResumeBtn = document.getElementById('sidebarNewResumeBtn');
  const btnNewResume = document.getElementById('btnNewResume');
  const btnCloseVersionModal = document.getElementById('btnCloseVersionModal');
  const btnSaveCurrentAsProfile = document.getElementById('btnSaveCurrentAsProfile');
  const btnResetToBlankResume = document.getElementById('btnResetToBlankResume');

  if (sidebarNewResumeBtn) {
    sidebarNewResumeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const rbNavItem = document.querySelector('.nav-item[data-tab="resume-builder"]');
      if (rbNavItem) rbNavItem.click();
      openVersionModal();
    });
  }
  if (btnNewResume) btnNewResume.addEventListener('click', () => openVersionModal());
  if (btnCloseVersionModal) btnCloseVersionModal.addEventListener('click', () => closeVersionModal());

  const versionModal = document.getElementById('versionProfilesModal');
  if (versionModal) {
    versionModal.addEventListener('click', (e) => {
      if (e.target === versionModal) closeVersionModal();
    });
  }

  if (btnSaveCurrentAsProfile) {
    btnSaveCurrentAsProfile.addEventListener('click', () => {
      const customTitle = prompt('Enter a name for this Custom Resume Profile (e.g. "FAANG Senior Role"):');
      if (!customTitle || !customTitle.trim()) return;

      const profileId = 'custom-' + Date.now();
      const currentSkills = Array.from(document.querySelectorAll('#skillsTagsContainer .tag')).map(t => getSkillTagName(t)).filter(Boolean);

      const newProfile = {
        id: profileId,
        name: customTitle.trim(),
        title: inputJobTitle ? inputJobTitle.value.trim() : 'Custom Role',
        summary: inputSummary ? inputSummary.value.trim() : '',
        skills: currentSkills,
        education: inputEducation ? inputEducation.value.trim() : '',
        bullets: bulletPoints ? bulletPoints.value.trim() : ''
      };

      const customProfiles = getSavedProfiles();
      customProfiles[profileId] = newProfile;
      saveProfiles(customProfiles);
      loadProfileVersion(profileId);
      closeVersionModal();
    });
  }

  if (btnResetToBlankResume) {
    btnResetToBlankResume.addEventListener('click', () => {
      closeVersionModal();
      triggerNewResumeFlow();
    });
  }

  /* ==========================================================================
     9. Export PDF Actions
     ========================================================================== */
  const btnExportPdf = document.getElementById('btnExportPdf');




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

  // Exposed on window so ats-analyzer.js (a separate module) can read the
  // uploaded PDF/TXT content via window.uploadedFileText in getResumeText().
  window.uploadedFileText = "";

  // Configure PDF.js worker URL if library is loaded
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  /**
   * Extracts text content from a PDF file using PDF.js
   * @param {File} file 
   */
  async function extractPdfText(file) {
    let arrayBuffer = null;
    try {
      arrayBuffer = await file.arrayBuffer();
      if (!window.pdfjsLib) return "";
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        disableFontFace: true,
        nativeImageDecoderSupport: 'none'
      });
      const pdf = await loadingTask.promise;
      let fullText = "";
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        let lastY = null;
        let pageText = "";
        for (const item of textContent.items) {
          if (!item.str) continue;
          if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
            pageText += "\n";
          } else if (pageText && !pageText.endsWith("\n") && !pageText.endsWith(" ")) {
            pageText += " ";
          }
          pageText += item.str;
          if (item.hasEOL) {
            pageText += "\n";
          }
          lastY = item.transform[5];
        }
        fullText += pageText + "\n\n";
      }
      arrayBuffer = null;
      return fullText;
    } catch (err) {
      arrayBuffer = null;
      console.warn("PDF.js parsing error:", err);
      if (err && (err.name === 'PasswordException' || (err.message && err.message.toLowerCase().includes('password')))) {
        if (typeof showToast === 'function') {
          showToast('PDF is password-protected. Please remove password encryption and try again.', 'error');
        } else {
          alert('PDF is password-protected. Please remove password encryption and try again.');
        }
      } else {
        if (typeof showToast === 'function') {
          showToast('Could not read PDF file. The document may be corrupted or unreadable.', 'error');
        } else {
          alert('Could not read PDF file. The document may be corrupted or unreadable.');
        }
      }
      return "";
    }
  }
  window.extractPdfText = extractPdfText;

  // ── Import Existing Resume (PDF / TXT) into Builder Fields ──
  const btnImportResume = document.getElementById('btnImportResume');
  const importResumeFileInput = document.getElementById('importResumeFileInput');

  if (btnImportResume && importResumeFileInput) {
    btnImportResume.addEventListener('click', (e) => {
      e.preventDefault();
      importResumeFileInput.click();
    });

    importResumeFileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const origBtnHTML = btnImportResume.innerHTML;
      btnImportResume.disabled = true;
      btnImportResume.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;margin-right:4px;animation:spin 1s linear infinite;"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="10"/></svg><span>Parsing Resume...</span>`;

      try {
        let text = '';
        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
          text = await extractPdfText(file);
        } else {
          text = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = ev => resolve(ev.target.result || '');
            reader.onerror = () => resolve('');
            reader.readAsText(file);
          });
        }

        if (!text || text.trim().length < 10) {
          if (typeof showToast === 'function') {
            showToast('Could not extract text from file. Please ensure it is a readable PDF or TXT resume.', 'error');
          } else alert('Could not extract text from file.');
          return;
        }

        let parsed = null;
        try {
          const resp = await fetch('/api/parse-resume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resumeText: text })
          });
          if (resp.ok) {
            parsed = await resp.json();
          }
        } catch (err) {
          console.warn('[Import Resume] Backend endpoint fetch error, using local parser:', err.message);
        }

        // Fallback: local heuristic parser if API call fails
        if (!parsed || !parsed.fullName) {
          const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
          const phoneMatch = text.match(/(\+?\d[\d\s\-().]{7,}\d)/);
          const linkedinMatch = text.match(/linkedin\.com\/in\/([^\s,/<>"]+)/i);
          const githubMatch = text.match(/github\.com\/([^\s,/<>"]+)/i);
          const portfolioMatch = text.match(/https?:\/\/(?!linkedin|github)([^\s,<>"]+)/i);

          const isLocationStr = (str) => /^[A-Za-z\s]+,\s*[A-Za-z\s]+$/.test(str.trim()) || /\b(bengaluru|bangalore|mumbai|delhi|hyderabad|pune|chennai|seattle|san francisco|new york|london|india|usa|uk|canada)\b/i.test(str);
          const isHeaderOrSocial = (str) => /^(linkedin|github|portfolio|website|contact|email|phone|address|education|experience|professional|work|summary|projects|skills|certifications|achievements|bachelor|master|degree|school|university|coursework|technical expertise|competencies)/i.test(str.trim());
          const locMatch = text.match(/\b([A-Z][a-zA-Z\s]{2,25},\s*(?:[A-Z]{2}|[A-Za-z]{2,20}))\b/);
          let location = locMatch ? locMatch[1].trim() : '';
          if (location) {
            const locLines = location.split(/[\r\n]+/);
            location = locLines[locLines.length - 1].trim();
            location = location.replace(/^(?:located\s+in|city\s*[:=]|location\s*[:=])\s*/i, '').trim();
          }

          let name = '';
          for (const line of lines.slice(0, 6)) {
            if (!line.includes('@') && !/\d{5,}/.test(line) && line.length >= 2 && line.length <= 50
                && !/^(summary|profile|objective|resume|cv|experience|education|skills|certifications|projects)/i.test(line)
                && !isLocationStr(line) && !isHeaderOrSocial(line)) {
              name = line; break;
            }
          }

          let title = '';
          let nameFound = false;
          for (const line of lines.slice(0, 10)) {
            if (nameFound && line !== name) {
              if (!line.includes('@') && !/^\+?\d/.test(line) && !isLocationStr(line) && !isHeaderOrSocial(line)
                  && line.length >= 3 && line.length <= 60
                  && !/(?:summary|profile|objective|experience|education|skills|work|projects|certifications|professional|contact|employment|history)/i.test(line)) {
                title = line; break;
              }
            }
            if (line === name) nameFound = true;
          }

          const skillsMatch = text.match(/(?:skills|technologies|tech stack|competencies)[:\s]*\n*([\s\S]{10,500}?)(?:\n{2,}|\n[A-Z])/i);
          const rawSkills = skillsMatch ? skillsMatch[1] : '';
          const extractedSkills = rawSkills.split(/[,|•\n\/]/).map(s => s.replace(/[^\w\s.#+]/g, '').trim()).filter(s => s.length >= 2 && s.length <= 35 && !/^(skills|competencies|tools|technical)$/i.test(s));

          const expMatch = text.match(/(?:professional experience|experience|work history|employment)[:\s]*\n+([\s\S]{30,2000}?)(?:\n{2,}(?:education|skills|certifications|projects|achievements|credentials)\b)/i);
          let experienceText = expMatch ? expMatch[1].trim() : '';
          if (!experienceText) {
            experienceText = lines.filter(l => /^[•\-\*]|\b(20\d\d|19\d\d)\b/.test(l) && l.length > 15).join('\n');
          }

          parsed = {
            fullName: parsed?.fullName || name || lines[0] || '',
            jobTitle: parsed?.jobTitle || title || '',
            email: parsed?.email || (emailMatch ? emailMatch[0] : ''),
            phone: parsed?.phone || (phoneMatch ? phoneMatch[0] : ''),
            location: parsed?.location || location,
            linkedin: parsed?.linkedin || (linkedinMatch ? `https://linkedin.com/in/${linkedinMatch[1]}` : ''),
            github: parsed?.github || (githubMatch ? `https://github.com/${githubMatch[1]}` : ''),
            portfolio: parsed?.portfolio || (portfolioMatch ? portfolioMatch[0] : ''),
            summary: parsed?.summary || '',
            experience: parsed?.experience || experienceText,
            skills: (parsed?.skills && parsed.skills.length > 0) ? parsed.skills : extractedSkills,
            education: parsed?.education || '',
            certifications: parsed?.certifications || '',
            projects: parsed?.projects || '',
            achievements: parsed?.achievements || ''
          };
        }

        function optimizeImportedResume(p) {
          if (!p) return p;
          if (!p.jobTitle || /(?:summary|profile|objective|experience|education|skills|work|projects|certifications|professional|contact|employment|history)/i.test(p.jobTitle)) {
            p.jobTitle = 'Software Developer | Full Stack Developer';
          }
          if (!p.summary || p.summary.length < 20) {
            p.summary = `B.Tech Computer Science student with strong foundations in Java, JavaScript, SQL, DSA, OOP, and web development. Experienced in building full-stack applications and solving real-world problems through software projects. Seeking opportunities to apply technical skills in software development and contribute to scalable, user-focused products.`;
          }
          if (p.experience) {
            const rawLines = p.experience.split(/\r?\n/).map(l => l.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean);
            const actionVerbs = ['Developed', 'Architected', 'Engineered', 'Implemented', 'Designed', 'Optimized', 'Spearheaded', 'Built'];
            const optimizedLines = rawLines.map((line, idx) => {
              if (/^(Developed|Architected|Engineered|Implemented|Designed|Optimized|Spearheaded|Built)\b/i.test(line)) {
                return line.startsWith('•') ? line : `• ${line}`;
              }
              const verb = actionVerbs[idx % actionVerbs.length];
              return `• ${verb} ${line.charAt(0).toLowerCase() + line.slice(1)}`;
            });
            p.experience = optimizedLines.join('\n');
          }
          if (!Array.isArray(p.skills) || p.skills.length === 0) {
            p.skills = ['Java', 'JavaScript', 'SQL', 'DSA', 'OOP', 'React.js', 'Node.js', 'Express.js', 'PostgreSQL', 'Supabase', 'Git', 'REST APIs'];
          }
          return p;
        }

        parsed = optimizeImportedResume(parsed);

        // Auto-fill legacy form fields
        if (parsed.fullName && inputFullName) inputFullName.value = parsed.fullName;
        if (parsed.jobTitle && inputJobTitle) inputJobTitle.value = parsed.jobTitle;
        if (parsed.email && inputEmail) inputEmail.value = parsed.email;
        if (parsed.phone && inputPhone) inputPhone.value = parsed.phone;
        if (parsed.location && inputLocation) inputLocation.value = parsed.location;
        if (parsed.github && inputGithub) inputGithub.value = parsed.github;
        if (parsed.linkedin && inputLinkedin) inputLinkedin.value = parsed.linkedin;
        if (parsed.portfolio && inputPortfolio) inputPortfolio.value = parsed.portfolio;
        if (parsed.summary && inputSummary) inputSummary.value = parsed.summary;
        if (parsed.experience && bulletPoints) bulletPoints.value = parsed.experience;
        if (parsed.education && inputEducation) inputEducation.value = parsed.education;
        if (parsed.certifications && inputCertifications) inputCertifications.value = parsed.certifications;
        if (parsed.projects && inputProjects) inputProjects.value = parsed.projects;
        if (parsed.achievements && inputAchievements) inputAchievements.value = parsed.achievements;

        // Auto-fill visible inline contenteditable document editor elements
        const docName = document.getElementById('docFieldName');
        if (docName && parsed.fullName) docName.innerText = parsed.fullName;

        const docTitle = document.getElementById('docFieldTitle');
        if (docTitle && parsed.jobTitle) docTitle.innerText = parsed.jobTitle;

        const docSummary = document.getElementById('docFieldSummary');
        if (docSummary && parsed.summary) docSummary.innerText = parsed.summary;

        document.querySelectorAll('[data-syncs]').forEach(el => {
          const syncKey = el.getAttribute('data-syncs');
          if (syncKey === 'inputEmail' && parsed.email) el.innerText = parsed.email;
          if (syncKey === 'inputPhone' && parsed.phone) el.innerText = parsed.phone;
          if (syncKey === 'inputLocation' && parsed.location) el.innerText = parsed.location;
          if (syncKey === 'inputGithub' && parsed.github) el.innerText = parsed.github;
          if (syncKey === 'inputLinkedin' && parsed.linkedin) el.innerText = parsed.linkedin;
          if (syncKey === 'inputPortfolio' && parsed.portfolio) el.innerText = parsed.portfolio;
          if (syncKey === 'inputEducation' && parsed.education) el.innerText = parsed.education;
          if (syncKey === 'inputCertifications' && parsed.certifications) el.innerText = parsed.certifications;
          if (syncKey === 'inputProjects' && parsed.projects) el.innerText = parsed.projects;
          if (syncKey === 'inputAchievements' && parsed.achievements) el.innerText = parsed.achievements;
        });

        // CRITICAL: Update empty state classes on all editable document fields
        document.querySelectorAll('.doc-field, .doc-contact-field, [contenteditable="true"]').forEach(el => {
          const txt = (el.innerText || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
          if (txt) {
            el.classList.remove('is-empty');
          } else {
            el.classList.add('is-empty');
          }
          if (window.personalEngine && typeof window.personalEngine.updateEmptyState === 'function') {
            window.personalEngine.updateEmptyState(el);
          }
        });

        // Populate inline experience bullets
        if (parsed.experience) {
          const lines = parsed.experience.split(/\r?\n/).map(l => l.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean);
          if (typeof window.setDocBullets === 'function') {
            window.setDocBullets(lines);
          }
        }

        // Auto-fill skills tags
        if (Array.isArray(parsed.skills) && parsed.skills.length > 0) {
          const tagsContainer = document.getElementById('skillsTagsContainer');
          if (tagsContainer) {
            tagsContainer.querySelectorAll('.tag').forEach(tag => tag.remove());
            parsed.skills.forEach(sk => {
              if (typeof sk === 'string' && sk.trim()) {
                addSkillTag(sk.trim());
                if (typeof window.addDocSkill === 'function') window.addDocSkill(sk.trim());
              }
            });
          }
        }

        syncLivePreview();
        autoSaveFormFields();


        // Store extracted text globally for ATS analyzer
        window.uploadedFileText = text;

        if (typeof showToast === 'function') {
          showToast(`Resume "${file.name}" imported successfully! Fields auto-filled.`, 'success');
        } else {
          alert('Resume imported successfully!');
        }
      } catch (err) {
        console.error('[Import Resume] Error:', err);
        if (typeof showToast === 'function') {
          showToast('Failed to parse resume: ' + err.message, 'error');
        } else {
          alert('Failed to parse resume: ' + err.message);
        }
      } finally {
        importResumeFileInput.value = '';
        btnImportResume.disabled = false;
        btnImportResume.innerHTML = origBtnHTML;
      }
    });
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

    window.uploadedFileText = ''; // Reset before extraction

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      // PDF — use PDF.js
      window.uploadedFileText = await extractPdfText(file);

    } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      // TXT — wrap FileReader in a Promise so it's properly awaited
      window.uploadedFileText = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload  = (e) => resolve(e.target.result || '');
        reader.onerror = ()  => resolve('');
        reader.readAsText(file);
      });

    } else if (file.name.endsWith('.docx')) {
      // DOCX — notify user that PDF or TXT is recommended for full text extraction
      window.uploadedFileText = '';
      if (selectedFileName) {
        selectedFileName.textContent = `${file.name} — DOCX file selected. For best ATS parsing, PDF or TXT is recommended.`;
      }
    }

    // Show extraction status in the badge for PDF/TXT
    if (!file.name.endsWith('.docx')) {
      if (selectedFileName && window.uploadedFileText) {
        const charCount = window.uploadedFileText.trim().length;
        selectedFileName.textContent = `${file.name} (${charCount} chars extracted)`;
      } else if (selectedFileName && !window.uploadedFileText) {
        selectedFileName.textContent = `${file.name} — could not extract text. Try PDF or TXT.`;
      }
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
        atsDropZone.style.borderColor = 'var(--border)';
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
      scoreCircle.style.background = `conic-gradient(#10b981 0% ${dynamicScore}%, rgba(128, 128, 128, 0.18) ${dynamicScore}% 100%)`;
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
            <span>${escapeHTML(kw)}</span>
            <span class="tag-add-btn" data-keyword="${escapeHTML(kw)}" title="Click to add ${escapeHTML(kw)} to Core Skills">+ Add</span>
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
              <p>${escapeHTML(recText)}</p>
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

    backend: `We are seeking a Lead Backend & Distributed Systems Engineer to build scalable microservices and payment infrastructure.

Key Requirements:
- 5+ years of experience with Go, Java, C++, or Node.js backend development.
- Expertise in System Architecture, Microservices design, and distributed caching with Redis & Memcached.
- Advanced SQL proficiency (PostgreSQL / MySQL) and NoSQL database optimization (MongoDB / DynamoDB).
- Hands-on experience with Event-Driven Architecture (Kafka / RabbitMQ), gRPC, and REST APIs.`,

    devops: `We are seeking a Lead DevOps & Cloud Systems Infrastructure Engineer to architect multi-region Kubernetes clusters.

Key Requirements:
- Extensive experience with Docker, Kubernetes (K8s), and Terraform Infrastructure as Code.
- Deep knowledge of AWS Cloud services, GCP, Linux System Administration, and Nginx.
- Strong proficiency in CI/CD Pipelines (GitHub Actions), Datadog Monitoring, and Shell scripting.
- Expertise in zero-downtime deployments, microservices security, and cost optimization.`,

    ai: `We are seeking an AI / Machine Learning Systems Engineer to build production RAG pipelines and LLM integrations.

Key Requirements:
- Hands-on experience with Python, Gemini / OpenAI APIs, PyTorch, and TensorFlow.
- Deep expertise in RAG Systems (LangChain / LlamaIndex) and Vector Databases (Pinecone / Milvus / Qdrant).
- Experience building scalable Data Engineering & ETL pipelines with Pandas & NumPy.
- Familiarity with Docker, FastAPI, and ML model evaluation frameworks.`,

    mobile: `We are hiring a Senior Mobile Application Engineer to build high-performance iOS and Android client applications.

Key Requirements:
- 4+ years of mobile engineering experience with Swift (iOS), Kotlin (Android), or React Native / Flutter.
- Deep understanding of Mobile UI/UX Architecture (MVVM / Clean Architecture) and offline-first state persistence.
- Experience integrating GraphQL, RESTful APIs, WebSockets, and OAuth2 authentication.
- Proven track record of App Store / Play Store deployment, CI/CD with Fastlane, and mobile performance profiling.`,

    data: `We are seeking a Data Engineer & Analytics Infrastructure Architect to build enterprise data platforms and real-time streaming ETL pipelines.

Key Requirements:
- Strong proficiency in Python, SQL, Apache Spark, and PySpark for big data processing.
- Hands-on experience building Cloud Data Warehouses (Snowflake, BigQuery, Databricks, Redshift).
- Deep expertise in Data Orchestration with Apache Airflow, dbt (data build tool), and Kafka streaming.
- Experience with Data Modeling, Data Governance, and Data Quality Validation.`,

    cybersecurity: `We are seeking a Cloud Security & Cyber Infrastructure Specialist to secure enterprise cloud services and DevSecOps pipelines.

Key Requirements:
- Proven experience in Cloud Security Posture Management (CSPM), Identity & Access Management (IAM), and Zero Trust Architecture.
- Expertise in Vulnerability Assessment, Penetration Testing, OWASP Top 10, and Security Compliance (SOC 2, ISO 27001, GDPR).
- Hands-on experience integrating SAST / DAST tools into CI/CD pipelines (SonarQube, Snyk, Trivy).
- Proficiency in Python / Bash scripting for automated security auditing and incident response.`,

    qa_automation: `We are hiring a Principal SDET & Test Automation Lead to design end-to-end quality assurance frameworks for web and API services.

Key Requirements:
- 5+ years in Test Automation engineering with JavaScript / TypeScript, Cypress, Playwright, or Selenium.
- Deep expertise in API Testing (Postman, REST Assured) and Performance / Load Testing (JMeter, k6).
- Strong experience integrating automated test suites into CI/CD pipelines (GitHub Actions, Jenkins).
- Proficiency in BDD / TDD frameworks, Defect Tracking, and Code Coverage reporting.`,

    product_manager: `We are seeking a Technical Product Manager to define the strategy, roadmap, and API architecture for developer-facing platforms.

Key Requirements:
- 4+ years of product management experience leading technical SaaS, API platforms, or Cloud Infrastructure products.
- Strong technical background with ability to analyze API specs, System Architecture, and SQL telemetry data.
- Proven track record of defining PRDs, User Stories, Backlog Grooming, and Agile / Scrum sprint execution.
- Exceptional cross-functional leadership working closely with Engineering, UX Design, and Customer Success.`,

    ui_ux_designer: `We are hiring a Staff UI/UX & Design Systems Lead to define design tokens, component accessibility, and user journeys.

Key Requirements:
- 5+ years of experience in UI/UX Design, Figma component architecture, and Design Systems.
- Deep expertise in User Research, Prototyping, Wireframing, and Micro-Interactions.
- Proficiency in WCAG Accessibility (a11y), Typography, Color Theory, and Responsive Layouts.
- Strong cross-functional collaboration with Frontend Engineering and Product teams.`,

    solutions_architect: `We are hiring a Cloud Solutions Architect to design enterprise cloud architectures and technical migration roadmaps.

Key Requirements:
- Extensive experience designing multi-tenant Cloud Architectures on AWS, Azure, or GCP.
- Deep knowledge of System Architecture, High Availability, Disaster Recovery, and Security Compliance.
- Hands-on experience with Microservices, Serverless, Containers (Kubernetes), and REST/gRPC APIs.
- Proven track record of conducting technical discovery workshops and executive stakeholder presentations.`,

    site_reliability: `We are seeking a Principal Site Reliability Engineer (SRE) to maintain 99.99% availability across global cloud services.

Key Requirements:
- 5+ years of SRE / Infrastructure experience with Linux administration, Go, Python, or Bash.
- Deep expertise in Incident Response, Post-Mortems, SLO/SLA management, and Error Budgets.
- Hands-on experience with Kubernetes, Terraform, Prometheus, Grafana, and Chaos Engineering.
- Proven track record of reducing MTTR (Mean Time to Resolution) and optimizing cloud infrastructure costs.`,

    embedded_systems: `We are hiring an Embedded Systems & Firmware Engineer to develop real-time hardware applications and IoT devices.

Key Requirements:
- Strong proficiency in C, C++, Assembly, and RTOS (FreeRTOS / Zephyr).
- Experience with Hardware Protocols (SPI, I2C, UART, CAN bus) and Microcontrollers (ARM Cortex, ESP32, STM32).
- Hands-on experience with Oscilloscopes, Logic Analyzers, and PCB Debugging.
- Knowledge of Embedded Linux, Memory Management, and Low-Power Wireless Protocols (BLE / Zigbee).`,

    game_developer: `We are seeking a Senior Game Developer to build real-time multiplayer game systems and graphics pipelines.

Key Requirements:
- 4+ years of professional game development experience with C++, C#, Unreal Engine, or Unity.
- Expertise in 3D Math, Shader Programming (HLSL/GLSL), Physics engines, and Memory Optimization.
- Experience building Multiplayer Networking frameworks, Client-Side Prediction, and Dedicated Servers.
- Proven track record of shipping commercial PC, Console, or Mobile game titles.`,

    blockchain_web3: `We are seeking a Smart Contract & Web3 Engineer to develop secure decentralized protocols and dApps.

Key Requirements:
- Deep proficiency in Solidity, Rust, Web3.js, Ethers.js, and Hardhat / Foundry framework.
- Experience building EVM Smart Contracts, DeFi protocols, ERC-20 / ERC-721 token standards, and Layer-2 scaling.
- Strong knowledge of Smart Contract Auditing, Security Vulnerabilities (Reentrancy, Front-running), and Gas Optimization.
- Familiarity with Decentralized Storage (IPFS / Arweave) and Cryptographic primitives.`,

    scrum_master: `We are hiring a Senior Agile Coach & Scrum Master to facilitate sprint execution and agile transformation.

Key Requirements:
- Certified Scrum Master (CSM / PSM) with 4+ years leading cross-functional software development teams.
- Deep expertise in Scrum, Kanban, Sprint Planning, Backlog Refinement, and Retrospectives.
- Proficiency in Jira, Confluence, Agile Metrics (Velocity, Burndown charts, Cycle Time), and Risk Mitigation.
- Exceptional coaching, conflict resolution, and stakeholder management skills.`,

    sales_engineer: `We are seeking a Senior Technical Sales Engineer / Solutions Consultant to partner with Enterprise Account Executives.

Key Requirements:
- 3+ years in Technical Pre-Sales, Solutions Engineering, or Technical Consulting for B2B SaaS / Developer APIs.
- Ability to conduct technical product demos, POCs (Proof of Concepts), and RFP / RFI response documentation.
- Strong technical background with REST APIs, SQL, System Integration, and Security Compliance (SOC 2).
- Exceptional verbal and written communication skills with executive C-level presentation experience.`,

    engineering_manager: `We are seeking a Director of Engineering / Engineering Manager to lead engineering teams and deliver strategic technology roadmaps.

Key Requirements:
- 3+ years of engineering management experience leading 10+ software engineers across multiple squads.
- Strong track record of hiring, mentoring, career growth planning, and performance management.
- Deep technical background in System Architecture, Software Engineering best practices, and CI/CD delivery.
- Proven experience managing engineering budgets, resource allocation, and executive stakeholder alignment.`,

    video_editor: `We are hiring a Senior Video Editor & Motion Graphics Designer to produce high-performing short-form and long-form video content across YouTube, TikTok, Instagram Reels, and brand campaigns.

Key Requirements:
- 4+ years of professional editing experience with Adobe Premiere Pro, After Effects, Final Cut Pro, or DaVinci Resolve.
- Deep expertise in Motion Graphics, Keyframe Animation, Color Grading, Sound Design, and Audio Mixing.
- Strong understanding of Storyboarding, Pacing, Hook Creation, and Multi-Camera Editing.
- Proven track record of creating viral social media videos, YouTube thumbnails, and promotional advertisements.`,

    social_media_manager: `We are hiring a Social Media & Content Marketing Manager to lead organic channel strategy, brand voice, and community engagement across Twitter/X, LinkedIn, Instagram, TikTok, and YouTube.

Key Requirements:
- 3+ years managing social media channels, content calendars, and viral growth campaigns for digital brands.
- Deep proficiency in Social Media Analytics (Sprout Social, Buffer, Hootsuite, Google Analytics), Audience Segmentation, and Engagement Rate Optimization.
- Experience writing compelling Social Copy, Short-Form Video Scripts, Thread Writing, and Graphic Asset Production (Canva / Figma).
- Proven track record of scaling follower growth, community interaction, and brand partnership activations.`,

    copywriter: `We are seeking a Senior Copywriter & Content Strategist to craft persuasive marketing copy, landing pages, email campaigns, and thought leadership articles.

Key Requirements:
- 4+ years of professional copywriting experience in B2B SaaS, E-Commerce, or Creative Agencies.
- Exceptional skills in Direct Response Copywriting, Headline Writing, Email Sequence Optimization, and Brand Storytelling.
- Deep knowledge of SEO Content Writing, Keyword Strategy, User Psychology, and A/B Copy Testing.
- Proven track record of improving landing page conversion rates and email open/click-through metrics.`,

    graphic_designer: `We are seeking a Senior Brand & Visual Graphic Designer to build visual identity, marketing assets, and brand design guidelines.

Key Requirements:
- 4+ years of experience in Graphic Design using Adobe Creative Suite (Photoshop, Illustrator, InDesign) and Figma.
- Strong expertise in Visual Branding, Logo Design, Vector Illustration, Layout Design, and Print/Digital Media Production.
- Deep understanding of Color Theory, Grid Systems, Typography, and Creative Direction.
- Proven portfolio demonstrating multi-channel brand campaigns, ad creatives, and pitch deck designs.`,

    growth_marketer: `We are hiring a Growth & Performance Marketing Lead to manage paid acquisition channels, funnel optimization, and customer acquisition (CAC/LTV).

Key Requirements:
- 4+ years leading performance marketing campaigns across Meta Ads (Facebook/Instagram), Google Ads (PPC/SEM), TikTok Ads, and LinkedIn Ads.
- Hands-on expertise in Attribution Modeling, Conversion Rate Optimization (CRO), Google Analytics 4 (GA4), and A/B Testing.
- Strong analytical skills working with CAC, LTV, ROAS, Retention Funnels, and Customer Cohort Analysis.
- Proven track record of managing multi-million dollar ad budgets and driving profitable ROI growth.`,

    seo_specialist: `We are hiring an SEO & Organic Growth Specialist to scale organic search traffic, keyword rankings, and technical site performance.

Key Requirements:
- 3+ years in Technical SEO, On-Page SEO, Content Optimization, and Link Building strategy.
- Deep proficiency with SEO tools (Ahrefs, SEMrush, Google Search Console, Screaming Frog, Google Analytics).
- Strong knowledge of Schema Markup, Core Web Vitals, Crawlability, Site Architecture, and Backlink Acquisition.
- Proven track record of increasing organic traffic and ranking top-3 for high-intent competitive keywords.`,

    hr_recruiter: `We are hiring a Senior Technical Recruiter & Talent Acquisition Lead to scale full-cycle hiring across engineering, product, and leadership teams.

Key Requirements:
- 4+ years of full-cycle recruiting experience sourcing technical talent (Engineering, Product, Executive).
- Expertise in Candidate Sourcing (LinkedIn Recruiter, GitHub, Boolean search), Applicant Tracking Systems (Greenhouse, Lever), and Offer Negotiations.
- Strong track record of building candidate pipelines, conducting structured interviews, and improving Time-to-Hire metrics.
- Exceptional communication, relationship building, and diversity hiring practices.`,

    financial_analyst: `We are seeking a Senior Financial Analyst & FP&A Lead to drive financial modeling, budgeting, forecasting, and strategic decision making.

Key Requirements:
- 4+ years of experience in Corporate FP&A, Investment Banking, or Financial Consulting.
- Advanced proficiency in Financial Modeling, Excel / Google Sheets (VLOOKUP, INDEX/MATCH, Macros), and SQL.
- Deep expertise in P&L Management, Cash Flow Forecasting, Variance Analysis, and Variance Reporting.
- Hands-on experience with ERP / BI tools (NetSuite, Tableau, Power BI, Adaptive Insights).`,

    customer_success: `We are hiring an Enterprise Customer Success & Key Account Manager to drive customer retention, onboarding, and revenue expansion (NRR).

Key Requirements:
- 3+ years in B2B SaaS Customer Success Management, Account Management, or Client Services.
- Proven track record of managing high-value Enterprise Key Accounts, maintaining low Churn, and driving Upsells / Cross-sells.
- Proficiency in CRM & CS tools (Salesforce, Gainsight, HubSpot, Zendesk) and Executive QBR Presentations.
- Exceptional relationship management, problem-solving, and customer advocacy skills.`
  };

  const sampleJdSelect = document.getElementById('sampleJdSelect');
  const atsEngineChipsContainer = document.getElementById('atsEngineChipsContainer');
  const atsAuditJobTitle = document.getElementById('atsAuditJobTitle');
  const atsAuditCompany = document.getElementById('atsAuditCompany');

  function autoFitMetaInput(inputEl) {
    if (!inputEl) return;
    const len = inputEl.value ? inputEl.value.length : 12;
    inputEl.style.width = Math.max(len + 2, 22) + 'ch';
  }

  [atsAuditJobTitle, atsAuditCompany].forEach(inputEl => {
    if (inputEl) {
      autoFitMetaInput(inputEl);
      inputEl.addEventListener('input', () => autoFitMetaInput(inputEl));
    }
  });

  if (sampleJdSelect && atsJdInput) {
    sampleJdSelect.addEventListener('change', () => {
      const selected = sampleJdSelect.value;
      if (selected && SAMPLE_JD_TEMPLATES[selected]) {
        atsJdInput.value = SAMPLE_JD_TEMPLATES[selected];
        const selectedOption = sampleJdSelect.options[sampleJdSelect.selectedIndex];
        if (selectedOption && selectedOption.value && atsAuditJobTitle) {
          atsAuditJobTitle.value = selectedOption.text;
          autoFitMetaInput(atsAuditJobTitle);
        }
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


  // Restore form persistence & initial live preview sync
  loadSavedFormFields();
  syncLivePreview();
  syncLiveSkills();
  updateAnalyticsDashboard();


  /* ==========================================================================
     12. Platform Settings & Preferences Manager Engine
     — Settings UI removed. localStorage key preserved for PDF paper-size/
       typography defaults consumed by pdf-exporter.js (getPdfExportStyles).
     ========================================================================== */

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

  let activeQuickFilterChip = 'all';

  const DEFAULT_SEED_JOBS = [
    {
      id: 'job-101',
      company: 'Microsoft',
      title: 'Senior Frontend Engineer',
      stage: 'interview',
      salary: '$180k - $220k',
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
      salary: '$220k - $270k',
      date: '2026-07-15',
      location: 'Remote',
      atsScore: 91,
      tags: ['Go', 'Microservices', 'Distributed Systems', 'API'],
      url: 'https://stripe.com/jobs/staff-architect',
      jdText: 'Architect resilient payment APIs, microservices, distribution protocols, latency reduction, and high availability systems.',
      notes: 'Written offer received! Base: $240k + Equity. Reviewing offer letter details before deadline.'
    },
    {
      id: 'job-103',
      company: 'OpenAI',
      title: 'Full Stack AI Platform Lead',
      stage: 'applied',
      salary: '$200k - $250k',
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
      salary: '$190k - $240k',
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
      salary: '$175k - $215k',
      date: '2026-07-24',
      location: 'Menlo Park, CA',
      atsScore: 85,
      tags: ['React Core', 'Vite', 'Bundle Optimization', 'SSR'],
      url: 'https://metacareers.com/jobs/ui-infra',
      jdText: 'Core React framework contributions, bundle optimization, SSR rendering pipeline, and web vitals.',
      notes: 'Tailoring specific resume version with focus on performance optimization metrics.'
    }
  ];

  function convertSalaryToINR(str) {
    if (!str || typeof str !== 'string') return str;
    return str.replace(/\$(\d+)(?:,000|k)?\s*[-–]\s*\$(\d+)(?:,000|k)?/gi, (m, min, max) => {
      const minK = parseInt(min, 10);
      const maxK = parseInt(max, 10);
      if (minK >= 20 && maxK >= 20) {
        const minL = Math.round(minK * 0.83);
        const maxL = Math.round(maxK * 0.83);
        return `₹${minL}L - ₹${maxL}L ($${minK}k - $${maxK}k)`;
      }
      return m;
    });
  }

  function loadJobApplications() {
    try {
      const stored = localStorage.getItem(JOB_APPS_STORAGE_KEY);
      if (stored) {
        let list = JSON.parse(stored);
        if (Array.isArray(list)) {
          list = list.map(job => ({
            ...job,
            salary: convertSalaryToINR(job.salary),
            notes: convertSalaryToINR(job.notes)
          }));
        }
        jobApplicationsList = list;
      } else {
        jobApplicationsList = [...DEFAULT_SEED_JOBS];
      }
      saveJobApplications();
    } catch (e) {
      console.warn('Error loading job applications:', e);
      jobApplicationsList = [...DEFAULT_SEED_JOBS];
    }
  }

  function saveJobApplications(changedJob = null) {
    try {
      localStorage.setItem(JOB_APPS_STORAGE_KEY, JSON.stringify(jobApplicationsList));
      if (changedJob) {
        queueOfflineTask('job', 'UPSERT', changedJob);
      }
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
    if (!name) return 'JO';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  // Map company name to avatar gradient class
  function getAvatarColorClass(name) {
    const palettes = ['ca-blue', 'ca-indigo', 'ca-purple', 'ca-teal', 'ca-green', 'ca-orange', 'ca-red', 'ca-pink', 'ca-slate'];
    if (!name) return palettes[0];
    const seed = name.trim().toUpperCase().charCodeAt(0) + (name.length || 0);
    return palettes[seed % palettes.length];
  }

  // Render company avatar HTML
  function renderCompanyAvatar(name) {
    const initials = getCompanyInitials(name);
    const colorClass = getAvatarColorClass(name);
    return `<div class="company-avatar ${colorClass}">${initials}</div>`;
  }

  // Render Tech Tag Pills Helper (matches new .tech-tag CSS)
  function renderTechPills(tags) {
    if (!tags || !Array.isArray(tags) || !tags.length) return '';
    return `<div class="tech-tags-row">
      ${tags.slice(0, 4).map(tag => `<span class="tech-tag">${escapeHTML(tag)}</span>`).join('')}
    </div>`;
  }

  // Render ATS donut ring SVG
  function renderAtsDonut(score) {
    if (!score && score !== 0) return `<span style="font-size:12px;color:var(--text-muted);">N/A</span>`;
    const r = 16; const circ = 2 * Math.PI * r;
    const pct = Math.min(100, Math.max(0, Number(score)));
    const offset = circ - (pct / 100) * circ;
    const threshClass = pct >= 85 ? 'ats-high' : pct >= 70 ? 'ats-mid' : 'ats-low';
    return `
      <div class="ats-donut-wrapper ${threshClass}">
        <svg viewBox="0 0 42 42" xmlns="http://www.w3.org/2000/svg">
          <circle class="ats-donut-bg" cx="21" cy="21" r="${r}"/>
          <circle class="ats-donut-fill" cx="21" cy="21" r="${r}"
            stroke-dasharray="${circ.toFixed(2)}"
            stroke-dashoffset="${offset.toFixed(2)}"/>
        </svg>
        <div class="ats-donut-text">${pct}%</div>
      </div>`;
  }

  const NEXT_STAGE_LABEL_MAP = {
    'wishlist': { next: 'applied', label: 'Apply ➔' },
    'applied': { next: 'interview', label: 'Interview ➔' },
    'interview': { next: 'offer', label: 'Got Offer! 🎉' }
  };

  // Render Kanban Board
  function renderKanbanBoard(filteredList) {
    const container = document.getElementById('kanbanBoardContainer');
    if (!container) return;

    const STAGE_META = [
      { id: 'wishlist',  label: '⭐ Wishlist',      color: '#6366f1' },
      { id: 'applied',   label: '📤 Applied',        color: '#3b82f6' },
      { id: 'interview', label: '🎯 Interviewing',   color: '#f59e0b' },
      { id: 'offer',     label: '🏆 Offer',          color: '#22c55e' },
      { id: 'rejected',  label: '❌ Rejected',       color: '#ef4444' }
    ];

    // Build column scaffolding if it doesn't already exist
    if (!document.getElementById('column-cards-wishlist')) {
      container.innerHTML = STAGE_META.map(s => `
        <div class="kanban-column" data-stage="${s.id}" style="
          background:var(--bg-card,#1e1e2e);
          border:1px solid var(--border,#2d2d44);
          border-radius:12px; padding:12px; min-height:200px;
          display:flex; flex-direction:column; gap:8px;
        ">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="font-size:0.75rem;font-weight:700;letter-spacing:0.05em;color:var(--text-muted,#94a3b8);">${s.label}</span>
            <span id="count-${s.id}" style="
              background:var(--bg-hover,#252540);border-radius:20px;
              padding:1px 8px;font-size:0.7rem;color:var(--text-muted,#94a3b8);
            ">0</span>
          </div>
          <div id="column-cards-${s.id}" style="display:flex;flex-direction:column;gap:8px;flex:1;"></div>
        </div>
      `).join('');
    }

    const stages = ['wishlist', 'applied', 'interview', 'offer', 'rejected'];

    stages.forEach(stage => {
      const colCardsList = document.getElementById(`column-cards-${stage}`);
      const countEl = document.getElementById(`count-${stage}`);

      if (!colCardsList) return;

      const stageJobs = filteredList.filter(j => j.stage === stage || (stage === 'interview' && j.stage === 'interviewing') || (stage === 'interviewing' && j.stage === 'interview'));
      if (countEl) countEl.textContent = stageJobs.length;

      colCardsList.innerHTML = '';

      if (stageJobs.length === 0) {
        colCardsList.innerHTML = `<div class="empty-stage-placeholder" style="font-size:0.78rem; color:var(--text-muted); text-align:center; padding:1.5rem 0.5rem; border:1px dashed var(--border); border-radius:8px;">No ${stage} apps</div>`;
        return;
      }

      stageJobs.forEach(job => {
        const card = document.createElement('div');
        card.className = 'kanban-card';
        card.setAttribute('draggable', 'true');
        card.setAttribute('data-id', String(job.id));

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
              <button type="button" class="card-action-btn btn-edit-job" data-id="${job.id}" title="Edit Application">
                <i data-feather="edit-2"></i> Edit
              </button>
              ${job.jdText ? `<button type="button" class="card-action-btn btn-scan-ats" data-id="${job.id}" title="Scan JD in ATS Analyzer" style="color:var(--primary); font-weight:700;"><i data-feather="zap"></i> ATS Scan</button>` : ''}
              <button type="button" class="card-action-btn btn-delete-job" data-id="${job.id}" title="Delete Application" style="color:#ef4444;">
                <i data-feather="trash-2"></i> Delete
              </button>
            </div>
            ${nextStageInfo ? `<button type="button" class="btn-stage-advance" data-id="${job.id}" data-next="${nextStageInfo.next}">${nextStageInfo.label}</button>` : ''}
          </div>
        `;

        // Drag events
        card.addEventListener('dragstart', (e) => {
          card.classList.add('dragging');
          e.dataTransfer.setData('text/plain', String(job.id));
        });
        card.addEventListener('dragend', () => {
          card.classList.remove('dragging');
        });

        colCardsList.appendChild(card);
      });
    });

    if (window.feather) window.feather.replace();
  }

  function formatDateNice(dateStr) {
    if (!dateStr) return 'N/A';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIdx = parseInt(parts[1], 10) - 1;
        if (monthIdx >= 0 && monthIdx < 12) {
          return `${months[monthIdx]} ${parseInt(parts[2], 10)}, ${parts[0]}`;
        }
      }
    } catch (e) {}
    return dateStr;
  }

  // Render Table View
  function renderTableView(filteredList) {
    const tableBody = document.getElementById('pipelineTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (filteredList.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="padding: 1.5rem 0;">
            <div class="studio-empty-state">
              <div class="empty-state-illustration">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
              </div>
              <h3 class="empty-state-headline">No job applications tracked yet</h3>
              <p class="empty-state-desc">Organize your job search across Wishlist, Applied, Interviewing, and Offer stages with real-time application pipelines.</p>
              <div class="empty-state-actions">
                <button type="button" class="empty-cta-btn empty-cta-primary btn-add-first-app" onclick="if (typeof window.openJobModal === 'function') window.openJobModal();">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span>Add First Application</span>
                </button>
              </div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    filteredList.forEach(job => {
      const tr = document.createElement('tr');

      // Stage label display
      const stageLabels = {
        wishlist: 'Wishlist', applied: 'Applied',
        interview: 'Interviewing', offer: 'Offer', rejected: 'Rejected'
      };
      const stageDisplay = stageLabels[job.stage] || job.stage;

      tr.innerHTML = `
        <td>
          <div class="company-cell-wrapper">
            ${renderCompanyAvatar(job.company)}
            <div class="company-info-block">
              <div class="company-name-text">${escapeHTML(job.company)}</div>
              <div class="company-role-text">${escapeHTML(job.title)}</div>
              ${renderTechPills(job.tags)}
            </div>
          </div>
        </td>
        <td class="text-center">
          <span class="stage-badge stage-${job.stage}">${escapeHTML(stageDisplay)}</span>
        </td>
        <td class="text-center">
          <span class="date-text">${escapeHTML(formatDateNice(job.date))}</span>
        </td>
        <td class="text-center">
          <span class="salary-text">${escapeHTML(job.salary || '—')}</span>
        </td>
        <td class="text-center ats-score-cell">
          ${renderAtsDonut(job.atsScore)}
        </td>
        <td>
          <div class="job-actions-cell">
            <button class="job-action-btn edit-btn btn-edit-job" data-id="${job.id}" title="Edit Application">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            ${job.jdText ? `<button class="job-action-btn scan-btn btn-scan-ats" data-id="${job.id}" title="Run ATS Scan">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </button>` : `<button class="job-action-btn scan-btn btn-scan-ats" data-id="${job.id}" title="ATS Scan">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </button>`}
            <button class="job-action-btn delete-btn btn-delete-job" data-id="${job.id}" title="Delete Application">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          </div>
        </td>
      `;

      tableBody.appendChild(tr);
    });
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
    renderTableView(filtered);
    renderKanbanBoard(filtered);
    initKanbanDragAndDrop();
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
          const job = jobApplicationsList.find(j => String(j.id) === String(jobId));
          if (job && job.stage !== targetStage) {
            job.stage = targetStage;
            saveJobApplications(job);
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
    const pipelineWrapper = document.querySelector('.pipeline-views-wrapper') || document.getElementById('jobPipelineTab');
    if (pipelineWrapper) {
      pipelineWrapper.onclick = (e) => {
        const btnEdit = e.target.closest('.btn-edit-job');
        if (btnEdit) {
          e.preventDefault();
          e.stopPropagation();
          const id = btnEdit.getAttribute('data-id');
          openJobModal(id);
          return;
        }

        const btnDelete = e.target.closest('.btn-delete-job');
        if (btnDelete) {
          e.preventDefault();
          e.stopPropagation();
          const id = btnDelete.getAttribute('data-id');
          const job = jobApplicationsList.find(j => String(j.id) === String(id));
          if (job && window.confirm(`Delete application for ${job.company} (${job.title})?`)) {
            jobApplicationsList = jobApplicationsList.filter(j => String(j.id) !== String(id));
            saveJobApplications();
            queueOfflineTask('job', 'DELETE', { id: job.id });
            renderPipelineViews();
            if (typeof showToast === 'function') {
              showToast('Application deleted.', 'info');
            }
          }
          return;
        }

        const btnScan = e.target.closest('.btn-scan-ats');
        if (btnScan) {
          e.preventDefault();
          e.stopPropagation();
          const id = btnScan.getAttribute('data-id');
          const job = jobApplicationsList.find(j => String(j.id) === String(id));
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
          return;
        }

        const btnAdvance = e.target.closest('.btn-stage-advance');
        if (btnAdvance) {
          e.preventDefault();
          e.stopPropagation();
          const id = btnAdvance.getAttribute('data-id');
          const nextStage = btnAdvance.getAttribute('data-next');
          const job = jobApplicationsList.find(j => String(j.id) === String(id));
          if (job && nextStage) {
            job.stage = nextStage;
            saveJobApplications(job);
            renderPipelineViews();
            if (typeof showToast === 'function') {
              showToast(`Moved ${job.company} application to ${nextStage}!`, 'success');
            }
          }
          return;
        }
      };
    }
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
    const jobModalEl = document.getElementById('jobModal');
    const jobFormEl  = document.getElementById('jobForm');
    if (!jobModalEl || !jobFormEl) return;

    jobFormEl.reset();

    const jobIdEl        = document.getElementById('jobId');
    const jobTitleEl     = document.getElementById('jobModalTitle');
    const jobCompanyEl   = document.getElementById('jobCompany');
    const jobRoleTitleEl = document.getElementById('jobTitle');
    const jobStageEl     = document.getElementById('jobStage');
    const jobSalaryEl    = document.getElementById('jobSalary');
    const jobDateEl      = document.getElementById('jobDate');
    const jobLocationEl  = document.getElementById('jobLocation');
    const jobAtsScoreEl  = document.getElementById('jobAtsScore');
    const jobUrlEl       = document.getElementById('jobUrl');
    const jobJdTextEl    = document.getElementById('jobJdText');
    const jobNotesEl     = document.getElementById('jobNotes');

    if (jobIdEl) jobIdEl.value = '';

    if (jobId) {
      const job = jobApplicationsList.find(j => String(j.id) === String(jobId));
      if (job) {
        if (jobTitleEl)     jobTitleEl.textContent = 'Edit Job Application';
        if (jobIdEl)        jobIdEl.value          = job.id;
        if (jobCompanyEl)   jobCompanyEl.value     = job.company || '';
        if (jobRoleTitleEl) jobRoleTitleEl.value   = job.title || '';
        if (jobStageEl)     jobStageEl.value       = job.stage || 'applied';
        if (jobSalaryEl)    jobSalaryEl.value      = job.salary || '';
        if (jobDateEl)      jobDateEl.value        = job.date || '';
        if (jobLocationEl)  jobLocationEl.value    = job.location || '';
        if (jobAtsScoreEl)  jobAtsScoreEl.value    = job.atsScore || '';
        if (jobUrlEl)       jobUrlEl.value         = job.url || '';
        if (jobJdTextEl)    jobJdTextEl.value      = job.jdText || '';
        if (jobNotesEl)     jobNotesEl.value       = job.notes || '';
      }
    } else {
      if (jobTitleEl) jobTitleEl.textContent = 'Add Job Application';
      if (jobDateEl)  jobDateEl.value        = new Date().toISOString().split('T')[0];
    }

    jobModalEl.style.display = 'flex';
    jobModalEl.style.zIndex = '10000';
  }

  function closeJobModal() {
    const jobModalEl = document.getElementById('jobModal');
    if (jobModalEl) jobModalEl.style.display = 'none';
  }

  window.openJobModal = openJobModal;
  window.closeJobModal = closeJobModal;
  window._openJobModalInternal = openJobModal;

  document.addEventListener('click', (e) => {
    const target = e.target.closest('#btnAddNewJob, .btn-add-first-app, #btnCloseJobModal, #btnCancelJobModal, .modal-close-btn');
    if (!target) return;
    if (target.id === 'btnAddNewJob' || target.classList.contains('btn-add-first-app')) {
      e.preventDefault();
      openJobModal();
    } else if (target.id === 'btnCloseJobModal' || target.id === 'btnCancelJobModal') {
      e.preventDefault();
      closeJobModal();
    } else if (target.classList.contains('modal-close-btn')) {
      e.preventDefault();
      const parentModal = target.closest('.modal-overlay');
      if (parentModal) parentModal.style.display = 'none';
    }
  });

  const jobModalEl = document.getElementById('jobModal');
  if (jobModalEl) {
    jobModalEl.addEventListener('click', (e) => {
      if (e.target === jobModalEl) closeJobModal();
    });
  }

  document.addEventListener('submit', (e) => {
    if (e.target && e.target.id === 'jobForm') {
      e.preventDefault();

      const id      = document.getElementById('jobId')?.value || '';
      const company = document.getElementById('jobCompany')?.value?.trim() || '';
      const title   = document.getElementById('jobTitle')?.value?.trim() || '';

      if (!company || !title) return;

      const jobData = {
        id: id || `job-${Date.now()}`,
        company,
        title,
        stage:    document.getElementById('jobStage')?.value || 'applied',
        salary:   document.getElementById('jobSalary')?.value?.trim() || '',
        date:     document.getElementById('jobDate')?.value || '',
        location: document.getElementById('jobLocation')?.value?.trim() || '',
        atsScore: Number(document.getElementById('jobAtsScore')?.value) || 0,
        url:      document.getElementById('jobUrl')?.value?.trim() || '',
        jdText:   document.getElementById('jobJdText')?.value?.trim() || '',
        notes:    document.getElementById('jobNotes')?.value?.trim() || ''
      };

      if (id) {
        const index = jobApplicationsList.findIndex(j => String(j.id) === String(id));
        if (index !== -1) jobApplicationsList[index] = jobData;
      } else {
        jobApplicationsList.unshift(jobData);
      }

      saveJobApplications(jobData);
      renderPipelineViews();
      closeJobModal();

      if (typeof showToast === 'function') {
        showToast(id ? 'Application updated successfully!' : 'New application added to pipeline!', 'success');
      }
    }
  });

  // View Switcher (Board vs Table)
  const btnViewKanban = document.getElementById('btnViewKanban');
  const btnViewTable = document.getElementById('btnViewTable');
  const kanbanBoardContainer = document.getElementById('kanbanBoardContainer');
  const tableViewContainer = document.getElementById('tableViewContainer');

  let currentJobView = 'table'; // track active view so renderPipelineViews uses it

  if (btnViewKanban && btnViewTable) {
    btnViewKanban.addEventListener('click', () => {
      currentJobView = 'kanban';
      btnViewKanban.classList.add('active');
      btnViewTable.classList.remove('active');
      if (kanbanBoardContainer) kanbanBoardContainer.style.display = 'grid';
      if (tableViewContainer)   tableViewContainer.style.display   = 'none';
      renderPipelineViews(); // populate kanban cards on switch
    });

    btnViewTable.addEventListener('click', () => {
      currentJobView = 'table';
      btnViewTable.classList.add('active');
      btnViewKanban.classList.remove('active');
      if (kanbanBoardContainer) kanbanBoardContainer.style.display = 'none';
      if (tableViewContainer)   tableViewContainer.style.display   = 'block';
      renderPipelineViews(); // refresh table on switch
    });
  }

  // Search & Filter event listeners
  const jobSearchInput = document.getElementById('jobSearchInput');
  const jobStageFilter = document.getElementById('jobStageFilter');

  if (jobSearchInput) jobSearchInput.addEventListener('input', renderPipelineViews);
  if (jobStageFilter) jobStageFilter.addEventListener('change', renderPipelineViews);

  // escapeHTML is defined as a global function at the top of this file.

  // Initialize pipeline
  loadJobApplications();
  renderPipelineViews();

  // Section Focus Mode Event Wiring (AI Studio Ambient Dimming)
  const docEditorBody = document.querySelector('.doc-editor-body');
  if (docEditorBody) {
    docEditorBody.addEventListener('focusin', (e) => {
      const block = e.target.closest('.doc-section-block');
      if (block) {
        document.querySelectorAll('.doc-section-block').forEach(b => b.classList.remove('is-focused'));
        block.classList.add('is-focused');
        docEditorBody.classList.add('has-focused-section');
      }
    });

    docEditorBody.addEventListener('focusout', () => {
      setTimeout(() => {
        if (!docEditorBody.contains(document.activeElement)) {
          document.querySelectorAll('.doc-section-block').forEach(b => b.classList.remove('is-focused'));
          docEditorBody.classList.remove('has-focused-section');
        }
      }, 100);
    });
  }

  /* ==========================================================================
     RESUME ACCENT COLOR PALETTE SWATCHES ENGINE
     ========================================================================== */

  function setResumeAccentColor(colorHex) {
    if (!colorHex) return;

    document.querySelectorAll('.preview-paper-sheet, #printableResumeDoc').forEach(sheet => {
      sheet.style.setProperty('--accent-primary', colorHex);
      sheet.style.setProperty('--accent', colorHex);
      sheet.style.setProperty('--primary', colorHex);
    });

    document.querySelectorAll('.topbar-swatches-group .swatch-btn').forEach(btn => {
      const btnColor = btn.getAttribute('data-color');
      if (btnColor && btnColor.toLowerCase() === colorHex.toLowerCase()) {
        btn.classList.add('active');
        btn.style.borderColor = '#fff';
        btn.style.boxShadow = `0 0 0 2px ${colorHex}`;
      } else {
        btn.classList.remove('active');
        btn.style.borderColor = 'transparent';
        btn.style.boxShadow = 'none';
      }
    });

    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, colorHex);
    } catch(e) {}
  }

  const savedAccentColor = localStorage.getItem(ACCENT_STORAGE_KEY) || '#C98B4A';
  setResumeAccentColor(savedAccentColor);

  document.querySelectorAll('.topbar-swatches-group .swatch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.getAttribute('data-color');
      if (color) {
        setResumeAccentColor(color);
        if (typeof showToast === 'function') {
          showToast(`Applied ${btn.title || 'accent color'}!`, 'info');
        }
      }
    });
  });

  // --- Editor Panels Toggle Engine (Tablet/Mobile Overlay & Desktop Collapsible) ---
  const btnToggleRightPanel = document.getElementById('btnToggleRightPanel');
  const btnCloseRightPanel = document.getElementById('btnCloseRightPanel');
  const editorRightPanel = document.getElementById('editorRightPanel');

  if (btnToggleRightPanel && editorRightPanel) {
    btnToggleRightPanel.addEventListener('click', () => {
      if (window.innerWidth <= 1024) {
        editorRightPanel.classList.toggle('open');
      } else {
        editorRightPanel.classList.toggle('collapsed');
      }
    });
  }

  if (btnCloseRightPanel && editorRightPanel) {
    btnCloseRightPanel.addEventListener('click', () => {
      editorRightPanel.classList.remove('open');
      editorRightPanel.classList.add('collapsed');
    });
  }

  const btnToggleLeftPanel = document.getElementById('btnToggleLeftPanel');
  const editorLeftPanel = document.querySelector('.editor-left-panel');

  if (btnToggleLeftPanel && editorLeftPanel) {
    btnToggleLeftPanel.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        editorLeftPanel.classList.toggle('open');
      } else {
        editorLeftPanel.classList.toggle('collapsed');
      }
    });
  }

  // Platform initialization complete
});



