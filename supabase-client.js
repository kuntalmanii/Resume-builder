/**
 * ResuAI — Supabase Browser Client
 * Initialises the Supabase JS client once and exposes it as window.supabase
 * so that script.js (which is not a module) can access it cleanly.
 *
 * Project: kjcelcmovmyqwdspuano
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL  = 'https://kjcelcmovmyqwdspuano.supabase.co';
const SUPABASE_ANON = 'sb_publishable_nFBBIwdCjEAF3JQ0mdZLBQ_726HAvIZ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,           // keeps session in localStorage automatically
    autoRefreshToken: true,
    detectSessionInUrl: true        // needed for OAuth redirect flows
  }
});

// Expose globally so the non-module script.js can consume it
window.supabase = supabase;

export default supabase;
