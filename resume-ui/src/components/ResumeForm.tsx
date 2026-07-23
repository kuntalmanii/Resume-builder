import React, { useState } from 'react';
import { 
  User, Mail, Phone, Briefcase, GraduationCap, 
  Code, Save, ArrowRight, Sparkles, FileText
} from 'lucide-react';
import { InputField } from './ui/InputField';
import { GradientButton } from './ui/GradientButton';

interface ResumeFormProps {
  onSubmit: (data: any) => void;
  onSaveDraft?: (data: any) => void;
}

export const ResumeForm = ({ onSubmit, onSaveDraft }: ResumeFormProps) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    targetJob: '',
    education: '',
    skills: '',
    workExperience: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'workExperience' && value.length > 2000) return;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleSaveDraftClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onSaveDraft) {
      onSaveDraft(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 w-full">
      {/* Two Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          <InputField
            label="Full Name"
            name="fullName"
            placeholder="e.g. Manish Kuntal"
            icon={User}
            value={formData.fullName}
            onChange={handleChange}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="Email Address"
              name="email"
              type="email"
              placeholder="manish@example.com"
              icon={Mail}
              value={formData.email}
              onChange={handleChange}
              required
            />
            <InputField
              label="Phone Number"
              name="phone"
              type="tel"
              placeholder="+91 98765 43210"
              icon={Phone}
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </div>
          <InputField
            label="Target Job Title"
            name="targetJob"
            placeholder="e.g. Senior Frontend Architect"
            icon={Briefcase}
            value={formData.targetJob}
            onChange={handleChange}
            required
          />
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          <InputField
            label="Education"
            name="education"
            placeholder="e.g. B.Tech in Computer Science, IIT Delhi"
            icon={GraduationCap}
            value={formData.education}
            onChange={handleChange}
            required
          />
          <InputField
            label="Skills"
            name="skills"
            placeholder="e.g. React, TypeScript, TailwindCSS, Node.js"
            icon={Code}
            value={formData.skills}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      {/* Work Experience Full Width Section */}
      <div className="flex flex-col gap-3 p-6 rounded-3xl border border-th-border bg-th-card/40 th-transition">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-th-primary/10 text-th-primary">
              <FileText size={18} />
            </div>
            <h3 className="font-bold text-base text-th-text">Work Experience & Projects</h3>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-th-primary/10 text-th-primary text-xs font-semibold">
            <Sparkles size={12} className="animate-pulse-slow" />
            <span>AI Assistant Enabled</span>
          </div>
        </div>

        <div className="relative mt-2">
          <textarea
            name="workExperience"
            value={formData.workExperience}
            onChange={handleChange}
            placeholder={`• Developed a high-performance React dashboard, improving speed by 40%\n• Led a team of 4 engineers to deliver a clean, responsive UI matching Figma mocks\n• Integrated secure authentication and real-time database endpoints using REST APIs`}
            className="w-full h-[220px] rounded-2xl border border-th-inputb bg-th-input text-th-text p-4 resize-none transition-all duration-200 input-focus"
            required
          />
          <div className="absolute bottom-3 right-4 text-[10px] font-semibold text-th-text3">
            {formData.workExperience.length}/2000 characters
          </div>
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="flex items-center justify-between mt-4">
        <GradientButton variant="outline" type="button" onClick={handleSaveDraftClick}>
          <Save size={16} />
          Save Draft
        </GradientButton>
        <GradientButton type="submit">
          Next → Generate Resume
          <ArrowRight size={16} />
        </GradientButton>
      </div>
    </form>
  );
};
