/**
 * ResuAI // Secure Backend Server & Gemini Proxy Service
 * Pure Node.js — Zero External Dependencies
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ============================================================================
// 1. CONFIGURATION & ENVIRONMENT LOAD
// ============================================================================
const envPath = fs.existsSync(path.resolve(__dirname, '../.env'))
  ? path.resolve(__dirname, '../.env')
  : path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.substring(0, eqIdx).trim();
          let val = trimmed.substring(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (key && !process.env[key]) process.env[key] = val;
        }
      }
    });
  } catch (e) {
    console.warn('Could not parse .env file:', e.message);
  }
}

const PORT = process.env.PORT || 8080;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const ALLOWED_ORIGINS_ENV = process.env.ALLOWED_ORIGINS || "";
const ALLOWED_ORIGINS = ALLOWED_ORIGINS_ENV
  ? ALLOWED_ORIGINS_ENV.split(',').map(s => s.trim()).filter(Boolean)
  : [];

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const { GEMINI_MODELS, SHARED_TAXONOMY_KEYWORDS } = require('./api/_shared');

// ============================================================================
// 2. LOGGING SERVICE
// ============================================================================
function log(level, message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

// ============================================================================
// 3. SECURITY & MIDDLEWARE SERVICES
// ============================================================================
function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.length > 0) {
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
    }
  } else {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function setSecurityHeaders(req, res) {
  setCorsHeaders(req, res);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com; font-src 'self' https://fonts.gstatic.com https://api.fontshare.com; img-src 'self' data: https:; connect-src 'self' https://generativelanguage.googleapis.com https://*.supabase.co;");
}

// NOTE: Not imported from _shared.js — this variant adds a maxLength cap used
// by readJsonBody to truncate over-sized text fields before Gemini API calls.
// _shared.js exports a simpler version without the length guard.
function sanitizeInputText(str, maxLength = 50000) {
  if (!str || typeof str !== 'string') return '';
  let clean = str.trim();
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/javascript:/gi, '');
  if (clean.length > maxLength) {
    clean = clean.substring(0, maxLength);
  }
  return clean;
}


const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;

function isRateLimited(ip) {
  const now = Date.now();
  const userRecord = rateLimitMap.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

  if (now > userRecord.resetTime) {
    userRecord.count = 1;
    userRecord.resetTime = now + RATE_LIMIT_WINDOW_MS;
    rateLimitMap.set(ip, userRecord);
    return false;
  }

  userRecord.count += 1;
  rateLimitMap.set(ip, userRecord);

  return userRecord.count > MAX_REQUESTS_PER_WINDOW;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 10 * 60 * 1000);

// ============================================================================
// 4. UTILITIES & BODY PARSING
// ============================================================================
function safeParseJson(rawText) {
  if (!rawText) throw new Error("Empty response from Gemini API");
  let clean = rawText.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  return JSON.parse(clean);
}

function readJsonBody(req, res, maxBytes = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    let isOverLimit = false;

    req.on('data', chunk => {
      if (isOverLimit) return;
      body += chunk;
      if (Buffer.byteLength(body, 'utf8') > maxBytes) {
        isOverLimit = true;
        setCorsHeaders(req, res);
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload too large. Maximum allowed size is 5MB.' }));
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });

    req.on('end', () => {
      if (isOverLimit) return;
      try {
        const parsed = JSON.parse(body || '{}');
        resolve(parsed);
      } catch (err) {
        setCorsHeaders(req, res);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
        reject(err);
      }
    });

    req.on('error', (err) => {
      if (!isOverLimit) reject(err);
    });
  });
}

// ============================================================================
// 5. GEMINI API SERVICE
// ============================================================================
function makeGeminiRequest(modelName, promptText) {
  return new Promise((resolve, reject) => {
    if (!GEMINI_API_KEY) {
      return reject(new Error("GEMINI_API_KEY environment variable is not set on the server."));
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
    const url = new URL(endpoint);

    const payload = JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { responseMimeType: "application/json" }
    });

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`Gemini API [${modelName}] returned status ${res.statusCode}: ${data}`));
          }
          const parsedRes = JSON.parse(data);
          const rawText = parsedRes.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!rawText) return reject(new Error("Empty content in Gemini API response"));
          resolve(safeParseJson(rawText));
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

// ============================================================================
// 6. ROUTE CONTROLLERS & SERVER INITIALIZATION
// ============================================================================
const server = http.createServer((req, res) => {
  setSecurityHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  // ── API Router ──
  const API_ROUTES = new Set([
    '/api/optimize-resume',
    '/api/parse-resume',
    '/api/ats-analyze',
    '/api/analyze',
    '/api/analyze-ats',
    '/api/ats-chat',
    '/api/login'
  ]);

  if (pathname.startsWith('/api/')) {
    if (!API_ROUTES.has(pathname)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `API route '${pathname}' not found` }));
      return;
    }
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json', 'Allow': 'POST, OPTIONS' });
      res.end(JSON.stringify({ error: `Method ${req.method} Not Allowed on ${pathname}` }));
      return;
    }
  }

  if (req.method === 'POST' && pathname === '/api/optimize-resume') {
    (async () => {
      try {
        if (isRateLimited(clientIp)) {
          log('WARN', `Rate limit exceeded for IP: ${clientIp} on /api/optimize-resume`);
          res.writeHead(429, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Rate limit exceeded. Maximum 20 requests per 15 minutes allowed.' }));
          return;
        }

        log('INFO', `Received /api/optimize-resume request from IP ${clientIp}`);

        // Delegate to the standalone handler (supports both old 'experienceText' and new 'text'/'section'/'action' schema)
        const optimizeResumeHandler = require('./api/optimize-resume.js');
        const body = await readJsonBody(req, res);

        // Bridge: if frontend sends 'experienceText' (old field), map to 'text' for the handler
        if (body.experienceText && !body.text) {
          body.text = body.experienceText;
        }

        req.body = body;

        const resMock = {
          _statusCode: 200, _headers: {}, _ended: false,
          status(code) { this._statusCode = code; return this; },
          json(data) {
            if (this._ended) return; this._ended = true;
            res.writeHead(this._statusCode, { 'Content-Type': 'application/json', ...this._headers });
            res.end(JSON.stringify(data));
          },
          setHeader(k, v) { this._headers[k] = v; },
          end() { if (!this._ended) { this._ended = true; res.writeHead(this._statusCode); res.end(); } }
        };

        await optimizeResumeHandler(req, resMock);
      } catch (err) {
        log('ERROR', `Optimize resume handler catch error: ${err.message}`);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error during resume optimization.' }));
        }
      }
    })();
    return;
  }

  // ── Resume Parser: import existing resume PDF/TXT → populate all form fields ──
  if (req.method === 'POST' && pathname === '/api/parse-resume') {
    (async () => {
      try {
        if (isRateLimited(clientIp)) {
          res.writeHead(429, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Rate limit exceeded.' }));
          return;
        }
        log('INFO', `Received /api/parse-resume request from IP ${clientIp}`);
        const parseResumeHandler = require('./api/parse-resume.js');
        const body = await readJsonBody(req, res);
        req.body = body;
        const resMock = {
          _statusCode: 200, _headers: {}, _ended: false,
          status(code) { this._statusCode = code; return this; },
          json(data) {
            if (this._ended) return; this._ended = true;
            res.writeHead(this._statusCode, { 'Content-Type': 'application/json', ...this._headers });
            res.end(JSON.stringify(data));
          },
          setHeader(k, v) { this._headers[k] = v; },
          end() { if (!this._ended) { this._ended = true; res.writeHead(this._statusCode); res.end(); } }
        };
        await parseResumeHandler(req, resMock);
      } catch (err) {
        log('ERROR', `parse-resume error: ${err.message}`);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      }
    })();
    return;
  }

  if (req.method === 'POST' && (pathname === '/api/analyze' || pathname === '/api/analyze-ats' || pathname === '/api/ats-analyze')) {
    (async () => {
      try {
        if (isRateLimited(clientIp)) {
          log('WARN', `Rate limit exceeded for IP: ${clientIp} on ${pathname}`);
          res.writeHead(429, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Rate limit exceeded. Maximum 20 requests per 15 minutes allowed.' }));
          return;
        }

        log('INFO', `Received ${pathname} request from IP ${clientIp}`);

        // Delegate entirely to api/ats-analyze.js — it owns the full prompt, Gemini calls, and rich fallback
        const atsAnalyzeHandler = require('./api/ats-analyze.js');

        // Build a minimal Express-compatible shim around Node's raw req/res
        const body = await readJsonBody(req, res);
        req.body = body;

        const resMock = {
          _statusCode: 200,
          _headers: {},
          _ended: false,
          status(code) { this._statusCode = code; return this; },
          json(data) {
            if (this._ended) return;
            this._ended = true;
            res.writeHead(this._statusCode, { 'Content-Type': 'application/json', ...this._headers });
            res.end(JSON.stringify(data));
          },
          setHeader(k, v) { this._headers[k] = v; },
          end() { if (!this._ended) { this._ended = true; res.writeHead(this._statusCode); res.end(); } }
        };

        await atsAnalyzeHandler(req, resMock);
      } catch (err) {
        log('ERROR', `ATS Analyze handler catch error: ${err.message}\n${err.stack}`);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'ATS analysis failed. Please try again.',
            detail: err.message
          }));
        }
      }
    })();
    return;
  }

  if (req.method === 'POST' && pathname === '/api/ats-chat') {
    (async () => {
      try {
        if (isRateLimited(clientIp)) {
          log('WARN', `Rate limit exceeded for IP: ${clientIp} on /api/ats-chat`);
          res.writeHead(429, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Rate limit exceeded. Maximum 20 requests per 15 minutes allowed.' }));
          return;
        }

        const atsChatHandler = require('./api/ats-chat.js');

        // Pre-parse body so req.body is populated before the handler runs
        const body = await readJsonBody(req, res);
        req.body = body;

        await atsChatHandler(req, res);
      } catch (err) {
        log('ERROR', `ATS Chat route error: ${err.message}`);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Server chat error' }));
        }
      }
    })();
    return;
  }


  if (req.method === 'POST' && pathname === '/api/login') {
    (async () => {
      try {
        if (isRateLimited(clientIp)) {
          log('WARN', `Rate limit exceeded for IP: ${clientIp} on /api/login`);
          res.writeHead(429, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Rate limit exceeded. Maximum 20 requests per 15 minutes allowed.' }));
          return;
        }
        const { email } = await readJsonBody(req, res);
        const emailToUse = (email && email.trim()) ? email.trim() : 'developer@resuai.dev';
        const token = 'token_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);

        log('INFO', `Successful login request for ${emailToUse}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          token: token,
          user: { email: emailToUse, name: emailToUse.split('@')[0] || 'Developer' }
        }));
      } catch (err) {
        log('ERROR', `Login request failure: ${err.message}`);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Internal server error during login'
          }));
        }
      }
    })();
    return;
  }

  const rawRootDir = path.resolve(__dirname, '../');
  const rootDir = fs.existsSync(rawRootDir) ? fs.realpathSync(rawRootDir) : rawRootDir;

  let decodedPath = pathname;
  try { decodedPath = decodeURIComponent(pathname); } catch (e) {}

  const safePath = path.normalize(decodedPath).replace(/^(\.\.[\/\\])+/, '');
  
  // Resolve target file path against root project directory
  let filePath = (safePath === '/' || safePath === '/index.html')
    ? path.join(rootDir, 'frontend', 'index.html')
    : path.join(rootDir, safePath);

  const resolvedPath = path.resolve(filePath);

  if (!resolvedPath.startsWith(rootDir)) {
    log('WARN', `Forbidden path traversal attempt blocked: ${pathname}`);
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden: Access Denied');
    return;
  }

  const extname = path.extname(filePath);
  const contentType = MIME_TYPES[extname] || 'text/html';
  const cacheControlHeader = 'no-cache, must-revalidate';

  // Helper to serve file with fallback subdirectories
  const serveFileWithFallbacks = (targetPath) => {
    fs.readFile(targetPath, (err, content) => {
      if (err) {
        if (err.code === 'ENOENT') {
          // Attempt fallback search across frontend subdirectories
          const basenm = path.basename(targetPath);
          const fallbacks = [
            path.join(rootDir, 'frontend', basenm),
            path.join(rootDir, 'frontend', 'components', basenm),
            path.join(rootDir, 'frontend', 'engines', basenm),
            path.join(rootDir, 'frontend', 'styles', basenm)
          ];

          let found = false;
          for (const fallbackPath of fallbacks) {
            if (fallbackPath !== targetPath && fs.existsSync(fallbackPath)) {
              found = true;
              fs.readFile(fallbackPath, (fbErr, fbContent) => {
                if (!fbErr) {
                  res.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(fallbackPath)] || contentType, 'Cache-Control': cacheControlHeader });
                  res.end(fbContent, 'utf-8');
                } else {
                  res.writeHead(404, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-cache' });
                  res.end(`404 Not Found: ${safePath}`);
                }
              });
              break;
            }
          }

          if (!found) {
            if (extname && extname !== '.html') {
              res.writeHead(404, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-cache' });
              res.end(`404 Not Found: ${safePath}`);
              return;
            }
            fs.readFile(path.join(rootDir, 'frontend', 'index.html'), (err2, htmlContent) => {
              res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache, must-revalidate' });
              res.end(htmlContent, 'utf-8');
            });
          }
        } else {
          res.writeHead(500, { 'Cache-Control': 'no-cache' });
          res.end(`Server Error: ${err.code}`);
        }
      } else {
        res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': cacheControlHeader });
        res.end(content, 'utf-8');
      }
    });
  };

  serveFileWithFallbacks(filePath);
});

server.listen(PORT, () => {
  log('INFO', `ResuAI Server running at http://localhost:${PORT}`);
  log('INFO', `GEMINI_API_KEY status: ${GEMINI_API_KEY ? "CONFIGURED (SECURE)" : "NOT SET (Using Server Fallback)"}`);
  log('INFO', `CORS Whitelist status: ${ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS.join(', ') : "OPEN (Local Dev Default)"}`);
});
