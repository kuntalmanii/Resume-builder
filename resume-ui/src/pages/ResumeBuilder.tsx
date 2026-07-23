import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, ArrowLeft, Download, Check, RefreshCw, Sparkles } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { ResumeStepper } from '../components/ResumeStepper';
import { ATSBadge } from '../components/ATSBadge';
import { ResumeForm } from '../components/ResumeForm';
import { GradientButton } from '../components/ui/GradientButton';
import { useStreamlit } from '../hooks/useStreamlit';

export const ResumeBuilder = () => {
  const { data, sendToStreamlit } = useStreamlit();
  
  const [step, setStep] = useState(1);
  const [resumeData, setResumeData] = useState<any>(null);
  const [markdown, setMarkdown] = useState('');
  const [error, setError] = useState('');

  // Sync builder changes from Streamlit parent
  useEffect(() => {
    if (data.markdown) {
      setMarkdown(data.markdown);
      setStep(3);
    }
    if (data.error) {
      setError(data.error);
      setStep(1);
    }
  }, [data]);

  const handleFormSubmit = (formData: any) => {
    setResumeData(formData);
    setStep(2);
    setError('');

    sendToStreamlit({
      action: 'build',
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      targetJob: formData.targetJob,
      education: formData.education,
      skills: formData.skills,
      workExperience: formData.workExperience,
    });
  };

  const handleBack = () => {
    setStep(1);
    sendToStreamlit({ action: 'reset_builder' });
  };

  const renderResumeMarkdown = () => {
    if (!markdown) return null;
    
    return (
      <div className="text-left text-slate-800 text-xs font-sans space-y-4">
        {markdown.split('\n\n').map((paragraph, index) => {
          const trimmed = paragraph.trim();
          if (trimmed.startsWith('# ')) {
            return (
              <h1 key={index} className="text-2xl font-bold tracking-tight text-slate-900 border-b pb-2">
                {trimmed.replace('# ', '')}
              </h1>
            );
          }
          if (trimmed.startsWith('## ')) {
            return (
              <h2 key={index} className="text-sm font-bold text-indigo-850 uppercase tracking-widest border-b pb-1">
                {trimmed.replace('## ', '')}
              </h2>
            );
          }
          if (trimmed.startsWith('### ')) {
            return (
              <h3 key={index} className="text-xs font-bold text-slate-850">
                {trimmed.replace('### ', '')}
              </h3>
            );
          }
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return (
              <ul key={index} className="list-disc pl-4 space-y-1">
                {trimmed.split('\n').map((line, i) => (
                  <li key={i}>{line.replace(/^[-*]\s+/, '')}</li>
                ))}
              </ul>
            );
          }
          return <p key={index} className="leading-relaxed whitespace-pre-wrap">{trimmed}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in">
      <Card variant="premium" className="relative overflow-hidden">
        {/* Glow behind card */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-th-primary/5 filter blur-3xl pointer-events-none" />
        
        {/* ── Progress Stepper ── */}
        <ResumeStepper currentStep={step} />

        {error && (
          <div className="p-4 rounded-2xl bg-danger/10 border border-danger/20 text-danger text-sm font-semibold mb-6">
            {error}
          </div>
        )}

        {/* ── STEP 1: FORM ── */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-8"
          >
            {/* Header section inside card */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-th-border pb-6">
              <div className="flex items-start gap-4">
                <div className="p-3.5 rounded-2xl bg-th-primary/10 text-th-primary mt-1">
                  <FileText size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-th-text tracking-tight">
                    Let's build your professional resume
                  </h1>
                  <p className="text-sm text-th-text2 mt-1">
                    Fill your information. Our AI will generate an ATS optimized resume.
                  </p>
                </div>
              </div>
              <ATSBadge />
            </div>

            {/* Resume Builder Form */}
            <ResumeForm onSubmit={handleFormSubmit} />
          </motion.div>
        )}

        {/* ── STEP 2: GENERATING (LOADING STATE) ── */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-6"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-th-primary/20 blur-xl animate-pulse-slow" />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                className="w-16 h-16 rounded-full border-4 border-th-border border-t-th-primary flex items-center justify-center relative z-10"
              />
              <Sparkles size={24} className="text-th-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-th-text">AI Generating Your Resume...</h3>
              <p className="text-sm text-th-text2 mt-1 max-w-sm">
                Optimizing bullet points, injecting target keywords, and structuring for ATS scanners.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: PREVIEW & EXPORT ── */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-6"
          >
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-th-border pb-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBack}
                  className="p-2.5 rounded-xl border border-th-border hover:bg-th-primary/10 hover:text-th-primary text-th-text2 transition-all"
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-th-text tracking-tight flex items-center gap-2">
                    Your ATS Resume is Ready!
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-success/15 text-success font-bold uppercase">
                      <Check size={10} strokeWidth={3} /> ATS Grade A+
                    </span>
                  </h1>
                  <p className="text-xs text-th-text2 mt-0.5">
                    Preview your generated resume or export it as a PDF immediately.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <GradientButton variant="outline" onClick={() => handleFormSubmit(resumeData)} className="!py-2.5 !px-5 text-xs">
                  <RefreshCw size={14} /> Regenerate
                </GradientButton>
                <GradientButton className="!py-2.5 !px-5 text-xs shadow-lg">
                  <Download size={14} /> Export PDF
                </GradientButton>
              </div>
            </div>

            {/* Document Preview Card */}
            <div className="bg-slate-50 dark:bg-slate-900/40 p-8 rounded-3xl border border-th-border flex justify-center items-center shadow-inner">
              <div className="w-full max-w-[800px] aspect-[1/1.41] bg-white text-slate-800 p-12 shadow-2xl rounded-xl border border-slate-200/60 font-serif relative">
                {/* Dynamically Rendered AI Markdown Resume */}
                {renderResumeMarkdown()}

                {/* Subtle watermark */}
                <div className="absolute bottom-4 right-6 text-[9px] text-slate-350 tracking-wider font-sans font-semibold">
                  GENERATED BY RESUAI
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </Card>
    </div>
  );
};
