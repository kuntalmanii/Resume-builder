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
    const resumeDoc = targetEl || document.getElementById('printableResumeDoc') || document.getElementById('tailoredResumeDoc');
    if (!resumeDoc) {
      window.print();
      return;
    }

    // Trigger Getting Started Checklist task completion
    if (window.checklistManager) {
      window.checklistManager.markTaskComplete('download_resume');
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
  <link rel="stylesheet" href="/src/client/styles/styles.css?v=2.5" />
  <style>
    ${styles.pageSizeCss}
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      background: #ffffff !important;
      color: #1a1a2e !important;
      font-family: ${styles.bodyFont};
      font-size: 9.5pt;
      line-height: 1.55;
      padding: 0 !important;
      margin: 0 !important;
    }
    .preview-paper-sheet {
      box-shadow: none !important;
      border: none !important;
      width: 100% !important;
      max-width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
      background: #ffffff !important;
      font-family: ${styles.bodyFont};
    }
    @media print {
      html, body {
        padding: 0 !important;
        margin: 0 !important;
        background: #ffffff !important;
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
