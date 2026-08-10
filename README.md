# ResuAI — Developer Resume Studio & ATS Diagnostic Engine

> An AI-powered resume builder, ATS keyword scorer, and job application tracker built for software engineers.

![License](https://img.shields.io/badge/license-MIT-blue) ![Node](https://img.shields.io/badge/node-%3E%3D24.x-brightgreen) ![Gemini](https://img.shields.io/badge/AI-Gemini%202.0%20Flash-orange) ![Supabase](https://img.shields.io/badge/auth-Supabase-3ECF8E) ![Deploy](https://img.shields.io/badge/deploy-Vercel-black)

---

## What is ResuAI?

ResuAI is a full-stack web application that helps developers write better resumes, beat ATS (Applicant Tracking System) filters, and track job applications — all from one browser-based studio.

Most ATS systems auto-reject 75% of resumes before a human ever reads them. ResuAI solves this by:

- Giving you a **live resume editor** with real-time preview
- Running a **Gemini AI-powered ATS diagnostic** that scores your resume against any job description
- Providing an **AI writing assistant** to rewrite, shorten, or strengthen any section
- Exporting a **pixel-perfect PDF** that matches your on-screen preview exactly

---

## Key Features

| Feature | Description |
|---|---|
| **Live Resume Editor** | Write your resume in a structured doc-style editor with instant preview |
| **ATS Diagnostic Engine** | Paste any job description → get a keyword match score, missing skills, and recommendations |
| **Gemini AI Writing Assistant** | Rewrite, shorten, make executive, or ATS-optimize any section using Google Gemini 2.0 Flash |
| **AI Skill Suggester** | AI generates relevant skills based on your job title and experience |
| **XYZ Bullet System** | Forces quantified impact bullets: _Did X, resulting in Y, measured by Z_ |
| **PDF Export** | One-click high-fidelity PDF download via print iframe |
| **Resume Version Profiles** | Save multiple career track versions (e.g. Frontend, Backend, ML) |
| **Command Palette** | `Ctrl+K` / `Cmd+K` keyboard-driven command interface |
| **Job Application Tracker** | Track applied, interviewing, and offer-stage applications |
| **Multi-theme Accent Colors** | 6 live color themes applied across resume preview instantly |
| **Import Resume** | Upload an existing PDF or TXT resume → auto-fills all form fields |
| **User Auth** | Supabase-powered sign-up, login, and session persistence |

---

## AI Features (Powered by Google Gemini 2.0 Flash)

All AI features go through a **secure backend proxy** — the Gemini API key is never exposed to the browser.

### 1. ATS Resume Analyzer
- Extracts keywords from any job description
- Compares against your resume content
- Returns a **match score (0–100%)** with:
  - Matched keywords ✅
  - Missing keywords ❌
  - Format score, Experience score, Metric density score
  - Tailored recommendations
- Falls back to a **server-side keyword engine** if Gemini is unavailable

### 2. AI Writing Assistant
Triggered per-section in the editor:
- **Improve Writing** — polishes grammar and flow
- **Shorten** — trims to ATS-optimal length
- **Executive Tone** — elevates language for senior roles
- **Technical Focus** — adds technical depth and specificity
- **ATS-Friendly** — restructures text to maximize keyword matching

### 3. AI Skill Suggester
- Analyzes your job title and existing content
- Suggests the most relevant technical skills for your role
- One-click to add suggested skills directly to your resume

### 4. ATS Career Coach Chat
- Conversational AI coaching mode in the ATS Analyzer tab
- Ask follow-up questions about your resume or job description

### 5. Resume Parser (Import)
- Extracts name, job title, contact info, skills, experience, education, and certifications from uploaded resumes
- Uses Gemini for intelligent text extraction from PDF/TXT files

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla HTML, CSS, JavaScript (zero framework dependencies) |
| **Backend** | Pure Node.js (zero npm dependencies — built-ins only) |
| **AI** | Google Gemini 2.0 Flash via REST API |
| **Auth & DB** | Supabase (PostgreSQL + Auth) |
| **PDF Export** | Browser Print API via hidden iframe |
| **Deployment** | Vercel (serverless functions) + local Node.js server |
| **Version Control** | Git / GitHub |

---

## Project Structure

```
ResuAI/
│
├── backend/
│   ├── server.js               # Local Node.js server (serves frontend + proxies API)
│   └── api/
│       ├── _shared.js          # Shared constants, sanitizers, CORS utils (DRY)
│       ├── ats-analyze.js      # ATS keyword scoring + Gemini analysis
│       ├── ats-chat.js         # AI coaching chat endpoint
│       ├── parse-resume.js     # Resume text extraction & field parsing
│       ├── optimize-resume.js  # AI resume optimization endpoint
│       └── login.js            # Auth proxy endpoint
│
├── frontend/
│   ├── index.html              # Main app shell (editor, preview, ATS analyzer)
│   ├── engines/
│   │   ├── script.js           # Core app engine (auth, editor, live preview, ATS UI)
│   │   ├── ats-analyzer.js     # ATS Diagnostic UI engine
│   │   ├── pdf-exporter.js     # PDF generation & print module
│   │   ├── editor-engine.js    # Document editor utilities
│   │   ├── job-tracker.js      # Job application tracker
│   │   └── supabase-client.js  # Supabase browser client (ES module)
│   ├── components/
│   │   ├── command-palette.js  # Cmd+K command palette
│   │   ├── command-palette.css
│   │   ├── help-center.js      # In-app help & documentation panel
│   │   └── help-center.css
│   └── styles/
│       ├── styles.css          # Master bundle & @import manifest
│       ├── variables.css       # Core variables & design tokens
│       ├── layout.css          # App shell, navigation & layout
│       ├── auth.css            # Authentication screens & components
│       ├── components.css      # Shared UI controls, buttons & modals
│       ├── job-tracker.css     # Job application pipeline styles
│       ├── resume-editor.css   # Resume builder & live paper preview
│       ├── ats-analyzer.css    # ATS diagnostic engine & audit workspace
│       └── empty-states.css    # Empty state illustrations
│
├── api/                        # Vercel serverless entry points (proxy → backend/api/)
│
├── index.html                  # Root entry point for Vercel deployment
├── vercel.json                 # Vercel routing & serverless function config
├── package.json                # App metadata & start script
├── .env                        # Local environment secrets (NOT committed)
└── .gitignore
```

---

## Local Development Setup

### Prerequisites
- **Node.js** v24 or higher
- A **Google Gemini API key** — get one free at [aistudio.google.com](https://aistudio.google.com/)

### 1. Clone the repository
```bash
git clone https://github.com/kuntalmanii/Resume-builder.git
cd Resume-builder
```

### 2. Set up environment variables
Create a `.env` file in the project root:
```env
# Required — your Gemini API key
GEMINI_API_KEY=your_gemini_api_key_here

# Server port (default: 8080)
PORT=8080

# Optional — restrict CORS to specific origins in production
# ALLOWED_ORIGINS=https://your-domain.vercel.app
```

### 3. Start the server
```bash
npm start
```

The app will be live at: **http://localhost:8080**

---

## Deployment (Vercel)

The project is pre-configured for Vercel with `vercel.json`.

### Deploy in one command
```bash
npx vercel --prod
```

Set these environment variables in your Vercel project dashboard:

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Your Google Gemini API key |
| `ALLOWED_ORIGINS` | Your Vercel app URL (e.g. `https://resuai.vercel.app`) |

---

## Security

- **API key never exposed to the browser** — all Gemini calls go through the backend proxy
- Input sanitization (XSS strip) on all user text before processing
- Security headers on every response: `CSP`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`
- Rate limiting: 20 API requests per IP per 15-minute window
- Request payload capped at 5MB

---

## How It Works

```
User types resume → Live Preview updates in real time
         │
         ▼
User pastes Job Description → ATS Analyzer runs
         │
         ├─ Server-side keyword extraction (instant fallback)
         │
         └─ Gemini 2.0 Flash AI analysis (deep scoring)
                    │
                    ▼
         Score + Missing Keywords + Recommendations displayed
         │
         ▼
User clicks AI Writing Assistant → Section text rewritten by Gemini
         │
         ▼
User downloads PDF → Hidden iframe renders print-optimized layout
```

---

## License

MIT — free to use, modify, and distribute.

---

## Author

**Manish Kuntal**  
Built as part of the Builders Program — AI-powered resume tooling for developers.
