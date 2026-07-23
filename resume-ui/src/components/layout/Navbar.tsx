import { motion } from 'framer-motion';
import { LogOut, ChevronRight } from 'lucide-react';
import { ThemeSwitcher } from '../ui/ThemeSwitcher';

interface NavbarProps {
  activePage: 'builder' | 'analyzer';
  onLogout?: () => void;
}

const pageLabels: Record<string, string> = {
  builder:  'Resume Builder',
  analyzer: 'ATS Analyzer',
};
const stepLabels: Record<string, string> = {
  builder:  'Fill Details',
  analyzer: 'Analyze Resume',
};

export const Navbar = ({ activePage, onLogout }: NavbarProps) => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex-shrink-0 flex items-center justify-between px-8 z-20 th-transition glass-card"
      style={{
        height: 90,
        background: 'var(--nav-bg)',
        borderBottom: '1px solid var(--nav-border)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: 'var(--nav-shadow)',
      }}
    >
      {/* ── LEFT: Breadcrumb ── */}
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="text-sm font-medium truncate"
          style={{ color: 'var(--text-muted)' }}
        >
          Dashboard
        </span>
        <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <span
          className="text-sm font-semibold truncate"
          style={{ color: 'var(--text)' }}
        >
          {pageLabels[activePage]}
        </span>
        <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <span
          className="text-xs px-2.5 py-1 rounded-lg font-semibold flex-shrink-0"
          style={{
            background: 'var(--gradient-soft)',
            color: 'var(--primary)',
          }}
        >
          {stepLabels[activePage]}
        </span>
      </div>

      {/* ── CENTER: Theme Switcher ── */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <ThemeSwitcher />
      </div>

      {/* ── RIGHT: Sign Out ── */}
      <motion.button
        onClick={onLogout}
        whileHover={{ scale: 1.03, y: -1 }}
        whileTap={{ scale: 0.97 }}
        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold text-white ripple flex-shrink-0"
        style={{
          background: 'var(--gradient)',
          boxShadow: '0 4px 16px rgba(109,74,255,0.30)',
        }}
      >
        <LogOut size={15} />
        Sign Out
      </motion.button>
    </motion.header>
  );
};
