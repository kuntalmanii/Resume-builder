import { useState, useEffect } from 'react';
import { useStreamlit } from './hooks/useStreamlit';
import { useTheme } from './context/ThemeContext';
import type { ThemeKey } from './context/ThemeContext';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { ResumeBuilder } from './pages/ResumeBuilder';
import { ATSAnalyzer } from './pages/ATSAnalyzer';
import { motion, AnimatePresence } from 'framer-motion';

function DashboardContent() {
  const [activePage, setActivePage] = useState<'builder' | 'analyzer'>('builder');
  const { data, sendToStreamlit } = useStreamlit();
  const { theme, setTheme } = useTheme();

  // Sync theme changes from Streamlit
  useEffect(() => {
    if (data.theme && data.theme !== theme) {
      setTheme(data.theme as ThemeKey);
    }
  }, [data.theme]);

  // Sync page changes from Streamlit (if any) or local
  const handlePageChange = (page: 'builder' | 'analyzer') => {
    setActivePage(page);
    sendToStreamlit({ action: 'change_page', page });
  };

  const handleLogout = () => {
    sendToStreamlit({ action: 'logout' });
  };

  return (
    <div className="flex h-screen w-full bg-th-bg text-th-text overflow-hidden th-transition">
      {/* ── LEFT SIDEBAR ── */}
      <Sidebar
        activePage={activePage}
        onPageChange={handlePageChange}
        onLogout={handleLogout}
      />

      {/* ── RIGHT MAIN CONTAINER ── */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        {/* Sticky top navbar */}
        <Navbar activePage={activePage} onLogout={handleLogout} />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-10">
          <div className="max-w-[1200px] mx-auto w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePage}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                {activePage === 'builder' ? <ResumeBuilder /> : <ATSAnalyzer />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <DashboardContent />
  );
}
