import { Sun, Moon, Sparkles, Layers, Leaf } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import type { ThemeKey } from '../../context/ThemeContext';

interface ThemeOption {
  key: ThemeKey;
  label: string;
  icon: React.ReactNode;
  activeGradient: string;
}

const themes: ThemeOption[] = [
  {
    key: 'light',
    label: 'Light',
    icon: <Sun size={15} />,
    activeGradient: 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)',
  },
  {
    key: 'dark',
    label: 'Dark',
    icon: <Moon size={15} />,
    activeGradient: 'linear-gradient(135deg, #1E293B 0%, #475569 100%)',
  },
  {
    key: 'gradient',
    label: 'Gradient',
    icon: <Sparkles size={15} />,
    activeGradient: 'linear-gradient(135deg, #6D4AFF 0%, #A855F7 100%)',
  },
  {
    key: 'glass',
    label: 'Glass',
    icon: <Layers size={15} />,
    activeGradient: 'linear-gradient(135deg, #06B6D4 0%, #6D4AFF 100%)',
  },
  {
    key: 'green',
    label: 'Green',
    icon: <Leaf size={15} />,
    activeGradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
  },
];

export const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="flex items-center gap-1 p-1.5 rounded-2xl th-transition"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
      }}
    >
      {themes.map(t => {
        const isActive = theme === t.key;
        return (
          <button
            key={t.key}
            onClick={() => setTheme(t.key)}
            title={t.label}
            className="relative flex items-center justify-center rounded-xl transition-all duration-200"
            style={{
              width: 34,
              height: 34,
              background: isActive ? t.activeGradient : 'transparent',
              color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
              boxShadow: isActive ? '0 4px 12px rgba(109,74,255,0.30)' : 'none',
            }}
          >
            {t.icon}
          </button>
        );
      })}
    </div>
  );
};
