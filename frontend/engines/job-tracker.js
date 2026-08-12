/**
 * ResuAI // Job Application Pipeline Tracker (job-tracker.js)
 *
 * NOTE: The full Job Tracker implementation lives in script.js (Section 13).
 * This file is intentionally a thin compatibility stub — it exposes a global
 * `window.jobTracker` shim so any legacy references don't throw, but all
 * actual logic (rendering, modals, storage) is handled by script.js.
 *
 * DO NOT add rendering or event-binding logic here; it will conflict with
 * the canonical implementation in script.js.
 */

(function () {
  'use strict';

  // Expose a no-op shim so old references to window.jobTracker don't throw.
  if (!window.jobTracker) {
    window.jobTracker = {
      applications: [],
      initialized: false,
      /** No-op: script.js owns initialization */
      init() {},
      /** No-op: script.js owns rendering */
      renderAll() {},
      /** Delegate add-modal to script.js's openJobModal */
      _showAddModal() {
        if (typeof window.openJobModal === 'function') {
          window.openJobModal();
        }
      }
    };
  }
})();
