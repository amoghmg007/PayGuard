import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ExternalLink, ShieldCheck } from 'lucide-react';
import UploadInterface from './components/UploadInterface';
import RiskDashboard from './components/RiskDashboard';
import LandingPage from './components/LandingPage';

export default function App() {
  const [appState, setAppState] = useState('landing'); // landing, upload, dashboard
  const [extractedData, setExtractedData] = useState(null);

  return (
    <div className="bg-[#050505] min-h-screen p-4 md:p-6 flex flex-col selection:bg-white/20">
      
      {/* Outer Top Bar */}
      <div className="w-full max-w-[1600px] mx-auto flex items-center justify-between mb-4 px-2 z-50">
        
        {/* Left Logo */}
        <div className="flex items-center gap-3 text-white">
          <div className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center font-bold">
            <div className="w-4 h-4 border-2 border-black rounded-full border-t-transparent -rotate-45"></div>
          </div>
        </div>

        {/* Center Pill Nav */}
        <nav className="hidden md:flex glass-pill px-1.5 py-1.5 items-center gap-1 text-[11px] font-semibold text-[#8b928f]">
          <a href="#" className="px-5 py-2 hover:text-white transition-colors">Home</a>
          <a href="#" className="px-5 py-2 hover:text-white transition-colors text-white">DeFi App</a>
          <a href="#" className="px-5 py-2 hover:text-white transition-colors">Assets</a>
          <a href="#" className="px-5 py-2 hover:text-white transition-colors">Features</a>
          <a href="#" className="px-5 py-2 hover:text-white transition-colors">Pricing</a>
          <a href="#" className="px-5 py-2 hover:text-white transition-colors">FAQ</a>
          <a href="#" className="flex items-center gap-1 px-4 py-2 text-white bg-white/5 border border-white/5 rounded-full ml-2">
            Protection <ExternalLink className="w-2 h-2 ml-1 opacity-70" />
          </a>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center ml-2 border border-white/10">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
        </nav>

        {/* Right CTA */}
        <button className="flex items-center gap-2 text-white/70 hover:text-white text-[11px] font-semibold transition-colors">
          <User className="w-3.5 h-3.5" strokeWidth={2.5} /> Create Account
        </button>
      </div>

      {/* Main Inner Container */}
      <div className="flex-1 w-full max-w-[1600px] mx-auto mesh-container rounded-[2.5rem] relative overflow-hidden border border-[#2a2c2b] flex flex-col">
        <div className="noise-overlay"></div>

        {/* SVG Bezier Lines Background */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 1600 900" preserveAspectRatio="none">
          {/* Top Left Line */}
          <path d="M 0 350 C 300 350, 400 250, 700 450" className="glow-line" strokeWidth="0.8" fill="none" />
          <circle cx="210" cy="275" r="3" fill="#ffffff" opacity="0.3" />
          
          {/* Bottom Left Line */}
          <path d="M 0 540 C 200 540, 250 540, 500 450" className="glow-line" strokeWidth="0.8" fill="none" />
          <circle cx="160" cy="540" r="15" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
          <circle cx="160" cy="540" r="3" fill="#ffffff" />
          
          {/* Top Right Line */}
          <path d="M 1600 350 C 1300 350, 1100 250, 900 450" className="glow-line" strokeWidth="0.8" fill="none" />
          
          {/* Bottom Right Line */}
          <path d="M 1600 540 C 1300 540, 1200 450, 900 450" className="glow-line" strokeWidth="0.8" fill="none" />
          <circle cx="1400" cy="540" r="15" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
          <circle cx="1400" cy="540" r="3" fill="#ffffff" />
        </svg>

        <AnimatePresence mode="wait">
          {appState === 'landing' && (
            <LandingPage key="landing" onStart={() => setAppState('upload')} />
          )}

          {appState !== 'landing' && (
            <div className="absolute inset-0 overflow-y-auto custom-scrollbar z-30 pt-16 pb-16">
               {appState === 'upload' && <UploadInterface onUploadComplete={(data) => { setExtractedData(data); setAppState('dashboard'); }} onBack={() => setAppState('landing')} />}
               {appState === 'dashboard' && <RiskDashboard extractedData={extractedData} onBack={() => setAppState('landing')} />}
            </div>
          )}

        </AnimatePresence>
      </div>

      {/* Bottom Sponsor Bar matches exact opacity and colors */}
      <div className="w-full max-w-[1300px] mx-auto mt-7 mb-2 flex flex-wrap justify-between items-center opacity-30 gap-6 px-10 grayscale-[60%]">
        <div className="flex items-center gap-2 font-bold text-[1.4rem] tracking-tighter text-[#aeb5b1]">
          <span className="border-b-[4px] border-l-[4px] border-[#aeb5b1] w-4 h-4 transform rotate-45 -mt-1 rounded-sm"></span> Vercel
        </div>
        <div className="flex items-center gap-2 font-bold text-xl text-[#aeb5b1] tracking-tight">
          <div className="w-5 h-5 grid grid-cols-2 gap-0.5 rounded-full overflow-hidden bg-[#aeb5b1]">
            <div className="bg-[#050505]"></div><div className="bg-[#050505]"></div><div className="bg-[#050505]"></div><div className="bg-[#050505]"></div>
          </div> loom
        </div>
        <div className="flex items-center gap-1.5 font-bold text-lg text-[#aeb5b1]">
          <div className="bg-[#aeb5b1] text-black px-1.5 rounded font-black text-sm">$</div> Cash App
        </div>
        <div className="flex items-center gap-1 font-bold text-xl tracking-tighter text-[#aeb5b1]">
          <span className="w-5 h-5 rounded-full border-[4px] border-[#aeb5b1] border-l-transparent -rotate-45"></span> Loops
        </div>
        <div className="font-bold text-[1.35rem] tracking-tighter text-[#aeb5b1]">_zapier</div>
        <div className="font-bold text-xl text-[#aeb5b1] tracking-tight flex items-center gap-1">ramp <span className="text-[#aeb5b1] -mt-1 scale-x-125">◢</span></div>
        <div className="flex items-center gap-1 font-semibold text-sm tracking-wide text-[#aeb5b1]">
          <div className="w-4 h-4 border border-[#aeb5b1] transform rotate-45 grid grid-cols-2"><div className="bg-[#aeb5b1]"></div></div> Raycast
        </div>
      </div>

    </div>
  );
}
