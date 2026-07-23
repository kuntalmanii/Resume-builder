import { motion } from 'framer-motion';
import {
  FileText, BarChart2, Settings, LogOut,
  Sparkles, ArrowRight, Zap,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface SidebarProps {
  activePage: 'builder' | 'analyzer';
  onPageChange: (p: 'builder' | 'analyzer') => void;
  onLogout?: () => void;
}

const navItems = [
  { id: 'builder',  label: 'Resume Builder', icon: FileText },
  { id: 'analyzer', label: 'ATS Analyzer',   icon: BarChart2 },
] as const;

export const Sidebar = ({ activePage, onPageChange, onLogout }: SidebarProps) => {
  const { theme } = useTheme();
  const isGradient = theme === 'gradient';
  const isGlass    = theme === 'glass';

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className={`relative flex flex-col w-[280px] flex-shrink-0 h-full overflow-hidden z-10 th-transition ${
        isGlass ? 'glass-card' : ''
      }`}
      style={{
        background: isGradient
          ? 'linear-gradient(180deg, #5B33E8 0%, #3A1FC4 100%)'
          : 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        boxShadow: isGradient
          ? '4px 0 32px rgba(91,51,232,0.25)'
          : '2px 0 16px rgba(109,74,255,0.05)',
      }}
    >
      {/* Gradient theme decorative glow */}
      {isGradient && (
        <div
          className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%)',
            transform: 'translate(30%, -30%)',
          }}
        />
      )}

      {/* ── LOGO ── */}
      <div className="px-6 pt-8 pb-2">
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Hex mark */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xl font-black shadow-lg flex-shrink-0"
            style={{ background: isGradient ? 'rgba(255,255,255,0.18)' : 'var(--gradient)' }}
          >
            ⬡
          </div>
          <div>
            <p
              className="font-black text-[1.15rem] leading-tight tracking-tight"
              style={{
                color: isGradient ? '#FFFFFF' : 'var(--primary)',
                letterSpacing: '-0.03em',
              }}
            >
              ResuAI<span style={{ opacity: 0.6 }}> //</span>
            </p>
            <p
              className="text-[0.6rem] font-semibold uppercase tracking-widest leading-tight mt-0.5"
              style={{ color: isGradient ? 'rgba(255,255,255,0.55)' : 'var(--text-muted)' }}
            >
              Next Gen Resume Engine
            </p>
          </div>
        </motion.div>
      </div>

      {/* Divider */}
      <div className="mx-6 my-4" style={{ height: 1, background: 'var(--sidebar-border)' }} />

      {/* ── NAVIGATION ── */}
      <nav className="px-3 flex flex-col gap-1">
        {navItems.map((item, i) => {
          const isActive = activePage === item.id;
          const Icon = item.icon;
          return (
            <motion.button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.07 }}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 text-left`}
              style={{
                background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                color: isActive ? 'var(--sidebar-active-text)' : 'var(--sidebar-text2)',
                boxShadow: isActive && !isGradient ? 'var(--shadow)' : 'none',
              }}
            >
              <Icon
                size={18}
                style={{
                  color: isActive
                    ? isGradient ? '#FFFFFF' : 'var(--primary)'
                    : 'var(--sidebar-text2)',
                }}
              />
              <span style={{ fontWeight: isActive ? 700 : 500 }}>{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="active-pill"
                  className="ml-auto w-1.5 h-5 rounded-full"
                  style={{
                    background: isGradient ? 'rgba(255,255,255,0.7)' : 'var(--primary)',
                  }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* ── AI ILLUSTRATION CARD ── */}
      <motion.div
        className="mx-4 mt-auto mb-2 rounded-3xl p-5 overflow-hidden relative"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        style={{
          background: 'linear-gradient(135deg, var(--ai-card-from) 0%, var(--ai-card-to) 100%)',
          boxShadow: '0 8px 32px rgba(109,74,255,0.35)',
        }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20"
          style={{ background: 'rgba(255,255,255,0.4)' }}
        />
        <div
          className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full opacity-15"
          style={{ background: 'rgba(255,255,255,0.3)' }}
        />

        <div className="relative z-10">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
            <Sparkles size={20} className="text-white" />
          </div>
          <p className="text-white font-bold text-sm leading-snug mb-1">
            AI Powered Resume
          </p>
          <p className="text-white/65 text-xs leading-relaxed mb-4">
            Create ATS-friendly resumes powered by AI in seconds.
          </p>
          <button
            className="flex items-center gap-2 bg-white text-sm font-semibold px-4 py-2 rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 w-full justify-center ripple"
            style={{ color: 'var(--ai-card-from)' }}
          >
            <Zap size={14} />
            Upgrade Pro
            <ArrowRight size={14} />
          </button>
        </div>
      </motion.div>

      {/* ── FOOTER ── */}
      <div className="px-3 pb-6 mt-2">
        <div className="mx-0 mb-3" style={{ height: 1, background: 'var(--sidebar-border)' }} />
        {[
          { icon: Settings, label: 'Settings' },
          { icon: LogOut,   label: 'Logout',   onClick: onLogout },
        ].map(({ icon: Icon, label, onClick }, i) => (
          <motion.button
            key={label}
            onClick={onClick}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 + i * 0.06 }}
            whileHover={{ x: 4 }}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm transition-all duration-200"
            style={{ color: 'var(--sidebar-text2)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover-bg)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <Icon size={16} style={{ color: 'var(--sidebar-text2)' }} />
            {label}
          </motion.button>
        ))}
      </div>
    </motion.aside>
  );
};
