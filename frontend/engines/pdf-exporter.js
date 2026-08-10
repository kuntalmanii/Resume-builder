/**
 * ResuAI // High-Resolution Vector PDF Exporter Module (pdf-exporter.js)
 * Manages crisp, text-selectable PDF downloads via hidden iframe rendering,
 * full template CSS inheritance, print preview boundaries, and page-break optimization.
 */

class PdfExporter {
  constructor() {
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.bindExportButtons();
    this.calculatePageBreaks();

    const paper = document.querySelector('.preview-paper-sheet');
    if (paper && typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => this.calculatePageBreaks());
      observer.observe(paper);
    }
    this.initialized = true;
  }

  bindExportButtons() {
    const btnPrint = document.getElementById('btnPrintPdf');
    const btnExportTop = document.getElementById('topbarExportPdf');
    const btnExportPdf = document.getElementById('btnExportPdf');
    const btnExportPdfPreview = document.getElementById('btnExportPdfPreview');
    const btnPrintPdfPreview = document.getElementById('btnPrintPdfPreview');

    const triggerPrint = (e) => {
      if (e) e.preventDefault();
      this.generatePrintPdf();
    };

    if (btnPrint) btnPrint.addEventListener('click', triggerPrint);
    if (btnExportTop) btnExportTop.addEventListener('click', triggerPrint);
    if (btnExportPdf) btnExportPdf.addEventListener('click', triggerPrint);
    if (btnExportPdfPreview) btnExportPdfPreview.addEventListener('click', triggerPrint);
    if (btnPrintPdfPreview) btnPrintPdfPreview.addEventListener('click', triggerPrint);
  }

  getStyles() {
    if (typeof window.getPdfExportStyles === 'function') {
      return window.getPdfExportStyles();
    }
    
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

  generatePrintPdf(targetEl = null) {
    const resumeDoc = targetEl || document.getElementById('printableResumeDoc');
    if (!resumeDoc) {
      window.print();
      return;
    }

    const styles = this.getStyles();
    const resumeHTML = resumeDoc.outerHTML;

    // Use or create a hidden iframe to prevent popup blockers and print clean vector document
    let iframe = document.getElementById('resuaiPrintIframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'resuaiPrintIframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Resume — ${document.getElementById('previewName')?.textContent || 'Resume'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="${styles.fontLink}" rel="stylesheet" />
  <link rel="stylesheet" href="/frontend/styles/styles.css?v=2.5" />
  <style>
    ${styles.pageSizeCss}
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      background: #ffffff !important;
      color: #1a1a2e !important;
      font-family: ${styles.bodyFont};
      font-size: 10pt;
      line-height: 1.55;
      padding: 0 !important;
      margin: 0 !important;
    }

    /* ── Paper shell: match on-screen preview exactly ── */
    .preview-paper-sheet {
      box-shadow: none !important;
      border: none !important;
      border-radius: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      min-height: unset !important;
      padding: 8mm 10mm !important;   /* preserve internal whitespace */
      margin: 0 !important;
      background: #ffffff !important;
      font-family: ${styles.bodyFont};
      display: block !important;
      transition: none !important;
      transform: none !important;
    }
    .preview-paper-sheet:hover {
      transform: none !important;
    }

    /* ── Candidate header ── */
    .paper-candidate-header {
      margin-bottom: 12px !important;
      padding-bottom: 10px !important;
      border-bottom: 2px solid #111 !important;
      text-align: center !important;
    }
    .paper-candidate-name,
    .doc-name-field {
      font-family: ${styles.headingFont}, Arial, sans-serif !important;
      font-size: 22px !important;       /* matches .paper-candidate-name base rule */
      font-weight: 700 !important;
      color: #111 !important;
      letter-spacing: -0.03em !important;
      line-height: 1.15 !important;
      text-transform: uppercase !important;
      text-align: center !important;
    }
    .paper-candidate-role,
    .doc-title-field {
      font-size: 11px !important;
      font-weight: 500 !important;
      color: #5E5E5E !important;
      margin-top: 3px !important;
      letter-spacing: normal !important;
      text-align: center !important;
    }

    /* ── Contact row ── */
    .paper-contact-row {
      display: flex !important;
      flex-wrap: wrap !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 3px 10px !important;
      margin-top: 6px !important;
      font-size: 9px !important;
      color: #5E5E5E !important;
    }
    .paper-contact-row a { color: inherit !important; text-decoration: none !important; }
    .contact-chip {
      display: inline-flex !important;
      align-items: center !important;
      gap: 3px !important;
      font-size: 9px !important;
      color: #374151 !important;
      white-space: nowrap !important;
    }
    .contact-chip svg, .contact-chip svg.feather, .contact-chip i {
      width: 9px !important; height: 9px !important;
      stroke-width: 2 !important; stroke: #4b5563 !important;
      fill: none !important; display: inline-block !important;
      vertical-align: middle !important; flex-shrink: 0 !important;
    }
    .contact-divider { color: #9ca3af !important; margin: 0 1px !important; }

    /* ── Sections: compact padding matching on-screen preview ── */
    .paper-section,
    .doc-section-block {
      padding: 10px 0 !important;      /* was 32px — the main gap culprit */
      margin-bottom: 0 !important;
      border-bottom: 1px solid rgba(0,0,0,0.06) !important;
      break-inside: avoid !important;
      transition: none !important;
      opacity: 1 !important;
      filter: none !important;
    }
    .paper-section:first-child,
    .doc-section-block:first-child { padding-top: 0 !important; }
    .paper-section:last-child,
    .doc-section-block:last-child { border-bottom: none !important; padding-bottom: 0 !important; }

    /* ── Section titles ── */
    .paper-section-title,
    .doc-section-label {
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
      font-size: 8.5px !important;
      font-weight: 700 !important;
      color: #111 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.1em !important;
      margin-bottom: 6px !important;
      padding-bottom: 3px !important;
      border-bottom: 1px solid #ECE8E1 !important;
      user-select: none !important;
    }
    .doc-section-label::after { display: none !important; }
    .section-accent-bar {
      width: 12px !important; height: 2px !important;
      background: var(--accent, #C98B4A) !important;
      border-radius: 1px !important; flex-shrink: 0 !important;
    }

    /* ── Body text ── */
    .section-content, .exp-list, .exp-list li, .doc-field,
    .doc-bullet-text, .paper-section p {
      font-size: 9.5px !important;
      color: #333 !important;
      line-height: 1.55 !important;
      font-family: ${styles.bodyFont}, Arial, sans-serif !important;
    }
    .exp-list { list-style: disc !important; padding-left: 14px !important; }
    .exp-list li { margin-bottom: 2px !important; }

    /* ── Hide all editor-only chrome ── */
    .doc-section-hover-actions, .doc-sha-btn,
    .doc-skill-suggestion-chip, [contenteditable]:empty::before { display: none !important; }

    /* ── Print media block ── */
    @media print {
      html, body {
        font-family: ${styles.bodyFont}, Arial, Helvetica, sans-serif !important;
        font-size: 10pt !important;
        line-height: 1.55 !important;
        color: #1a1a2e !important;
        padding: 0 !important; margin: 0 !important;
        background: #ffffff !important;
      }
      .preview-paper-sheet {
        font-family: ${styles.bodyFont}, Arial, Helvetica, sans-serif !important;
      }
      .paper-candidate-name, .doc-name-field {
        font-family: ${styles.headingFont}, Arial, Helvetica, sans-serif !important;
      }
    }
  </style>
</head>
<body>
  ${resumeHTML}
</body>
</html>`);
    doc.close();

    // Trigger vector print prompt after styles & assets load
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.error('Iframe print error fallback:', err);
        window.print();
      }
    }, 350);
  }

  calculatePageBreaks() {
    const paper = document.querySelector('.preview-paper-sheet');
    if (!paper) return;

    const paperHeightPx = paper.offsetHeight;
    const pageHeightPx = 1056; // Standard 11in print page at 96dpi

    const totalPages = Math.ceil(paperHeightPx / pageHeightPx);

    const pagesBadge = document.getElementById('printPageCountBadge');
    if (pagesBadge) {
      pagesBadge.textContent = `${totalPages} Page${totalPages > 1 ? 's' : ''}`;
    }
  }
}

// Global initialization
window.pdfExporter = new PdfExporter();
document.addEventListener('DOMContentLoaded', () => window.pdfExporter.init());
