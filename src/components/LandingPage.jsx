import React from 'react';
import { motion } from 'framer-motion';
import { Play, Sparkles, ArrowDown, ExternalLink, ShieldCheck } from 'lucide-react';

export default function LandingPage({ onStart }) {
  return (
    <motion.div 
      key="hero"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.6 }}
      className="absolute inset-0 flex flex-col items-center justify-center z-20"
    >
      
      {/* Play Button Subtle Icon (Top Center) */}
      <div className="absolute top-[18%] left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center backdrop-blur-xl border border-white/10 text-white/80 cursor-pointer hover:bg-white/10 transition-colors glow-node">
         <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
      </div>

      {/* Floating Node 1 (Top Left) */}
      <div className="absolute top-[30%] left-[14%] hidden lg:flex flex-col items-start gap-1">
        <div className="w-7 h-7 rounded-full bg-[#111312]/80 border border-white/20 flex items-center justify-center backdrop-blur-md mb-2 glow-node">
          <span className="w-1.5 h-1.5 border border-white rotate-45"></span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-white"></div>
          <span className="text-[#e1e5e3] text-[13px] font-medium tracking-wide">Trace Logic</span>
        </div>
        <span className="text-[#8b918e] text-[10px] ml-3 font-medium">99.945</span>
      </div>

       {/* Floating Node 2 (Bottom Left) */}
       <div className="absolute top-[60%] left-[10%] hidden lg:flex flex-col items-start gap-1">
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-white text-white"></div>
          <span className="text-[#e1e5e3] text-[13px] font-medium tracking-wide">Bank API</span>
        </div>
        <span className="text-[#8b918e] text-[10px] ml-3 font-medium">Auto-Lock</span>
      </div>

       {/* Floating Node 3 (Top Right) */}
       <div className="absolute top-[30%] right-[12%] hidden lg:flex flex-col items-start gap-1 text-right items-end w-32">
        <div className="w-7 h-7 rounded-full bg-[#111312]/80 border border-white/20 flex items-center justify-center backdrop-blur-md mb-2 text-white glow-node">
          <Sparkles className="w-3 h-3" />
        </div>
        <div className="flex items-center justify-end gap-2 pr-0.5 w-full">
          <div className="w-1 h-1 rounded-full bg-white/70"></div>
          <span className="text-[#e1e5e3] text-[13px] font-medium tracking-wide">Legal Pack</span>
        </div>
        <span className="text-[#8b918e] text-[10px] font-medium mr-1.5">PDF Form</span>
      </div>

       {/* Floating Node 4 (Bottom Right) */}
       <div className="absolute top-[58%] right-[13%] hidden lg:flex flex-col items-start gap-1 text-right items-end w-32">
        <div className="flex items-center justify-end gap-2 w-full pr-1.5">
          <div className="w-1 h-1 rounded-full bg-white/70"></div>
          <span className="text-[#e1e5e3] text-[13px] font-medium tracking-wide">Dispute Engine</span>
        </div>
        <span className="text-[#8b918e] text-[10px] font-medium mr-2.5">440 SEC</span>
      </div>


      {/* Center Content */}
      <div className="text-center flex flex-col items-center max-w-4xl px-4 z-20">
         
         <div className="glass-pill px-4 py-1.5 flex items-center justify-center gap-2 text-[10px] text-[#b4bcb9] font-medium mb-12 hover:bg-white/10 transition-colors w-fit mx-auto cursor-pointer border-[#383d3a]">
           <ShieldCheck className="w-3 h-3 text-white" />
           Initiate Fraud Reversal Engine <span className="opacity-60 ml-0.5 font-sans">→</span>
         </div>

         <h1 className="text-5xl md:text-[5.5rem] font-medium tracking-tight mb-8 leading-[1.1] text-white">
           From Scam to <span className="fade-text">Structured Recovery</span>
         </h1>

         <p className="text-[#96a09a] text-[15px] max-w-[600px] mx-auto mb-14 leading-relaxed font-light tracking-wide">
           Drop in your fraud evidence. We immediately trace timelines, evaluate recovery probability, and provision legal payloads.
         </p>

         <div className="flex flex-col items-center w-full">
           <div className="flex items-center justify-center gap-4 z-10 w-full mb-1">
            <button 
              onClick={onStart}
              className="glass-pill px-6 py-2.5 text-[11px] font-semibold text-white flex items-center gap-2 hover:bg-[#1f2321] transition-colors border-[#383d3a]"
            >
              Open App <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </button>
            <button 
              onClick={onStart}
              className="bg-white text-black rounded-full px-6 py-2.5 text-[11px] font-bold hover:bg-gray-100 transition-colors"
            >
              Start Extraction
            </button>
           </div>
           
           {/* Vertical Falling Lights under buttons */}
           <div className="flex justify-center gap-16 w-full -mt-4 opacity-50">
             <div className="w-[1px] h-32 bg-gradient-to-b from-white/40 via-white/10 to-transparent"></div>
             <div className="w-[1px] h-48 bg-gradient-to-b from-white/40 via-white/10 to-transparent mt-4"></div>
             <div className="w-[1px] h-28 bg-gradient-to-b from-white/30 via-white/5 to-transparent"></div>
           </div>
         </div>

      </div>

      {/* Bottom Elements */}
      <div className="absolute bottom-10 left-10 flex items-center gap-4 z-20">
        <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
          <ArrowDown className="w-3.5 h-3.5 text-black" strokeWidth={3} />
        </div>
        <span className="text-[11px] text-[#86908b] font-medium tracking-wide">02/03 .  Scroll down</span>
      </div>

      <div className="absolute bottom-12 right-12 flex flex-col items-start gap-3 z-20">
         <span className="text-[11px] text-[#eff2f0] font-medium tracking-wide">Recovery horizons</span>
         <div className="flex gap-1.5">
           <div className="w-6 h-1 bg-white rounded-full"></div>
           <div className="w-6 h-1 bg-white/20 rounded-full"></div>
           <div className="w-6 h-1 bg-white/20 rounded-full"></div>
           <div className="w-6 h-1 bg-white/20 rounded-full"></div>
         </div>
      </div>

    </motion.div>
  );
}
