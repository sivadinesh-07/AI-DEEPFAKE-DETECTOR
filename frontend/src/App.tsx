import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { BackendStatusProvider } from './context/BackendStatusContext';
import { Navbar } from './components/Navbar';
import { OfflineBanner } from './components/OfflineBanner';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Analysis } from './pages/Analysis';
import { History } from './pages/History';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

export const App: React.FC = () => {
  return (
    <BackendStatusProvider>
      <BrowserRouter>
        <div className="relative flex flex-col min-h-screen bg-[#f4faf6] text-[#0b2922] antialiased selection:bg-[#73EC8B]/40 selection:text-[#0b2922] bg-forensic-grid overflow-x-hidden">
          {/* Ambient Lighting Orbs with Fresh Mint/Lime Palette */}
          <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
            <div className="absolute -top-32 left-1/4 w-96 h-96 rounded-full bg-[#73EC8B]/20 blur-[128px]" />
            <div className="absolute top-1/3 -right-20 w-[450px] h-[450px] rounded-full bg-[#D2FF72]/15 blur-[140px]" />
            <div className="absolute -bottom-20 left-1/3 w-[500px] h-[500px] rounded-full bg-[#54C392]/15 blur-[150px]" />
          </div>

          <Navbar />
          <OfflineBanner />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-6 lg:p-8">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/analyze" element={<Analysis />} />
                <Route path="/history" element={<History />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </BackendStatusProvider>
  );
};

export default App;
