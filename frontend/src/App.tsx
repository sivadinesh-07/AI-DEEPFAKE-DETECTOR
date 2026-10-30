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
        <div className="relative flex flex-col min-h-screen bg-[#080c14] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200 bg-forensic-grid overflow-x-hidden">
          {/* Ambient Cosmic Neural Lighting Orbs */}
          <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
            <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[160px]" />
            <div className="absolute top-1/3 -right-20 w-[550px] h-[550px] rounded-full bg-indigo-600/12 blur-[170px]" />
            <div className="absolute -bottom-32 left-1/3 w-[650px] h-[650px] rounded-full bg-sky-500/8 blur-[180px]" />
          </div>

          <Navbar />
          <OfflineBanner />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto p-5 sm:p-7 lg:p-9 max-w-[1600px] mx-auto w-full">
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
