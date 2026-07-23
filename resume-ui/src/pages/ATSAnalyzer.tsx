import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, Upload, CheckCircle2, AlertTriangle, HelpCircle, FileText, Sparkles } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { GradientButton } from '../components/ui/GradientButton';
import { useStreamlit } from '../hooks/useStreamlit';

export const ATSAnalyzer = () => {
  const { data, sendToStreamlit } = useStreamlit();
  
  const [jd, setJd] = useState('');
  const [fileName, setFileName] = useState('');
  const [extractedText, setExtractedText] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState('');

  // Sync state changes from Streamlit parent
  useEffect(() => {
    if (data.extractedText) {
      setExtractedText(data.extractedText);
      setIsUploading(false);
    }
    if (data.report) {
      setReport(data.report);
      setAnalyzing(false);
    }
    if (data.error) {
      setError(data.error);
      setIsUploading(false);
      setAnalyzing(false);
    }
  }, [data]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFileName(selectedFile.name);
    setIsUploading(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        sendToStreamlit({
          action: 'upload_pdf',
          file_base64: base64,
          filename: selectedFile.name,
        });
      };
      reader.onerror = () => {
        throw new Error('Failed to read file.');
      };
      reader.readAsDataURL(selectedFile);
    } catch (err: any) {
      setError(err.message || 'Error uploading file.');
      setIsUploading(false);
    }
  };

  const handleRunAnalysis = () => {
    if (!extractedText) {
      setError('Please upload a resume first.');
      return;
    }
    if (!jd) {
      setError('Please enter a target Job Description.');
      return;
    }

    setAnalyzing(true);
    setError('');
    sendToStreamlit({
      action: 'analyze',
      resume_text: extractedText,
      job_description: jd,
    });
  };

  const resetAnalyzer = () => {
    setFileName('');
    setExtractedText('');
    setReport(null);
    setError('');
    sendToStreamlit({ action: 'reset_analyzer' });
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in">
      <Card variant="premium" className="relative overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-th-primary/5 filter blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-th-border pb-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-th-primary/10 text-th-primary mt-1">
              <BarChart2 size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-th-text tracking-tight">
                ATS Resume Diagnostics & Feedback
              </h1>
              <p className="text-sm text-th-text2 mt-1">
                Upload your resume and enter a target JD to run deep semantic analysis using Gemini.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-danger/10 border border-danger/20 text-danger text-sm font-semibold mb-6">
            {error}
          </div>
        )}

        {!report && !analyzing && (
          <div className="flex flex-col gap-6">
            {/* Input Row: JD (left) and PDF Upload (right) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Target Job Description */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-th-text2">
                  Target Job Description
                </label>
                <textarea
                  value={jd}
                  onChange={(e) => setJd(e.target.value)}
                  placeholder="Paste the target job description details here to match keywords and formatting expectations..."
                  className="w-full h-[220px] rounded-2xl border border-th-inputb bg-th-input text-th-text p-4 resize-none transition-all duration-200 input-focus"
                />
              </div>

              {/* PDF Uploader */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-th-text2">
                  Resume PDF File
                </label>
                <div className="flex flex-col items-center justify-center h-[220px] border-2 border-dashed border-th-border rounded-3xl bg-th-card/25 transition-all hover:border-th-primary relative">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 rounded-full border-4 border-th-border border-t-th-primary animate-spin" />
                      <span className="text-xs font-bold text-th-text2">Extracting text...</span>
                    </div>
                  ) : fileName ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 rounded-2xl bg-th-primary/10 text-th-primary">
                        <FileText size={24} />
                      </div>
                      <span className="text-sm font-semibold text-th-text">{fileName}</span>
                      <span className="text-xs text-success font-medium">Text successfully parsed</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload size={28} className="text-th-text3" />
                      <span className="text-sm font-bold text-th-text">Drag or click to upload PDF</span>
                      <span className="text-xs text-th-text3">Supports PDF resumes up to 5MB</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <GradientButton
              onClick={handleRunAnalysis}
              disabled={!extractedText || !jd}
              className="mt-4 self-start"
            >
              <Sparkles size={16} />
              Run ATS Analysis
            </GradientButton>
          </div>
        )}

        {analyzing && (
          <div className="flex flex-col items-center justify-center py-20 gap-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-th-primary/20 blur-xl animate-pulse-slow" />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                className="w-16 h-16 rounded-full border-4 border-th-border border-t-th-primary"
              />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-th-text">Analyzing resume keywords...</h3>
              <p className="text-sm text-th-text2 mt-1 max-w-sm">
                Parsing sections, testing keyword densities, and matching formatting guidelines.
              </p>
            </div>
          </div>
        )}

        {report && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-8"
          >
            {/* Top Score Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Score ring */}
              <div className="flex flex-col items-center justify-center p-6 border border-th-border rounded-3xl bg-th-card/30">
                <h4 className="text-sm font-bold text-th-text2 mb-4">ATS Compatibility Score</h4>
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <svg className="absolute w-full h-full transform -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="var(--border)"
                      strokeWidth="10"
                      fill="none"
                    />
                    <motion.circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke={report.match_percentage >= 75 ? '#22C55E' : '#A855F7'}
                      strokeWidth="10"
                      fill="none"
                      strokeDasharray={2 * Math.PI * 70}
                      initial={{ strokeDashoffset: 2 * Math.PI * 70 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 70 * (1 - report.match_percentage / 100) }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                    />
                  </svg>
                  <div className="text-center">
                    <span className="text-4xl font-extrabold text-th-text tracking-tight">
                      {report.match_percentage}%
                    </span>
                    <p className="text-[10px] text-th-text2 font-bold mt-1 uppercase">
                      {report.match_percentage >= 75 ? 'Grade A' : 'Grade B'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Matched Keywords */}
              <div className="p-6 border border-th-border rounded-3xl bg-th-card/30 flex flex-col gap-3">
                <h4 className="text-xs font-bold text-success uppercase tracking-widest flex items-center gap-1.5">
                  <CheckCircle2 size={15} /> Matched Keywords
                </h4>
                <div className="flex flex-wrap gap-2 overflow-y-auto max-h-[140px] pr-2">
                  {report.matched_keywords && report.matched_keywords.length > 0 ? (
                    report.matched_keywords.map((k: string) => (
                      <span
                        key={k}
                        className="text-xs px-2.5 py-1 rounded-full font-medium bg-success/10 text-success border border-success/20"
                      >
                        {k}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-th-text3">None detected</span>
                  )}
                </div>
              </div>

              {/* Missing Keywords */}
              <div className="p-6 border border-th-border rounded-3xl bg-th-card/30 flex flex-col gap-3">
                <h4 className="text-xs font-bold text-danger uppercase tracking-widest flex items-center gap-1.5">
                  <AlertTriangle size={15} /> Missing Keywords
                </h4>
                <div className="flex flex-wrap gap-2 overflow-y-auto max-h-[140px] pr-2">
                  {report.missing_keywords && report.missing_keywords.length > 0 ? (
                    report.missing_keywords.map((k: string) => (
                      <span
                        key={k}
                        className="text-xs px-2.5 py-1 rounded-full font-medium bg-danger/10 text-danger border border-danger/20"
                      >
                        {k}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-th-text3">Great - no gaps found!</span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Row: Feedback and Fixes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Formatting Feedback */}
              <div className="p-6 border border-th-border rounded-3xl bg-th-card/30 flex flex-col gap-3">
                <h4 className="text-xs font-bold text-th-primary uppercase tracking-widest flex items-center gap-1.5">
                  <HelpCircle size={15} /> Formatting Feedback
                </h4>
                <p className="text-sm text-th-text2 leading-relaxed">
                  {report.formatting_feedback}
                </p>
              </div>

              {/* Actionable Fixes */}
              <div className="p-6 border border-th-border rounded-3xl bg-th-card/30 flex flex-col gap-3">
                <h4 className="text-xs font-bold text-th-accent uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles size={15} /> Actionable Fixes
                </h4>
                <ul className="flex flex-col gap-2">
                  {report.actionable_fixes && report.actionable_fixes.map((fix: string, idx: number) => (
                    <li key={idx} className="text-xs text-th-text2 flex items-start gap-2">
                      <span className="text-th-primary font-bold">&rarr;</span>
                      <span>{fix}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex gap-4">
              <GradientButton onClick={resetAnalyzer}>
                Upload Another File
              </GradientButton>
            </div>
          </motion.div>
        )}
      </Card>
    </div>
  );
};
