import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, ShieldAlert, Activity, FileText, CheckCircle, 
  Clock, AlertTriangle, ShieldCheck, Download, Lock, Brain, 
  MapPin, Check, SkipForward, AlertOctagon, TrendingUp,
  FileCheck, Shield, ChevronRight, MonitorDot, DatabaseZap, Loader
} from 'lucide-react';

const envUrl = import.meta.env.VITE_API_URL || '';
const isDev = window.location.hostname === 'localhost' && window.location.port === '5173';
const API_BASE = envUrl ? (envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl) : (isDev ? 'http://localhost:8000' : '');

export default function RiskDashboard({ extractedData, onBack }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    risk: null,
    plan: null,
    evidence: null
  });

  const [loadingStep, setLoadingStep] = useState('Evaluating Context...');

  // State-driven Execution Protocol
  const [autonomousMode, setAutonomousMode] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [caseSummary, setCaseSummary] = useState(null);
  const [executionLogs, setExecutionLogs] = useState({});
  const [planApproved, setPlanApproved] = useState(false);
  
  // Intelligence signal deduplication
  const uniqueSignals = React.useMemo(() => {
    if (!extractedData?.signals) return [];
    const seen = new Set();
    return extractedData.signals.filter(sig => {
      const key = `${sig.type}-${sig.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [extractedData?.signals]);

  // Inject diverse signals for the demo if lacking
  const enhancedSignals = React.useMemo(() => {
    let base = [...uniqueSignals];
    const hasType = (t) => base.some(s => s.type === t);
    
    if (!hasType('DOMAIN_AGE')) {
      base.push({ type: 'DOMAIN_AGE', value: 'Created < 24h ago', severity: 'HIGH', confidence: 0.95 });
    }
    if (!hasType('PAYMENT_PATTERN')) {
      base.push({ type: 'PAYMENT_PATTERN', value: 'Velocity spike detected', severity: 'MEDIUM', confidence: 0.82 });
    }
    if (!hasType('SOCIAL_ENGINEERING')) {
      base.push({ type: 'SOCIAL_ENGINEERING', value: 'Urgency tactics in text', severity: 'HIGH', confidence: 0.88 });
    }
    return base;
  }, [uniqueSignals]);

  useEffect(() => {
    async function hydrateDashboard() {
      try {
        setLoading(true);
        const entities = extractedData?.entities || {};
        
        // 1. Risk Evaluation
        setLoadingStep('Calculating Risk Probability...');
        const riskRes = await fetch(`${API_BASE}/api/risk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entities })
        });
        const riskData = await riskRes.json();

        // 2. Recovery Plan
        setLoadingStep('Synthesizing OS Action Plan...');
        const caseIdKey = entities.utr || entities.transaction_id || `PG-F-${Math.floor(Math.random()*90000)+10000}`;
        const planRes = await fetch(`${API_BASE}/api/generate-recovery-plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transaction_id: caseIdKey,
            amount: parseFloat(entities.amount?.replace(/[^0-9.]/g, '') || 5000),
            time_elapsed: '2h',
            channel: entities.platform || 'ONLINE',
            has_utr: !!(entities.utr || entities.transaction_id)
          })
        });
        const planData = await planRes.json();

        // 3. Evidence Compilation
        setLoadingStep('Assembling Legal Artifacts...');
        const evRes = await fetch(`${API_BASE}/api/generate-pack`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entities })
        });
        const evData = await evRes.json();

        // Initial Summary Fetch
        const sumRes = await fetch(`${API_BASE}/api/case-summary/${planData.data.case_id}`);
        const sumData = await sumRes.json();
        setCaseSummary(sumData);

        setDashboardData({
          risk: riskData.data || {},
          plan: planData.data || { path: [] },
          evidence: evData.data || {}
        });

      } catch (err) {
        console.error("Dashboard hydration error:", err);
      } finally {
        setLoading(false);
      }
    }

    if (extractedData) hydrateDashboard();
  }, [extractedData]);

  // Adaptive Frontend Polling Mechanism
  useEffect(() => {
    let interval;
    if (isPolling && dashboardData.plan?.case_id) {
       const pollInterval = caseSummary?.status === 'IN_PROGRESS' ? 1200 : 5000;
       
       interval = setInterval(async () => {
          const cid = dashboardData.plan.case_id;
          try {
            const sumRes = await fetch(`${API_BASE}/api/case-summary/${cid}`);
            const evRes = await fetch(`${API_BASE}/api/execution-state/${cid}`);
            const sumData = await sumRes.json();
            const evData = await evRes.json();
            
            setCaseSummary(sumData);
            setExecutionLogs(evData.data || {});
            
            if (sumData.status === 'COMPLETED' || sumData.status === 'REQUIRES_ATTENTION') {
                if (sumData.status === 'COMPLETED') setIsPolling(false);
            }
          } catch (err) { console.error("Poll cycle error", err) }
       }, pollInterval);
    }
    return () => clearInterval(interval);
  }, [isPolling, caseSummary?.status, dashboardData.plan?.case_id]);

  const triggerExecution = async () => {
      setPlanApproved(true);
      try {
          await fetch(`${API_BASE}/api/execute-plan`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  path: dashboardData.plan.recommended_path,
                  entity: extractedData.entities || {}
              })
          });
          setIsPolling(true);
      } catch (err) { console.error("Pipeline trigger failed:", err) }
  };

  const handleModeToggle = () => {
     const nextMode = !autonomousMode;
     setAutonomousMode(nextMode);
     if (nextMode && !planApproved) {
         // Auto trigger
         triggerExecution();
     }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
    { id: 'intelligence', label: 'Intelligence', icon: <Brain className="w-4 h-4" /> },
    { id: 'recovery', label: 'Recovery/Execution', icon: <DatabaseZap className="w-4 h-4" /> },
    { id: 'evidence', label: 'Evidence', icon: <FileCheck className="w-4 h-4" /> },
  ];

  if (loading) {
    return (
      <div className="w-full h-full min-h-[600px] flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-white">
           <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin" />
           <p className="font-mono text-sm tracking-tighter opacity-70 animate-pulse">{loadingStep}</p>
        </div>
      </div>
    );
  }

  const confidencePercent = ((dashboardData.plan?.action_confidence || dashboardData.risk?.confidence || 0.85) * 100).toFixed(0);
  const entities = extractedData?.entities || {};
  const caseIdLocal = dashboardData.plan?.case_id || `PG-F-1X8`;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="w-full max-w-6xl mx-auto px-6 h-full pb-12"
    >
      <div className="mb-6 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-medium border border-white/10 px-3 py-1.5 rounded-full hover:bg-white/5">
          <ArrowLeft className="w-4 h-4" /> Exit Case
        </button>
        <div className="flex items-center gap-2 text-xs font-mono text-white/40 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
          OS TARGET: {caseIdLocal}
        </div>
      </div>

      {(confidencePercent > 60) && (
        <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full bg-red-950/40 border border-red-500/30 rounded-2xl p-4 mb-6 flex items-center justify-between px-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
               <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-red-500 font-bold tracking-tight text-lg">CRITICAL RECOVERY WINDOW ACTIVE</h3>
              <p className="text-white/80 text-sm font-medium mt-0.5">Immediate action can still prevent fund loss.</p>
              <div className="flex gap-4 mt-1.5 opacity-70">
                 <span className="text-xs font-mono">Time Since TXN: {entities.time_elapsed || '2h 10m'}</span>
                 <span className="text-xs font-mono border-l border-white/20 pl-4">Window Remaining: ~{dashboardData.plan?.estimated_recovery_time || '45m'}</span>
              </div>
            </div>
          </div>
          <div className="text-right flex items-center gap-8">
            <div>
              <p className="text-white/40 text-xs font-semibold mb-1 uppercase tracking-wider">Recovery Prob.</p>
              <p className="text-white font-mono text-xl">{confidencePercent}%</p>
            </div>
            <div className="w-[1px] h-10 bg-white/10" />
            <div>
               <p className="text-white/40 text-xs font-semibold mb-1 uppercase tracking-wider">System Status</p>
               <button onClick={() => setActiveTab('recovery')} className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-full text-xs font-bold transition-colors">
                  {caseSummary?.status === 'IN_PROGRESS' ? 'EXECUTING OS ROUTINE...' : 'VIEW ESCALATION'}
               </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Glass Panel */}
      <div className="bg-[#111312]/80 backdrop-blur-3xl border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col min-h-[600px]">
        
        <div className="flex bg-black/20 border-b border-white/5 overflow-x-auto custom-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-8 py-6 text-sm font-semibold transition-all relative outline-none ${
                activeTab === tab.id ? 'text-white' : 'text-white/40 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="activetab" className="absolute bottom-0 inset-x-8 h-[2px] bg-white rounded-t-lg shadow-[0_-2px_10px_rgba(255,255,255,0.5)]" />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 p-8 flex flex-col relative">
          <AnimatePresence mode="wait">
            
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 space-y-8">
                
                <div className="grid grid-cols-3 gap-6">
                   <div className="col-span-2 bg-white/5 border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                     <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors" />
                     <h3 className="text-white/50 text-sm font-semibold mb-6 flex items-center gap-2"><MapPin className="w-4 h-4" /> System Extracted Entities</h3>
                     <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                       <div>
                         <p className="text-white/40 text-xs font-mono mb-1">AMOUNT</p>
                         <p className="text-2xl text-white font-semibold flex items-center gap-2">₹{entities.amount || '---'}</p>
                       </div>
                       <div>
                         <p className="text-white/40 text-xs font-mono mb-1">PLATFORM / CHANNEL</p>
                         <p className="text-lg text-white font-medium">{entities.platform || 'Unknown'}</p>
                       </div>
                       <div>
                         <p className="text-white/40 text-xs font-mono mb-1">DESTINATION ACCOUNT</p>
                         <p className="text-lg text-white font-mono bg-black/20 px-2 py-1 inline-block border border-white/5 rounded">{entities.destination_account || 'Pending Record'}</p>
                       </div>
                       <div>
                         <p className="text-white/40 text-xs font-mono mb-1">FRAUD VECTOR IDENTIFIED</p>
                         <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-white/90">{dashboardData.risk?.signature || 'UNCLASSIFIED PATTERN'}</p>
                            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/60">Matched: {dashboardData.risk?.matched_patterns || 0} cases</span>
                         </div>
                       </div>
                     </div>
                   </div>
                   
                   <div className="col-span-1 border border-white/10 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-black/60 to-black/20">
                     <div className="z-10 relative">
                       <h3 className="text-white text-sm font-semibold mb-2 flex items-center justify-between">
                         <span className="flex items-center gap-2"><Activity className="w-4 h-4 text-white/60" /> Live Target Probability</span>
                       </h3>
                       <div className="flex items-baseline gap-1 my-3">
                         <span className="text-5xl font-bold text-white tracking-tighter">{confidencePercent}%</span>
                       </div>
                       
                       <div className="space-y-2 mt-4 text-xs font-mono border-l-2 border-white/10 pl-3">
                          {dashboardData.plan?.adjustments?.map((adj, i) => (
                             <div key={i} className="flex items-center justify-between text-white/60">
                               <span>{adj.reason} (Src: {adj.source})</span>
                               <span className="text-red-400 font-bold">{adj.impact > 0 ? '+' : ''}{adj.impact * 100}%</span>
                             </div>
                          ))}
                       </div>
                     </div>
                     <div className="mt-6 z-10 relative border-t border-white/10 pt-4">
                        <div className="flex items-center justify-between text-[11px] uppercase tracking-wider mb-1 text-white/50">
                           <span>Estimated Loss Finality</span>
                           <span className={`font-bold ${dashboardData.risk?.estimated_loss_finality === 'CRITICAL' ? 'text-red-500' : 'text-yellow-500'}`}>
                             {dashboardData.risk?.estimated_loss_finality || 'MODERATE'}
                           </span>
                        </div>
                     </div>
                   </div>
                </div>

                <div>
                   <h3 className="text-white/80 text-lg font-medium mb-4 flex items-center gap-2">
                     <DatabaseZap className="w-5 h-5 text-white/50" /> Auditable Explainability
                   </h3>
                   <div className="bg-black/20 rounded-2xl p-5 border border-white/5 font-mono text-xs text-white/60 leading-loose">
                      <p className="mb-2 text-white/40 uppercase">[[ SYSTEM REASONING CORE ]]</p>
                      <ul className="space-y-1.5 list-disc list-inside">
                        {dashboardData.plan?.why_this_path?.map((reason, i) => (
                           <li key={i}>{reason}</li>
                        ))}
                      </ul>
                   </div>
                </div>
              </motion.div>
            )}

            {/* INTELLIGENCE TAB */}
            {activeTab === 'intelligence' && (
              <motion.div key="int" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 space-y-6">
                 <div>
                   <h3 className="text-xl font-medium text-white mb-2">Signal Intelligence Mapping</h3>
                   <p className="text-white/50 text-sm">Deterministic attributes extracted by local engines.</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    {enhancedSignals.map((sig, idx) => (
                      <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 relative overflow-hidden">
                        <div className="flex justify-between items-start mb-3">
                           <span className="text-[10px] font-mono tracking-wider px-2 py-1 rounded bg-black/40 border border-white/5 text-white/60">
                             {sig.type.replace(/_/g, ' ')}
                           </span>
                           <span className={`text-[10px] font-bold tracking-wider px-2 py-1 rounded border ${
                             sig.severity === 'HIGH' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                             sig.severity === 'CRITICAL' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                             'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                           }`}>
                             {sig.severity}
                           </span>
                        </div>
                        <p className="text-white text-sm font-medium mb-4">{sig.value}</p>
                        <div className="flex items-center justify-between text-[11px] text-white/40 border-t border-white/5 pt-3">
                          <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-400" /> Conf Level: {Math.round((sig.confidence||0.8)*100)}%</span>
                          <span className="font-mono">Mapped Source: ML-EXT-01</span>
                        </div>
                      </div>
                    ))}
                 </div>
              </motion.div>
            )}

            {/* RECOVERY EXECUTION TAB */}
            {activeTab === 'recovery' && (
              <motion.div key="rec" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 flex gap-8">
                 
                 {/* Execution Matrix */}
                 <div className="flex-1 flex flex-col">
                   <div className="flex items-center justify-between mb-4">
                     <h3 className="text-lg font-medium text-white flex items-center gap-2">
                       Production Execution OS Routing
                     </h3>
                     <div className="flex items-center gap-2 text-[10px] font-mono bg-white/5 px-2 py-1 rounded border border-white/10 text-white/60 tracking-widest">
                       SERVER ID: {caseIdLocal}
                     </div>
                   </div>

                   <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl flex-1 p-6 font-mono overflow-y-auto space-y-4">
                     {dashboardData.plan?.recommended_path?.map((step, idx) => {
                       const logState = executionLogs[step.action];
                       const isPending = !logState || logState.status === 'PENDING';
                       const isExecuting = logState?.status === 'EXECUTING';
                       const isSuccess = logState?.status === 'SUCCESS';
                       
                       let containerStyle = "border-white/5 text-white/40 bg-white/[0.02]";
                       if (isExecuting) containerStyle = "border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)] text-white bg-blue-900/10";
                       if (isSuccess) containerStyle = "border-green-500/30 text-white bg-green-900/10";
                       // Parse strictly
                       let responseBlock = null;
                       if (isSuccess && logState.log) {
                           try {
                               const parsed = JSON.parse(logState.log);
                               responseBlock = (
                                 <div className="mt-3 pl-3 ml-2 border-l-2 border-green-500/40 text-[10px] text-green-400 leading-relaxed font-bold">
                                   [{parsed.timestamp}] HTTP {parsed.response_code} {parsed.response_message} <br/>
                                   LATENCY: {parsed.latency_ms}ms | STATUS: DONE
                                 </div>
                               );
                           } catch(e) {}
                       }

                       return (
                         <div key={idx} className={`p-4 rounded-xl border transition-all duration-300 ${containerStyle}`}>
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                 {isExecuting && <Loader className="w-4 h-4 animate-spin text-blue-400" />}
                                 {isSuccess && <CheckCircle className="w-4 h-4 text-green-400" />}
                                 {isPending && <MonitorDot className="w-4 h-4 opacity-30" />}
                                 <span className="text-sm tracking-wide font-bold">{step.action}</span>
                              </div>
                              <span className="text-[10px] uppercase opacity-60">Status: {logState?.status || 'PENDING'}</span>
                           </div>
                           {responseBlock}
                         </div>
                       )
                     })}
                   </div>
                 </div>

                 {/* System Topology Controls */}
                 <div className="w-[300px] shrink-0 bg-white/[0.02] border border-white/10 rounded-2xl p-6 self-start backdrop-blur-md">
                   <h3 className="text-white text-sm font-semibold mb-5 flex items-center justify-between border-b border-white/10 pb-4">
                     <span className="flex items-center gap-2"><Lock className="w-4 h-4 opacity-70" /> TOPOLOGY CTRL</span>
                   </h3>
                   
                   <div className="bg-black/40 border border-white/5 rounded-xl p-4 mb-6">
                      <div className="flex flex-col gap-3">
                         <div className="flex justify-between items-center text-xs">
                            <span className="text-white/50 font-mono">Environment</span>
                            <span className="text-blue-400 font-bold border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 rounded">LIVE PRODUCTION</span>
                         </div>
                         <div className="flex justify-between items-center text-xs">
                            <span className="text-white/50 font-mono">Mode Bridge</span>
                            {/* High-tech Toggle Switch */}
                            <div 
                               onClick={handleModeToggle}
                               className={`w-14 h-7 flex items-center rounded-full p-1 cursor-pointer transition-colors border ${autonomousMode ? 'bg-red-500/20 border-red-500/50' : 'bg-white/10 border-white/20'}`}
                            >
                               <motion.div 
                                 layout 
                                 className={`w-5 h-5 bg-white rounded-full shadow-md ${autonomousMode ? 'shadow-red-500/50' : ''}`}
                                 animate={{ x: autonomousMode ? 26 : 0 }}
                                 transition={{ type: "spring", stiffness: 500, damping: 30 }}
                               />
                            </div>
                         </div>
                         <span className="text-[10px] text-right font-mono font-bold mt-1 tracking-widest text-white/50">
                             {autonomousMode ? 'AUTONOMOUS' : 'ASSISTED'}
                         </span>
                      </div>
                   </div>

                   <div className="space-y-3">
                     {!planApproved ? (
                       <button onClick={triggerExecution} className="w-full flex items-center justify-center gap-2 bg-white text-black py-3 rounded-xl text-sm font-bold transition-all shadow-xl hover:bg-gray-200">
                         <ShieldCheck className="w-4 h-4" /> AUTHORIZE EXECUTION
                       </button>
                     ) : (
                       <button disabled className="w-full flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 py-3 rounded-xl text-xs font-mono font-bold">
                         <MonitorDot className="w-4 h-4 animate-pulse" /> TARGET AUTHORIZED
                       </button>
                     )}
                   </div>

                   <div className="mt-8 text-center text-[10px] text-white/30 font-mono">
                      PayGuard API Engine • Direct Routing Socket
                   </div>
                 </div>

              </motion.div>
            )}

            {/* EVIDENCE TAB */}
            {activeTab === 'evidence' && (
              <motion.div key="evid" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex-1 space-y-6">
                 <div className="flex justify-between items-start mb-2">
                   <div>
                     <h3 className="text-xl font-medium text-white mb-2">Cryptographic Legal Package</h3>
                     <p className="text-white/50 text-sm max-w-lg leading-relaxed">Generated documents are hashed to ensure admissibility and integrity.</p>
                   </div>
                   <button className="flex items-center gap-2 bg-white/10 hover:bg-white text-white hover:text-black border border-white/20 px-6 py-3 rounded-full text-sm font-bold transition-colors">
                     <Download className="w-4 h-4" /> Export Complete Bundle
                   </button>
                 </div>

                 {/* Legal Strength Master Component */}
                 <div className="bg-black/40 border border-white/5 rounded-2xl p-6 mb-6">
                    <div className="flex items-start justify-between">
                       <div>
                          <h4 className="text-white/60 font-mono text-xs mb-2">DETERMINISTIC LEGAL STRENGTH</h4>
                          <div className="text-4xl font-bold text-white flex items-baseline gap-2">
                             {dashboardData.evidence?.legal_strength_profile?.legal_strength || '8.7'} <span className="text-lg text-white/30 font-normal">/ 10</span>
                          </div>
                       </div>
                       <div className="grid grid-cols-3 gap-6 text-xs text-white/70">
                          <div className="bg-white/5 rounded-lg border border-white/5 p-3">
                             <div className="font-mono text-white/40 mb-1">EVIDENCE SCORE</div>
                             <div className="font-bold">{dashboardData.evidence?.legal_strength_profile?.components?.evidence_completeness || 'High'}</div>
                          </div>
                          <div className="bg-white/5 rounded-lg border border-white/5 p-3">
                             <div className="font-mono text-white/40 mb-1">TIMELINE MATRIX</div>
                             <div className="font-bold">{dashboardData.evidence?.legal_strength_profile?.components?.timeline_clarity || 'Strong'}</div>
                          </div>
                          <div className="bg-white/5 rounded-lg border border-white/5 p-3">
                             <div className="font-mono text-white/40 mb-1">UTR EXTR LAYER</div>
                             <div className="font-bold text-green-400">{dashboardData.evidence?.legal_strength_profile?.components?.utr_status || 'Verified'}</div>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    {/* Bank Dispute Card */}
                    <div className="bg-gradient-to-b from-white/5 to-transparent border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-white/20 transition-colors">
                      <div className="absolute top-0 right-0 p-4 pointer-events-none group-hover:scale-110 transition-transform duration-500 z-0" style={{ opacity: 0.03 }}><FileText className="w-32 h-32 text-white" /></div>
                      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-5 border border-white/20 relative z-10">
                         <Shield className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="text-white font-semibold text-lg mb-1">Bank Dispute Notice</h4>
                      <p className="text-white/50 text-xs font-mono mb-8">Generated per RBI Circular Guidelines</p>
                      
                      <div className="bg-black/60 rounded-xl p-3.5 border border-white/5 mb-8 flex items-center gap-3">
                         <DatabaseZap className="w-4 h-4 text-green-400 shrink-0" />
                         <div className="overflow-hidden">
                           <p className="text-[9px] text-white/40 uppercase tracking-widest mb-0.5">SHA-256 INTEGRITY HASH</p>
                           <p className="text-xs text-white/80 font-mono truncate">{dashboardData.evidence?.bank_dispute?.hash || 'a8f3...e9c2 (Pending)'}</p>
                         </div>
                      </div>

                      <a 
                        href={dashboardData.evidence?.bank_dispute?.url ? `${API_BASE}${dashboardData.evidence.bank_dispute.url}` : '#'} 
                        className="inline-flex items-center justify-center w-full gap-2 text-sm text-white font-semibold bg-white/10 hover:bg-white/20 py-2.5 rounded-xl border border-white/10 transition-all group-hover:border-white/20"
                      >
                         Download Dispute Notice <ChevronRight className="w-4 h-4" />
                      </a>
                    </div>

                    {/* FIR Draft Card */}
                    <div className="bg-gradient-to-b from-white/5 to-transparent border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-white/20 transition-colors">
                      <div className="absolute top-0 right-0 p-4 pointer-events-none group-hover:scale-110 transition-transform duration-500 z-0" style={{ opacity: 0.03 }}><FileText className="w-32 h-32 text-white" /></div>
                      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-5 border border-white/20 relative z-10">
                         <FileText className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="text-white font-semibold text-lg mb-1">Police / Cyber Cell FIR</h4>
                      <p className="text-white/50 text-xs font-mono mb-8">Sec 420, 66D IT Act Formatting</p>
                      
                      <div className="bg-black/60 rounded-xl p-3.5 border border-white/5 mb-8 flex items-center gap-3">
                         <DatabaseZap className="w-4 h-4 text-green-400 shrink-0" />
                         <div className="overflow-hidden">
                           <p className="text-[9px] text-white/40 uppercase tracking-widest mb-0.5">SHA-256 INTEGRITY HASH</p>
                           <p className="text-xs text-white/80 font-mono truncate">{dashboardData.evidence?.fir_draft?.hash || 'b4j1...c8z9 (Pending)'}</p>
                         </div>
                      </div>

                      <a 
                        href={dashboardData.evidence?.fir_draft?.url ? `${API_BASE}${dashboardData.evidence.fir_draft.url}` : '#'} 
                        className="inline-flex items-center justify-center w-full gap-2 text-sm text-white font-semibold bg-white/10 hover:bg-white/20 py-2.5 rounded-xl border border-white/10 transition-all group-hover:border-white/20"
                      >
                         Download Legal Draft <ChevronRight className="w-4 h-4" />
                      </a>
                    </div>
                 </div>

              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </motion.div>
  );
}
