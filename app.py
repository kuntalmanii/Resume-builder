import os
import json
import streamlit as st
from pypdf import PdfReader
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load environment variables
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

import streamlit.components.v1 as components
build_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "resume-ui/dist")
react_app = components.declare_component("react_app", path=build_dir)

# ─────────────────────────────────────────────────────────────────────────────
# PAGE CONFIG — must be first Streamlit call
# ─────────────────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="ResuAI // Next-Gen Resume Engine",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# ─────────────────────────────────────────────────────────────────────────────
# 🎨 THEME SYSTEM — Five design-token themes
# ─────────────────────────────────────────────────────────────────────────────
THEMES: dict[str, dict] = {
    "cosmic": {
        "name": "Cosmic",  "icon": "🌌",
        "bg_base": "#080B11", "bg_surface": "#0F172A", "bg_elevated": "#1E293B",
        "border_subtle": "#0F172A", "border_default": "#1E293B",
        "text_primary": "#F8FAFC", "text_secondary": "#94A3B8", "text_muted": "#475569",
        "accent": "#A855F7", "accent_alt": "#3B82F6",
        "accent_grad": "linear-gradient(135deg,#A855F7 0%,#3B82F6 100%)",
        "btn_from": "#7C3AED", "btn_to": "#4F46E5",
        "btn_glow": "rgba(124,58,237,0.35)", "btn_glow_hover": "rgba(124,58,237,0.55)",
        "tab_active_bg": "linear-gradient(135deg,#1E1040 0%,#1a1a3e 100%)",
        "tab_active_shadow": "rgba(124,58,237,0.22)",
        "input_bg": "#080B11", "card_bg_from": "#0F172A", "card_bg_to": "#0d1424",
        "spinner": "#A855F7",
        "swatch": "linear-gradient(135deg,#A855F7,#3B82F6)",
    },
    "ocean": {
        "name": "Ocean",   "icon": "🌊",
        "bg_base": "#03080F", "bg_surface": "#071525", "bg_elevated": "#0A1F36",
        "border_subtle": "#071525", "border_default": "#0A1F36",
        "text_primary": "#F0F9FF", "text_secondary": "#7DD3FC", "text_muted": "#2A4A6E",
        "accent": "#06B6D4", "accent_alt": "#0EA5E9",
        "accent_grad": "linear-gradient(135deg,#06B6D4 0%,#0EA5E9 100%)",
        "btn_from": "#0284C7", "btn_to": "#0369A1",
        "btn_glow": "rgba(6,182,212,0.35)", "btn_glow_hover": "rgba(6,182,212,0.55)",
        "tab_active_bg": "linear-gradient(135deg,#032030 0%,#041828 100%)",
        "tab_active_shadow": "rgba(6,182,212,0.22)",
        "input_bg": "#03080F", "card_bg_from": "#071525", "card_bg_to": "#050F1C",
        "spinner": "#06B6D4",
        "swatch": "linear-gradient(135deg,#06B6D4,#0EA5E9)",
    },
    "ember": {
        "name": "Ember",   "icon": "🔥",
        "bg_base": "#0C0704", "bg_surface": "#1A0E08", "bg_elevated": "#271408",
        "border_subtle": "#1A0E08", "border_default": "#271408",
        "text_primary": "#FFF7ED", "text_secondary": "#FCA778", "text_muted": "#78350F",
        "accent": "#F97316", "accent_alt": "#EF4444",
        "accent_grad": "linear-gradient(135deg,#F97316 0%,#EF4444 100%)",
        "btn_from": "#C2410C", "btn_to": "#B91C1C",
        "btn_glow": "rgba(249,115,22,0.35)", "btn_glow_hover": "rgba(249,115,22,0.55)",
        "tab_active_bg": "linear-gradient(135deg,#2A1000 0%,#220A00 100%)",
        "tab_active_shadow": "rgba(249,115,22,0.22)",
        "input_bg": "#0C0704", "card_bg_from": "#1A0E08", "card_bg_to": "#130B06",
        "spinner": "#F97316",
        "swatch": "linear-gradient(135deg,#F97316,#EF4444)",
    },
    "aurora": {
        "name": "Aurora",  "icon": "🌿",
        "bg_base": "#030E08", "bg_surface": "#051A0D", "bg_elevated": "#082A16",
        "border_subtle": "#051A0D", "border_default": "#082A16",
        "text_primary": "#F0FFF4", "text_secondary": "#6EE7B7", "text_muted": "#064E3B",
        "accent": "#10B981", "accent_alt": "#34D399",
        "accent_grad": "linear-gradient(135deg,#10B981 0%,#34D399 100%)",
        "btn_from": "#059669", "btn_to": "#047857",
        "btn_glow": "rgba(16,185,129,0.35)", "btn_glow_hover": "rgba(16,185,129,0.55)",
        "tab_active_bg": "linear-gradient(135deg,#022818 0%,#011F12 100%)",
        "tab_active_shadow": "rgba(16,185,129,0.22)",
        "input_bg": "#030E08", "card_bg_from": "#051A0D", "card_bg_to": "#040F08",
        "spinner": "#10B981",
        "swatch": "linear-gradient(135deg,#10B981,#34D399)",
    },
    "light": {
        "name": "Light",   "icon": "☀️",
        "bg_base": "#F1F5F9", "bg_surface": "#FFFFFF", "bg_elevated": "#E2E8F0",
        "border_subtle": "#E2E8F0", "border_default": "#CBD5E1",
        "text_primary": "#0F172A", "text_secondary": "#475569", "text_muted": "#94A3B8",
        "accent": "#7C3AED", "accent_alt": "#2563EB",
        "accent_grad": "linear-gradient(135deg,#7C3AED 0%,#2563EB 100%)",
        "btn_from": "#7C3AED", "btn_to": "#4F46E5",
        "btn_glow": "rgba(124,58,237,0.2)", "btn_glow_hover": "rgba(124,58,237,0.4)",
        "tab_active_bg": "linear-gradient(135deg,#EDE9FE 0%,#E0E7FF 100%)",
        "tab_active_shadow": "rgba(124,58,237,0.15)",
        "input_bg": "#FFFFFF", "card_bg_from": "#FFFFFF", "card_bg_to": "#F8FAFC",
        "spinner": "#7C3AED",
        "swatch": "linear-gradient(135deg,#7C3AED,#2563EB)",
    },
}


def get_theme_css(key: str) -> str:
    """Emit a <style> block that sets all CSS custom properties for the given theme.
    Every UI component reads from these vars — switching theme = one rerun.
    """
    t = THEMES[key]
    return f"""
    <style>
    :root {{
        --bg-base:           {t['bg_base']};
        --bg-surface:        {t['bg_surface']};
        --bg-elevated:       {t['bg_elevated']};
        --border-subtle:     {t['border_subtle']};
        --border-default:    {t['border_default']};
        --text-primary:      {t['text_primary']};
        --text-secondary:    {t['text_secondary']};
        --text-muted:        {t['text_muted']};
        --accent:            {t['accent']};
        --accent-alt:        {t['accent_alt']};
        --accent-grad:       {t['accent_grad']};
        --btn-from:          {t['btn_from']};
        --btn-to:            {t['btn_to']};
        --btn-glow:          {t['btn_glow']};
        --btn-glow-hover:    {t['btn_glow_hover']};
        --tab-active-bg:     {t['tab_active_bg']};
        --tab-active-shadow: {t['tab_active_shadow']};
        --input-bg:          {t['input_bg']};
        --card-bg-from:      {t['card_bg_from']};
        --card-bg-to:        {t['card_bg_to']};
        --spinner-color:     {t['spinner']};
    }}
    </style>
    """


# ─────────────────────────────────────────────────────────────────────────────
# GLOBAL CSS — token-driven design system (all colours via CSS custom properties)
# ─────────────────────────────────────────────────────────────────────────────
st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    /* ── Hide Streamlit chrome ── */
    #MainMenu, header, footer { visibility: hidden; }
    .block-container { padding-top: 0 !important; }

    /* ── Base ── */
    html, body, .stApp {
        background-color: var(--bg-base);
        color: var(--text-primary);
        font-family: 'Inter', system-ui, sans-serif;
        transition: background-color 0.35s ease, color 0.35s ease;
    }

    /* ── Header ── */
    .app-header-bar {
        display: flex;
        align-items: center;
        padding: 14px 2px 10px 2px;
        border-bottom: 1px solid var(--border-default);
        margin-bottom: 2px;
    }
    .nav-brand-block {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .nav-hex-mark {
        font-size: 1.7rem;
        background: var(--accent-grad);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        line-height: 1;
    }
    .nav-title {
        font-weight: 800;
        font-size: 1.25rem;
        background: var(--accent-grad);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        letter-spacing: -0.04em;
        line-height: 1.15;
    }
    .nav-sub {
        color: var(--text-muted);
        font-size: 0.68rem;
        font-weight: 600;
        letter-spacing: 0.09em;
        text-transform: uppercase;
    }
    .nav-theme-pill {
        font-size: 0.62rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--text-muted);
        padding: 3px 0;
        text-align: center;
        display: block;
    }
    /* Swatch buttons styled by inline JS */
    button.sw-btn {
        width: 32px !important;
        height: 32px !important;
        min-height: 32px !important;
        border-radius: 50% !important;
        padding: 0 !important;
        font-size: 0.9rem !important;
        line-height: 1 !important;
        box-shadow: none !important;
        transition: transform 0.18s ease, box-shadow 0.18s ease !important;
    }
    button.sw-btn:hover {
        transform: scale(1.18) !important;
    }
    button.sw-btn.sw-active {
        box-shadow: 0 0 0 3px rgba(255,255,255,0.55) !important;
        transform: scale(1.15) !important;
    }
    .header-sep {
        width: 1px;
        height: 30px;
        background: var(--border-default);
        margin: auto;
    }

    /* ── Section labels ── */
    .section-label {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 6px;
    }
    .section-label-bar {
        width: 3px;
        height: 18px;
        border-radius: 2px;
    }
    .section-label-text {
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
    }

    /* ── Upload zone ── */
    [data-testid="stFileUploaderDropzone"] {
        background-color: var(--bg-surface) !important;
        border: 2px dashed var(--border-default) !important;
        border-radius: 12px !important;
        transition: border-color 0.2s ease !important;
    }
    [data-testid="stFileUploaderDropzone"]:hover {
        border-color: var(--accent) !important;
    }
    [data-testid="stFileUploaderDropzone"] p,
    [data-testid="stFileUploaderDropzone"] span,
    [data-testid="stFileUploaderDropzone"] small {
        color: var(--text-muted) !important;
    }
    [data-testid="stFileUploader"] label { color: var(--text-secondary) !important; }

    /* ── Inputs & textareas ── */
    .stTextInput > div > div > input,
    .stTextArea textarea {
        background-color: var(--input-bg) !important;
        color: var(--text-primary) !important;
        border: 1px solid var(--border-default) !important;
        border-radius: 8px !important;
        font-family: 'Inter', sans-serif !important;
        transition: background-color 0.3s, color 0.3s, border-color 0.2s, box-shadow 0.2s !important;
    }
    .stTextInput > div > div > input:focus,
    .stTextArea textarea:focus {
        border-color: var(--accent) !important;
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 15%, transparent) !important;
    }
    .stTextInput label, .stTextArea label {
        color: var(--text-muted) !important;
        font-size: 0.78rem !important;
        font-weight: 600 !important;
        letter-spacing: 0.06em !important;
        text-transform: uppercase !important;
    }

    /* ── Buttons ── */
    .stButton > button,
    .stFormSubmitButton > button {
        background: linear-gradient(135deg, var(--btn-from) 0%, var(--btn-to) 100%) !important;
        color: white !important;
        border: none !important;
        font-weight: 700 !important;
        font-size: 0.92rem !important;
        padding: 13px 28px !important;
        border-radius: 10px !important;
        transition: all 0.2s ease-in-out !important;
        box-shadow: 0 4px 16px var(--btn-glow) !important;
        letter-spacing: 0.01em !important;
        font-family: 'Inter', sans-serif !important;
    }
    .stButton > button:hover,
    .stFormSubmitButton > button:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 8px 24px var(--btn-glow-hover) !important;
    }
    .stButton > button:active,
    .stFormSubmitButton > button:active {
        transform: translateY(0px) !important;
    }

    /* ── Tabs ── */
    .stTabs [data-baseweb="tab-list"] {
        gap: 6px;
        background-color: var(--bg-surface);
        padding: 5px;
        border-radius: 12px;
        border: 1px solid var(--border-default);
        width: fit-content;
        transition: background-color 0.3s;
    }
    .stTabs [data-baseweb="tab"] {
        height: 38px;
        white-space: pre;
        background-color: transparent;
        border-radius: 8px;
        color: var(--text-muted);
        font-weight: 600;
        font-size: 0.88rem;
        transition: all 0.2s;
        border: none !important;
        padding: 0 18px;
        font-family: 'Inter', sans-serif !important;
    }
    .stTabs [data-baseweb="tab"]:hover { color: var(--text-secondary); }
    .stTabs [aria-selected="true"] {
        background: var(--tab-active-bg) !important;
        color: var(--accent) !important;
        font-weight: 700 !important;
        box-shadow: 0 2px 8px var(--tab-active-shadow) !important;
    }

    /* ── Cards ── */
    .ui-card {
        background: linear-gradient(135deg, var(--card-bg-from) 0%, var(--card-bg-to) 100%);
        border-radius: 14px;
        padding: 22px 24px;
        border: 1px solid var(--border-default);
        margin-bottom: 16px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.15);
        transition: border-color 0.2s, background 0.3s;
    }
    .ui-card:hover { filter: brightness(1.04); }
    .card-match  { border-left: 4px solid #10B981; }
    .card-missing{ border-left: 4px solid #EF4444; }
    .card-info   { border-left: 4px solid #3B82F6; }
    .card-purple { border-left: 4px solid var(--accent); }

    /* ── Resume preview ── */
    .resume-preview {
        background: #FFFFFF;
        color: #1a1a1a;
        border-radius: 8px;
        padding: 48px 56px;
        font-family: 'Georgia', 'Times New Roman', serif;
        font-size: 0.95rem;
        line-height: 1.7;
        box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        max-width: 780px;
        margin: 0 auto;
    }
    .resume-preview h1, .resume-preview h2, .resume-preview h3 {
        color: #111 !important;
    }
    .resume-preview h1 { font-size: 1.8rem; border-bottom: 2px solid #4F46E5; padding-bottom: 6px; }
    .resume-preview h2 { font-size: 1.1rem; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-top: 24px; }
    .resume-preview ul { padding-left: 20px; }
    .resume-preview li { margin-bottom: 4px; }
    .resume-preview a { color: #4F46E5; }

    /* ── Score ring legend ── */
    .score-ring-container {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px 0;
    }

    /* ── Misc ── */
    .stSpinner > div { border-top-color: var(--spinner-color) !important; }
    .stAlert { border-radius: 10px !important; }
    [data-testid="stMetricValue"] { color: var(--accent) !important; font-weight: 800 !important; }
    </style>
""", unsafe_allow_html=True)


# ─────────────────────────────────────────────────────────────────────────────
# 💡  LAMP TOGGLE LOGIN — Custom Component v2
# ─────────────────────────────────────────────────────────────────────────────
HTML_CONTENT = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: transparent; }

.login-page {
  min-height: 100vh;
  width: 100%;
  background: radial-gradient(ellipse at 50% -20%, rgba(124,58,237,0.12) 0%, #080B11 60%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: 'Inter', system-ui, sans-serif;
  padding: 40px 20px;
  position: relative;
  overflow: hidden;
}

/* Ambient background dots */
.login-page::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(168,85,247,0.06) 1px, transparent 1px);
  background-size: 32px 32px;
  pointer-events: none;
}

/* Brand above lamp */
.login-brand {
  text-align: center;
  margin-bottom: 32px;
  position: relative;
  z-index: 20;
}
.login-brand-name {
  font-size: 2rem;
  font-weight: 800;
  background: linear-gradient(135deg, #A855F7 0%, #3B82F6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.04em;
}
.login-brand-tagline {
  font-size: 0.78rem;
  color: #475569;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-top: 4px;
}

/* Lamp area */
.lamp-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 20;
  margin-bottom: 8px;
}

/* Hanging cord */
.lamp-cord {
  width: 2px;
  height: 44px;
  background: linear-gradient(to bottom, #334155, #475569);
  border-radius: 1px;
  margin-bottom: -4px;
}

/* Lamp clickable */
.lamp-btn {
  cursor: pointer;
  transition: transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}
.lamp-btn:hover { transform: scale(1.08); }
.lamp-btn.on { transform: rotate(180deg); }

/* Lamp SVG coloring */
.lamp-svg { transition: fill 0.5s ease, filter 0.5s ease; }
.lamp-svg.off { fill: #3F3F46; filter: drop-shadow(0 0 0px rgba(252,211,77,0)); }
.lamp-svg.on  { fill: #FCD34D; filter: drop-shadow(0 0 18px rgba(252,211,77,0.7)); }

/* Glow beneath lamp */
.lamp-glow {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%) scaleY(0.3) scaleX(0.5);
  width: 320px;
  height: 320px;
  background: radial-gradient(circle, rgba(252,211,77,0.3) 0%, transparent 70%);
  border-radius: 50%;
  filter: blur(30px);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.8s cubic-bezier(0.16,1,0.3,1),
              transform 0.8s cubic-bezier(0.16,1,0.3,1);
}
.lamp-glow.on {
  opacity: 1;
  transform: translateX(-50%) scaleY(1) scaleX(1.2);
}

/* Hint text */
.lamp-hint {
  font-size: 0.78rem;
  color: #475569;
  letter-spacing: 0.06em;
  margin-top: 16px;
  transition: opacity 0.4s;
  position: relative;
  z-index: 20;
}
.lamp-hint.dim { opacity: 0; pointer-events: none; }

/* Form card */
.form-card-wrap {
  width: 100%;
  max-width: 400px;
  margin-top: 24px;
  position: relative;
  z-index: 20;
  opacity: 0;
  transform: translateY(-24px);
  pointer-events: none;
  transition: opacity 0.55s cubic-bezier(0.16,1,0.3,1),
              transform 0.55s cubic-bezier(0.16,1,0.3,1);
}
.form-card-wrap.visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.form-card {
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid #1E293B;
  border-radius: 20px;
  padding: 36px 32px;
  box-shadow: 0 30px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03);
  backdrop-filter: blur(20px);
}

.form-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: #F8FAFC;
  text-align: center;
  margin-bottom: 4px;
  letter-spacing: -0.03em;
}
.form-subtitle {
  font-size: 0.8rem;
  color: #475569;
  text-align: center;
  margin-bottom: 28px;
}

.form-fields { display: flex; flex-direction: column; gap: 14px; }

.field-wrap { position: relative; }

.field-label {
  display: block;
  font-size: 0.72rem;
  font-weight: 600;
  color: #64748B;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  padding-right: 44px;
  background: #080B11;
  border: 1px solid #1E293B;
  border-radius: 10px;
  color: #F8FAFC;
  font-size: 0.93rem;
  font-family: 'Inter', sans-serif;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.form-input::placeholder { color: #334155; }
.form-input:focus {
  outline: none;
  border-color: #FCD34D;
  box-shadow: 0 0 0 3px rgba(252,211,77,0.12);
}
.form-input.error {
  border-color: #EF4444;
  box-shadow: 0 0 0 3px rgba(239,68,68,0.12);
  animation: shake 0.35s ease;
}
@keyframes shake {
  0%,100%{ transform: translateX(0); }
  20%{ transform: translateX(-6px); }
  40%{ transform: translateX(6px); }
  60%{ transform: translateX(-4px); }
  80%{ transform: translateX(4px); }
}

/* Password eye toggle */
.eye-btn {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #475569;
  padding: 2px;
  display: flex;
  align-items: center;
  transition: color 0.2s;
}
.eye-btn:hover { color: #94A3B8; }

.field-error {
  font-size: 0.73rem;
  color: #EF4444;
  margin-top: 4px;
  display: none;
}
.field-error.show { display: block; }

/* Submit */
.submit-btn {
  width: 100%;
  margin-top: 8px;
  padding: 13px;
  background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
  color: #09090b;
  font-weight: 700;
  font-size: 0.95rem;
  font-family: 'Inter', sans-serif;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 16px rgba(245,158,11,0.25);
  letter-spacing: 0.01em;
}
.submit-btn:hover { transform: translateY(-1px); filter: brightness(1.08); box-shadow: 0 8px 24px rgba(245,158,11,0.35); }
.submit-btn:active { transform: translateY(0); }
.submit-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
</style>

<div class="login-page">
  <div class="login-brand">
    <div class="login-brand-name">ResuAI //</div>
    <div class="login-brand-tagline">Your AI-powered career toolkit</div>
  </div>

  <div class="lamp-area">
    <div class="lamp-cord"></div>
    <div class="lamp-btn" id="lamp-btn">
      <svg id="lamp-svg" class="lamp-svg off" width="110" height="110" viewBox="0 0 24 24">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm2.5 18H9.5v1c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-1z"/>
      </svg>
      <div class="lamp-glow" id="lamp-glow"></div>
    </div>
  </div>

  <div class="lamp-hint" id="lamp-hint">Click the lamp to reveal login</div>

  <div class="form-card-wrap" id="form-card-wrap">
    <div class="form-card">
      <div class="form-title">Welcome to the Light</div>
      <div class="form-subtitle">Sign in to access your career toolkit</div>

      <form id="login-form" class="form-fields" novalidate>
        <div class="field-wrap">
          <label class="field-label" for="email-input">Email address</label>
          <input class="form-input" id="email-input" type="email" placeholder="you@example.com" autocomplete="email" />
          <div class="field-error" id="email-error">Please enter a valid email address.</div>
        </div>

        <div class="field-wrap">
          <label class="field-label" for="password-input">Password</label>
          <input class="form-input" id="password-input" type="password" placeholder="••••••••" autocomplete="current-password" />
          <button type="button" class="eye-btn" id="eye-btn" aria-label="Toggle password visibility">
            <svg id="eye-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          <div class="field-error" id="password-error">Password is required.</div>
        </div>

        <button type="submit" class="submit-btn" id="submit-btn">Authenticate</button>
      </form>
    </div>
  </div>
</div>
"""

JS_CONTENT = """\
export default function (component) {
  const { parentElement, setStateValue } = component;

  const lampBtn     = parentElement.querySelector('#lamp-btn');
  const lampSvg     = parentElement.querySelector('#lamp-svg');
  const lampGlow    = parentElement.querySelector('#lamp-glow');
  const lampHint    = parentElement.querySelector('#lamp-hint');
  const formWrap    = parentElement.querySelector('#form-card-wrap');
  const form        = parentElement.querySelector('#login-form');
  const emailInput  = parentElement.querySelector('#email-input');
  const passInput   = parentElement.querySelector('#password-input');
  const eyeBtn      = parentElement.querySelector('#eye-btn');
  const eyeIcon     = parentElement.querySelector('#eye-icon');
  const submitBtn   = parentElement.querySelector('#submit-btn');
  const emailErr    = parentElement.querySelector('#email-error');
  const passErr     = parentElement.querySelector('#password-error');

  let isOn = false;
  let pwVisible = false;

  // ── Lamp toggle ──
  lampBtn.onclick = () => {
    isOn = !isOn;
    if (isOn) {
      lampBtn.classList.add('on');
      lampSvg.classList.replace('off', 'on');
      lampGlow.classList.add('on');
      lampHint.classList.add('dim');
      formWrap.classList.add('visible');
    } else {
      lampBtn.classList.remove('on');
      lampSvg.classList.replace('on', 'off');
      lampGlow.classList.remove('on');
      lampHint.classList.remove('dim');
      formWrap.classList.remove('visible');
    }
  };

  // ── Password eye toggle ──
  eyeBtn.onclick = () => {
    pwVisible = !pwVisible;
    passInput.type = pwVisible ? 'text' : 'password';
    eyeIcon.innerHTML = pwVisible
      ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>'
      : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    eyeIcon.setAttribute('fill', 'none');
    eyeIcon.setAttribute('stroke', 'currentColor');
    eyeIcon.setAttribute('stroke-width', '2');
  };

  // ── Inline validation ──
  function validateEmail(v) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v); }

  emailInput.oninput = () => {
    if (validateEmail(emailInput.value.trim())) {
      emailInput.classList.remove('error');
      emailErr.classList.remove('show');
    }
  };
  passInput.oninput = () => {
    if (passInput.value.length > 0) {
      passInput.classList.remove('error');
      passErr.classList.remove('show');
    }
  };

  // ── Form submit ──
  form.onsubmit = (e) => {
    e.preventDefault();
    let valid = true;

    if (!validateEmail(emailInput.value.trim())) {
      emailInput.classList.add('error');
      emailErr.classList.add('show');
      void emailInput.offsetWidth; // trigger reflow for shake re-animation
      valid = false;
    }
    if (passInput.value.length === 0) {
      passInput.classList.add('error');
      passErr.classList.add('show');
      void passInput.offsetWidth;
      valid = false;
    }
    if (!valid) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Authenticating…';
    setStateValue('authenticated', true);
  };
}
"""

_LAMP_LOGIN = st.components.v2.component(
    "lamp_login_v2",
    html=HTML_CONTENT,
    js=JS_CONTENT,
)


# ─────────────────────────────────────────────────────────────────────────────
# 🗂️  HEADER COMPONENT
# ─────────────────────────────────────────────────────────────────────────────
def render_header() -> None:
    """
    Render the sticky application header.

    Layout (using st.columns for interactivity):
      [Brand logo + name + tagline] ... [THEME label] [🌌][🌊][🔥][🌿][☀️] [│] [⇠ Sign Out]

    Theme swatches are Streamlit buttons styled as gradient circles via
    inline JS MutationObserver — no external dependencies required.
    """
    active_key = st.session_state.theme

    # One-row column layout: brand | gap | label | 5 swatches | sep | sign-out
    (
        col_brand, col_gap,
        col_lbl,
        col_t0, col_t1, col_t2, col_t3, col_t4,
        col_sep,
        col_out
    ) = st.columns([4.2, 0.4, 0.6, 0.52, 0.52, 0.52, 0.52, 0.52, 0.25, 1.65])

    # Brand block
    with col_brand:
        st.markdown("""
            <div class="nav-brand-block">
                <div class="nav-hex-mark">⬡</div>
                <div>
                    <div class="nav-title">ResuAI //</div>
                    <div class="nav-sub">Next-Gen Resume Engine</div>
                </div>
            </div>
        """, unsafe_allow_html=True)

    # "THEME" label
    with col_lbl:
        st.markdown(
            '<span class="nav-theme-pill">THEME</span>',
            unsafe_allow_html=True
        )

    # Five theme swatch buttons
    theme_keys = list(THEMES.keys())
    swatch_cols = [col_t0, col_t1, col_t2, col_t3, col_t4]
    for col, key in zip(swatch_cols, theme_keys):
        with col:
            if st.button(
                THEMES[key]["icon"],
                key=f"th_{key}",
                help=f"{THEMES[key]['name']} theme",
                use_container_width=False,
            ):
                st.session_state.theme = key
                st.rerun()

    # Visual divider
    with col_sep:
        st.markdown('<div class="header-sep"></div>', unsafe_allow_html=True)

    # Sign out
    with col_out:
        if st.button("⇠ Sign Out", key="signout_btn", use_container_width=True):
            st.session_state.authenticated = False
            st.session_state.pop("lamp_login", None)
            st.rerun()

    # JS: style swatch buttons as gradient circles; mark active one
    swatch_map_js = "{"
    swatch_map_js += ",".join(
        f"'{k}':'{THEMES[k]['swatch']}'"
        for k in THEMES
    )
    swatch_map_js += "}"

    icon_map_js = "{"
    icon_map_js += ",".join(
        f"'{THEMES[k]['icon']}':'{k}'"
        for k in THEMES
    )
    icon_map_js += "}"

    st.markdown(f"""
        <script>
        (function applySwatchStyles() {{
            const iconMap  = {icon_map_js};
            const gradMap  = {swatch_map_js};
            const activeKey = '{active_key}';

            function style() {{
                document.querySelectorAll('button').forEach(function(btn) {{
                    const icon = btn.textContent.trim();
                    const key  = iconMap[icon];
                    if (!key) return;

                    // Shape
                    btn.style.cssText = [
                        'width:32px', 'height:32px', 'min-height:32px',
                        'border-radius:50%', 'padding:0',
                        'font-size:0.88rem', 'line-height:1',
                        'background:' + gradMap[key],
                        'border: 2px solid ' + (key === activeKey ? 'rgba(255,255,255,0.7)' : 'transparent'),
                        'box-shadow:' + (key === activeKey
                            ? '0 0 0 3px rgba(255,255,255,0.25), 0 4px 12px rgba(0,0,0,0.4)'
                            : '0 2px 8px rgba(0,0,0,0.3)'),
                        'transform:' + (key === activeKey ? 'scale(1.15)' : 'scale(1)'),
                        'transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
                    ].join(';') + ';';
                }});
            }}

            style();
            // Re-apply after Streamlit re-renders
            new MutationObserver(style).observe(
                document.body, {{childList: true, subtree: true}}
            );
        }})();
        </script>
        <hr style="margin:10px 0 0 0; border:none; border-top:1px solid var(--border-default);">
    """, unsafe_allow_html=True)


# ─────────────────────────────────────────────────────────────────────────────
# STATE INIT (auth + theme)
# ─────────────────────────────────────────────────────────────────────────────
if "authenticated" not in st.session_state:
    st.session_state.authenticated = False

if "theme" not in st.session_state:
    st.session_state.theme = "cosmic"   # default theme

# Inject active theme CSS tokens on every run
st.markdown(get_theme_css(st.session_state.theme), unsafe_allow_html=True)

if not st.session_state.authenticated:
    result = _LAMP_LOGIN(key="lamp_login", height=750)
    component_state = st.session_state.get("lamp_login", {})
    if component_state.get("authenticated", False):
        st.session_state.authenticated = True
        st.rerun()
    st.stop()


# ─────────────────────────────────────────────────────────────────────────────
# REACT APP CUSTOM COMPONENT MOUNT & ACTION LOOP
# ─────────────────────────────────────────────────────────────────────────────

# Initialize message parameters in session state
if "report" not in st.session_state:
    st.session_state.report = None
if "markdown" not in st.session_state:
    st.session_state.markdown = None
if "extracted_text" not in st.session_state:
    st.session_state.extracted_text = None
if "error" not in st.session_state:
    st.session_state.error = None

# Send current state back to React via data
react_data = {
    "theme": st.session_state.theme,
    "report": st.session_state.report,
    "markdown": st.session_state.markdown,
    "extractedText": st.session_state.extracted_text,
    "error": st.session_state.error,
}

# Mount the component
res = react_app(key="resuai_app", data=react_data, height=950)

# Intercept events from React and process them in Python
if res:
    action = res.get("action")
    
    if action == "upload_pdf":
        import base64
        import io
        try:
            pdf_data = base64.b64decode(res["file_base64"])
            file_like = io.BytesIO(pdf_data)
            text = extract_text_from_pdf(file_like)
            st.session_state.extracted_text = text
            st.session_state.error = None
        except Exception as e:
            st.session_state.error = f"Failed to parse PDF: {str(e)}"
        st.rerun()

    elif action == "analyze":
        # Run analyze_resume inside shared engine
        report = analyze_resume(res["resume_text"], res["job_description"])
        if report:
            st.session_state.report = report
            st.session_state.error = None
        else:
            st.session_state.error = "Gemini analysis failed."
        st.rerun()

    elif action == "build":
        user_details = f"""
Name: {res.get('fullName')}
Email: {res.get('email')}
Phone: {res.get('phone')}
Target Job: {res.get('targetJob')}

Education:
{res.get('education')}

Skills:
{res.get('skills')}

Experience:
{res.get('workExperience')}
"""
        markdown = build_resume(user_details)
        if markdown:
            st.session_state.markdown = markdown
            st.session_state.error = None
        else:
            st.session_state.error = "Gemini build failed."
        st.rerun()

    elif action == "reset_analyzer":
        st.session_state.report = None
        st.session_state.extracted_text = None
        st.session_state.error = None
        st.rerun()

    elif action == "reset_builder":
        st.session_state.markdown = None
        st.session_state.error = None
        st.rerun()

    elif action == "set_theme":
        st.session_state.theme = res.get("theme", "cosmic")
        st.rerun()

    elif action == "logout":
        st.session_state.authenticated = False
        st.session_state.pop("lamp_login", None)
        st.rerun()


# ─────────────────────────────────────────────────────────────────────────────
# CORE LOGIC & BACKEND
# ─────────────────────────────────────────────────────────────────────────────
if not API_KEY:
    st.error("⚠️ GEMINI_API_KEY is missing. Add it to your .env file and restart.")
    st.stop()


from resume_engine import (
    extract_text_from_pdf,
    analyze_resume,
    build_resume,
)


# ─────────────────────────────────────────────────────────────────────────────
# HEADER (brand + theme switcher + sign out)
# ─────────────────────────────────────────────────────────────────────────────
render_header()

st.markdown("<div style='height:20px'></div>", unsafe_allow_html=True)

# ─────────────────────────────────────────────────────────────────────────────
# MAIN TABS
# ─────────────────────────────────────────────────────────────────────────────
tab1, tab2 = st.tabs(["  📊  Analyzer  ", "  ✨  Resume Builder  "])


# ═══════════════════════════════════════════════════════════════════════════
# TAB 1 — DIAGNOSTIC ANALYZER
# ═══════════════════════════════════════════════════════════════════════════
with tab1:
    st.markdown("<div style='height:16px'></div>", unsafe_allow_html=True)

    col1, col2 = st.columns([1, 1], gap="large")

    with col1:
        st.markdown("""
            <div class="section-label">
                <div class="section-label-bar" style="background:#A855F7;"></div>
                <span class="section-label-text" style="color:#A855F7;">Job Description</span>
            </div>
        """, unsafe_allow_html=True)
        st.caption("Paste the job description, requirements, or role specification.")
        jd_input = st.text_area(
            "Job description",
            height=300,
            placeholder="e.g.\n\nWe're looking for a Senior Frontend Engineer with 4+ years of React experience, strong TypeScript skills, and familiarity with AWS...",
            key="jd_ui",
            label_visibility="collapsed"
        )
        jd_chars = len(jd_input.split()) if jd_input else 0
        color = "#10B981" if 80 <= jd_chars <= 600 else "#F59E0B" if jd_chars > 0 else "#475569"
        st.markdown(
            f'<p style="font-size:0.75rem; color:{color}; text-align:right; margin-top:-8px;">'
            f'{jd_chars} words · recommended 80–600</p>',
            unsafe_allow_html=True
        )

    with col2:
        st.markdown("""
            <div class="section-label">
                <div class="section-label-bar" style="background:#3B82F6;"></div>
                <span class="section-label-text" style="color:#3B82F6;">Your Resume (PDF)</span>
            </div>
        """, unsafe_allow_html=True)
        st.caption("Upload your current resume as a PDF file.")
        uploaded_file = st.file_uploader(
            "Upload resume",
            type=["pdf"],
            key="pdf_ui",
            label_visibility="collapsed"
        )

        if uploaded_file:
            reader_preview = PdfReader(uploaded_file)
            page_count = len(reader_preview.pages)
            file_kb = round(uploaded_file.size / 1024, 1)
            st.markdown(f"""
                <div class="ui-card" style="margin-top:12px; padding:14px 18px; border-left: 4px solid #10B981;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:1.8rem;">📄</span>
                        <div>
                            <div style="font-weight:600; color:#F8FAFC; font-size:0.88rem;">{uploaded_file.name}</div>
                            <div style="color:#64748B; font-size:0.77rem; margin-top:2px;">{page_count} page{"s" if page_count != 1 else ""} · {file_kb} KB · PDF</div>
                        </div>
                    </div>
                </div>
            """, unsafe_allow_html=True)
        else:
            st.markdown("""
                <div style="margin-top:12px; padding:32px; border: 2px dashed #1E293B; border-radius:12px; text-align:center; color:#334155;">
                    <div style="font-size:2rem; margin-bottom:8px;">📁</div>
                    <div style="font-size:0.82rem; font-weight:600; color:#475569;">No file selected</div>
                    <div style="font-size:0.74rem; color:#334155; margin-top:4px;">Use the uploader above</div>
                </div>
            """, unsafe_allow_html=True)

    st.markdown("<div style='height:20px'></div>", unsafe_allow_html=True)

    btn_col, _ = st.columns([1, 2])
    with btn_col:
        run_analysis = st.button("🚀  Run ATS Analysis", use_container_width=True, key="run_btn")

    if run_analysis:
        if not jd_input or not uploaded_file:
            st.toast("Both a job description and a resume PDF are required.", icon="🚨")
        else:
            with st.spinner("Running deep semantic analysis…"):
                resume_text = extract_text_from_pdf(uploaded_file)
                uploaded_file.seek(0)
                report = analyze_resume(resume_text, jd_input)

            if report:
                st.session_state["last_report"] = report
                st.session_state["last_report_jd"] = jd_input

    if "last_report" in st.session_state:
        report = st.session_state["last_report"]
        score = report.get("match_percentage", 0)

        st.markdown("<div style='height:24px'></div>", unsafe_allow_html=True)
        st.markdown("""
            <div class="section-label">
                <div class="section-label-bar" style="background:#F59E0B; height:22px;"></div>
                <span class="section-label-text" style="color:#F59E0B; font-size:0.85rem;">Analysis Results</span>
            </div>
        """, unsafe_allow_html=True)

        # ── Score + Feedback row ──
        s1, s2, s3 = st.columns([1, 1, 1.5])

        with s1:
            # Custom circular SVG score ring
            radius = 54
            circumference = 2 * 3.14159 * radius
            dash = circumference * score / 100
            gap = circumference - dash
            score_color = "#10B981" if score >= 75 else "#F59E0B" if score >= 50 else "#EF4444"
            st.markdown(f"""
                <div class="ui-card" style="text-align:center; padding:28px;">
                    <svg width="150" height="150" viewBox="0 0 150 150">
                        <circle cx="75" cy="75" r="{radius}" fill="none" stroke="#1E293B" stroke-width="10"/>
                        <circle cx="75" cy="75" r="{radius}" fill="none"
                            stroke="{score_color}" stroke-width="10"
                            stroke-linecap="round"
                            stroke-dasharray="{dash:.1f} {gap:.1f}"
                            transform="rotate(-90 75 75)"
                            style="transition: stroke-dasharray 1s ease;"/>
                        <text x="75" y="70" text-anchor="middle" fill="{score_color}"
                            font-size="28" font-weight="800" font-family="Inter,sans-serif">{score}%</text>
                        <text x="75" y="92" text-anchor="middle" fill="#475569"
                            font-size="11" font-family="Inter,sans-serif">ATS Match</text>
                    </svg>
                    <div style="font-size:0.78rem; color:#475569; margin-top:4px; font-weight:500;">
                        {'Excellent' if score >= 75 else 'Needs work' if score >= 50 else 'Low match'}
                    </div>
                </div>
            """, unsafe_allow_html=True)

        with s2:
            matched = report.get("matched_keywords", [])
            missing = report.get("missing_keywords", [])
            st.markdown(f"""
                <div class="ui-card card-match" style="height:100%; min-height:190px;">
                    <div style="font-size:0.7rem; font-weight:700; color:#10B981; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:10px;">✅ Matched Keywords</div>
                    <div style="display:flex; flex-wrap:wrap; gap:6px;">
                        {"".join(f'<span style="background:#052e16; color:#10B981; border:1px solid #166534; font-size:0.75rem; padding:3px 9px; border-radius:20px; font-weight:500;">{k}</span>' for k in matched) or '<span style="color:#475569; font-size:0.82rem;">None detected</span>'}
                    </div>
                </div>
            """, unsafe_allow_html=True)

        with s3:
            st.markdown(f"""
                <div class="ui-card card-missing" style="height:100%; min-height:190px;">
                    <div style="font-size:0.7rem; font-weight:700; color:#EF4444; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:10px;">❌ Missing Keywords</div>
                    <div style="display:flex; flex-wrap:wrap; gap:6px;">
                        {"".join(f'<span style="background:#450a0a; color:#EF4444; border:1px solid #991b1b; font-size:0.75rem; padding:3px 9px; border-radius:20px; font-weight:500;">{k}</span>' for k in missing) or '<span style="color:#475569; font-size:0.82rem;">Great — no gaps found!</span>'}
                    </div>
                </div>
            """, unsafe_allow_html=True)

        # ── Feedback + Fixes row ──
        f1, f2 = st.columns([1, 1], gap="medium")

        with f1:
            feedback = report.get("formatting_feedback", "")
            st.markdown(f"""
                <div class="ui-card card-info">
                    <div style="font-size:0.7rem; font-weight:700; color:#3B82F6; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:10px;">📝 Formatting Feedback</div>
                    <p style="color:#CBD5E1; font-size:0.88rem; line-height:1.65; margin:0;">{feedback}</p>
                </div>
            """, unsafe_allow_html=True)

        with f2:
            fixes = report.get("actionable_fixes", [])
            fixes_html = "".join(
                f'<li style="margin-bottom:9px; color:#CBD5E1; font-size:0.88rem; line-height:1.5;">'
                f'<span style="color:#A855F7; font-weight:700; margin-right:4px;">→</span>{fix}</li>'
                for fix in fixes
            )
            st.markdown(f"""
                <div class="ui-card card-purple">
                    <div style="font-size:0.7rem; font-weight:700; color:#A855F7; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:10px;">🛠️ Recommended Fixes</div>
                    <ul style="padding-left:0; list-style:none; margin:0;">{fixes_html}</ul>
                </div>
            """, unsafe_allow_html=True)

        # ── Export buttons ──
        st.markdown("<div style='height:8px'></div>", unsafe_allow_html=True)
        ex1, ex2, _ = st.columns([0.25, 0.3, 1])
        with ex1:
            report_text = (
                f"ResuAI Analysis Report\n{'='*40}\n"
                f"ATS Match Score: {score}%\n\n"
                f"Matched Keywords:\n{', '.join(matched)}\n\n"
                f"Missing Keywords:\n{', '.join(missing)}\n\n"
                f"Formatting Feedback:\n{report.get('formatting_feedback','')}\n\n"
                f"Recommended Fixes:\n" + "\n".join(f"- {f}" for f in fixes)
            )
            st.download_button(
                "⬇️  Download Report",
                data=report_text,
                file_name="resuai_report.txt",
                mime="text/plain",
                use_container_width=True
            )
        with ex2:
            report_json = json.dumps(report, indent=2)
            st.download_button(
                "⬇️  Download JSON",
                data=report_json,
                file_name="resuai_report.json",
                mime="application/json",
                use_container_width=True
            )


# ═══════════════════════════════════════════════════════════════════════════
# TAB 2 — CREATIVE BUILDER ENGINE
# ═══════════════════════════════════════════════════════════════════════════
with tab2:
    st.markdown("<div style='height:16px'></div>", unsafe_allow_html=True)

    # Progress indicator
    st.markdown("""
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:28px;">
            <div style="display:flex; align-items:center; gap:8px;">
                <div style="width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#7C3AED,#4F46E5);display:flex;align-items:center;justify-content:center;font-size:0.72rem;font-weight:700;color:white;">1</div>
                <span style="font-size:0.8rem;font-weight:600;color:#A855F7;">Fill Details</span>
            </div>
            <div style="flex:1;max-width:60px;height:1px;background:#1E293B;"></div>
            <div style="display:flex; align-items:center; gap:8px;">
                <div style="width:26px;height:26px;border-radius:50%;background:#1E293B;border:1px solid #334155;display:flex;align-items:center;justify-content:center;font-size:0.72rem;font-weight:700;color:#475569;">2</div>
                <span style="font-size:0.8rem;font-weight:600;color:#475569;">Generate</span>
            </div>
            <div style="flex:1;max-width:60px;height:1px;background:#1E293B;"></div>
            <div style="display:flex; align-items:center; gap:8px;">
                <div style="width:26px;height:26px;border-radius:50%;background:#1E293B;border:1px solid #334155;display:flex;align-items:center;justify-content:center;font-size:0.72rem;font-weight:700;color:#475569;">3</div>
                <span style="font-size:0.8rem;font-weight:600;color:#475569;">Preview & Export</span>
            </div>
        </div>
    """, unsafe_allow_html=True)

    # ── Section 1: Personal Info ──
    st.markdown("""
        <div class="section-label" style="margin-bottom:12px;">
            <div class="section-label-bar" style="background:#A855F7;"></div>
            <span class="section-label-text" style="color:#A855F7;">Personal Information</span>
        </div>
    """, unsafe_allow_html=True)

    with st.form("modern_builder_form", border=False):
        p1, p2 = st.columns(2, gap="large")
        with p1:
            full_name = st.text_input("Full Name", placeholder="e.g. Priya Sharma")
            contact_info = st.text_input(
                "Email & Phone",
                placeholder="priya@email.com | +91 98765 43210"
            )
            target_role = st.text_input("Target Job Title", placeholder="e.g. Senior Product Designer")

        with p2:
            education = st.text_input(
                "Education",
                placeholder="e.g. B.Tech Computer Science — IIT Delhi, 2022"
            )
            skills = st.text_area(
                "Skills & Technologies",
                placeholder="e.g. Figma, React, TypeScript, Node.js, AWS, PostgreSQL",
                height=120
            )

        st.markdown("<div style='height:4px'></div>", unsafe_allow_html=True)

        st.markdown("""
            <div class="section-label" style="margin-bottom:12px;">
                <div class="section-label-bar" style="background:#3B82F6;"></div>
                <span class="section-label-text" style="color:#3B82F6;">Work Experience & Projects</span>
            </div>
        """, unsafe_allow_html=True)
        experience = st.text_area(
            "Work experience",
            placeholder=(
                "Describe 2–3 key roles or projects with measurable outcomes:\n\n"
                "• Senior Developer @ Acme Corp (2022–Present): Led migration of monolith to microservices, "
                "reducing API latency by 40%\n"
                "• Built an e-commerce platform serving 15k+ monthly active users using React + Node.js\n"
                "• Open-source contributor to XYZ library (500+ GitHub stars)"
            ),
            height=200,
            label_visibility="collapsed"
        )

        linkedin_url = st.text_input("LinkedIn / Portfolio URL (optional)", placeholder="https://linkedin.com/in/yourname")

        st.markdown("<div style='height:12px'></div>", unsafe_allow_html=True)
        submit_build = st.form_submit_button("✨  Generate My Resume", use_container_width=True)

    if submit_build:
        if not full_name or not experience:
            st.toast("Full Name and Work Experience are required to generate a resume.", icon="⚠️")
        else:
            with st.spinner("Crafting your resume with AI…"):
                raw_payload = (
                    f"Name: {full_name}\n"
                    f"Contact: {contact_info}\n"
                    f"LinkedIn/Portfolio: {linkedin_url}\n"
                    f"Target Role: {target_role}\n"
                    f"Skills: {skills}\n"
                    f"Experience: {experience}\n"
                    f"Education: {education}"
                )
                drafted_resume = build_resume(raw_payload)
                if drafted_resume:
                    st.session_state["drafted_resume"] = drafted_resume
                    st.session_state["resume_raw_payload"] = raw_payload

    # ── Output section ──
    if "drafted_resume" in st.session_state:
        drafted_resume = st.session_state["drafted_resume"]

        st.markdown("<div style='height:20px'></div>", unsafe_allow_html=True)
        st.markdown("""
            <div class="section-label">
                <div class="section-label-bar" style="background:#10B981; height:22px;"></div>
                <span class="section-label-text" style="color:#10B981; font-size:0.85rem;">Your Generated Resume</span>
            </div>
        """, unsafe_allow_html=True)

        # View toggle
        view_mode = st.radio(
            "View as",
            ["📝 Markdown Source", "👁️ Preview (Paper Layout)"],
            horizontal=True,
            key="view_mode_toggle"
        )

        if view_mode == "👁️ Preview (Paper Layout)":
            import re
            # Render markdown as styled preview
            lines = drafted_resume.split('\n')
            preview_html = ""
            for line in lines:
                line = line.strip()
                if line.startswith("# "):
                    preview_html += f'<h1>{line[2:]}</h1>'
                elif line.startswith("## "):
                    preview_html += f'<h2>{line[3:]}</h2>'
                elif line.startswith("### "):
                    preview_html += f'<h3>{line[4:]}</h3>'
                elif line.startswith("- ") or line.startswith("* "):
                    preview_html += f'<li>{line[2:]}</li>'
                elif line.startswith("**") and line.endswith("**"):
                    preview_html += f'<p><strong>{line[2:-2]}</strong></p>'
                elif line == "---":
                    preview_html += '<hr>'
                elif line:
                    # handle inline bold
                    line = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', line)
                    preview_html += f'<p>{line}</p>'

            st.markdown(f"""
                <div class="resume-preview">
                    {preview_html}
                </div>
            """, unsafe_allow_html=True)
        else:
            st.markdown(drafted_resume)

        # ── Export & Refine row ──
        st.markdown("<div style='height:16px'></div>", unsafe_allow_html=True)
        ex1, ex2, ex3 = st.columns([0.28, 0.28, 1])
        with ex1:
            st.download_button(
                "⬇️  Download .md",
                data=drafted_resume,
                file_name=f"{full_name.replace(' ','_') if 'full_name' in dir() else 'resume'}_resume.md",
                mime="text/markdown",
                use_container_width=True
            )
        with ex2:
            st.download_button(
                "⬇️  Download .txt",
                data=drafted_resume,
                file_name=f"{full_name.replace(' ','_') if 'full_name' in dir() else 'resume'}_resume.txt",
                mime="text/plain",
                use_container_width=True
            )

        # ── Refinement ──
        st.markdown("<div style='height:24px'></div>", unsafe_allow_html=True)
        st.markdown("""
            <div class="ui-card card-purple" style="padding:20px 24px;">
                <div style="font-size:0.7rem; font-weight:700; color:#A855F7; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:8px;">🔄 Refine with AI</div>
                <div style="font-size:0.83rem; color:#64748B;">Not happy with something? Give a one-line instruction and regenerate.</div>
            </div>
        """, unsafe_allow_html=True)

        refine_col, btn_col = st.columns([3, 1], gap="medium")
        with refine_col:
            refinement_note = st.text_input(
                "Refinement instruction",
                placeholder='e.g. "Make the summary punchier" or "Add more quantified metrics"',
                label_visibility="collapsed",
                key="refine_input"
            )
        with btn_col:
            if st.button("🔄  Regenerate", use_container_width=True, key="refine_btn"):
                if st.session_state.get("resume_raw_payload"):
                    with st.spinner("Refining your resume…"):
                        new_resume = build_resume(
                            st.session_state["resume_raw_payload"],
                            refinement_note=refinement_note
                        )
                        if new_resume:
                            st.session_state["drafted_resume"] = new_resume
                            st.rerun()