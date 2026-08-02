/**
 * ResuAI // High-Resolution Vector PDF Exporter Module (pdf-exporter.js)
 * Manages crisp, text-selectable PDF downloads, print preview boundaries,
 * and page-break optimization.
 */

class PdfExporter {
  constructor() {
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.bindExportButtons();
    this.initialized = true;
  }

  bindExportButtons() {
    const btnPrint = document.getElementById('btnPrintPdf');
    const btnExportTop = document.getElementById('topbarExportPdf');
    const btnExportPdf = document.getElementById('btnExportPdf');
    const btnExportPdfPreview = document.getElementById('btnExportPdfPreview');

    const triggerPrint = (e) => {
      if (e) e.preventDefault();
      this.generatePrintPdf();
    };

    if (btnPrint) btnPrint.addEventListener('click', triggerPrint);
    if (btnExportTop) btnExportTop.addEventListener('click', triggerPrint);
    if (btnExportPdf) btnExportPdf.addEventListener('click', triggerPrint);
    if (btnExportPdfPreview) btnExportPdfPreview.addEventListener('click', triggerPrint);
  }

  generatePrintPdf() {
    const editorBody = document.querySelector('.doc-editor-body');
    if (!editorBody) return;

    // Trigger Getting Started Checklist task completion
    if (window.checklistManager) {
      window.checklistManager.markTaskComplete('download_resume');
    }

    // Launch crisp native print preview for 100% vector text selection
    window.print();
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
