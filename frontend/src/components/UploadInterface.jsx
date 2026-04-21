import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, Hash, Check, ArrowLeft, Loader2, FileWarning, FileText, Image, File } from 'lucide-react';

const ACCEPTED_TYPES = [
  'application/pdf',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/webp',
];

function getFileIcon(file) {
  if (!file) return <File className="w-5 h-5" />;
  if (file.type.includes('pdf')) return <FileText className="w-5 h-5 text-red-400" />;
  if (file.type.includes('image')) return <Image className="w-5 h-5 text-blue-400" />;
  return <FileText className="w-5 h-5 text-white/60" />;
}

const baseVar = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_BASE = baseVar.endsWith('/') ? baseVar.slice(0, -1) : baseVar;

export default function UploadInterface({ onUploadComplete, onBack }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const [isPasting, setIsPasting] = useState(false);
  const [textInput, setTextInput] = useState('');

  const fileInputRef = useRef(null);

  const startProgressAnimation = () => {
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 80) return 80;
        return prev + Math.random() * 12;
      });
    }, 300);
    return interval;
  };

  const uploadFile = async (file) => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(10);
    const interval = startProgressAnimation();

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const result = await response.json();

      clearInterval(interval);
      setUploadProgress(100);
      setTimeout(() => onUploadComplete(result.data), 800);
    } catch (err) {
      clearInterval(interval);
      setError(`Connection failed: ${err.message}. Please verify the API routing configuration.`);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const uploadText = async (text) => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(10);
    const interval = startProgressAnimation();

    try {
      const response = await fetch(`${API_BASE}/api/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_evidence: text }),
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const result = await response.json();

      clearInterval(interval);
      setUploadProgress(100);
      setTimeout(() => onUploadComplete(result.data), 800);
    } catch (err) {
      clearInterval(interval);
      setError(`Connection failed: ${err.message}. Please verify the API routing configuration.`);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    const isAccepted = ACCEPTED_TYPES.includes(file.type) ||
      file.name.match(/\.(pdf|txt|csv|log|jpg|jpeg|png|webp)$/i);
    if (!isAccepted) {
      setError(`Unsupported file type: ${file.type || file.name}. Use PDF, TXT, CSV, or image files.`);
      return;
    }
    setSelectedFile(file);
    setError(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleInputChange = (e) => {
    const file = e.target.files[0];
    if (file) handleFileSelect(file);
  };

  const handleSubmitFile = () => {
    if (selectedFile) uploadFile(selectedFile);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full h-full min-h-[600px] flex flex-col items-center justify-center p-8"
    >
      <div className="w-full max-w-2xl text-left mb-6 relative">
        <button onClick={onBack} className="absolute -left-12 top-1 text-white/50 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-3xl font-medium text-white mb-2 tracking-tight">Extract Forensic Data</h2>
        <p className="text-muted text-sm">Upload communication logs, payment screenshots, PDFs, or paste raw text.</p>
        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded flex items-center gap-2 text-red-400 text-xs font-mono">
            <FileWarning className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}
      </div>

      <div className="w-full max-w-2xl bg-[#111312]/60 backdrop-blur-xl border border-white/10 rounded-[2rem] p-4 shadow-2xl">
        <div
          className={`relative border border-dashed rounded-[1.5rem] p-16 transition-colors duration-300 flex flex-col items-center justify-center
            ${isDragging ? 'border-white/40 bg-white/5' : 'border-white/10 hover:border-white/20'}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.csv,.log,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={handleInputChange}
          />

          <AnimatePresence mode="wait">
            {!isUploading ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center text-center w-full"
              >
                {!isPasting ? (
                  <>
                    {/* File selected preview */}
                    {selectedFile ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center mb-6"
                      >
                        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3">
                          {getFileIcon(selectedFile)}
                        </div>
                        <p className="text-white text-sm font-medium mb-1 max-w-xs truncate">{selectedFile.name}</p>
                        <p className="text-muted text-xs">{(selectedFile.size / 1024).toFixed(1)} KB · {selectedFile.type || 'unknown type'}</p>
                      </motion.div>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                          <UploadCloud className="w-6 h-6 text-white/50" />
                        </div>
                        <h3 className="text-lg font-medium text-white mb-2 tracking-tight">Drop files or click to upload</h3>
                        <p className="text-muted text-xs max-w-xs mb-8 leading-relaxed">
                          PDF, TXT, CSV, JPG, PNG up to 50MB. End-to-end encrypted.
                        </p>
                      </>
                    )}

                    <div className="flex gap-4 mt-2">
                      {selectedFile ? (
                        <>
                          <button
                            onClick={() => { setSelectedFile(null); setError(null); }}
                            className="px-6 py-2.5 bg-black/40 hover:bg-black/60 border border-white/10 rounded-full text-white text-xs font-semibold transition-colors"
                          >
                            Clear
                          </button>
                          <button
                            onClick={handleSubmitFile}
                            className="px-6 py-2.5 bg-white hover:bg-gray-200 text-black rounded-full text-xs font-semibold transition-colors shadow-xl"
                          >
                            Analyse File
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-6 py-2.5 bg-white hover:bg-gray-200 text-black rounded-full text-xs font-semibold transition-colors shadow-xl"
                          >
                            Select File
                          </button>
                          <button
                            onClick={() => setIsPasting(true)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-black/40 hover:bg-black/60 border border-white/10 rounded-full text-white text-xs font-semibold transition-colors"
                          >
                            <Hash className="w-3 h-3 text-muted" />
                            Enter Text / UTR
                          </button>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="w-full max-w-md flex flex-col items-center">
                    <textarea
                      autoFocus
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Paste raw bank SMS, email text, UTR number, or suspicious links here..."
                      className="w-full h-[120px] bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-white/30 transition-colors resize-none mb-4"
                    />
                    <div className="flex gap-4 w-full">
                      <button
                        onClick={() => { setIsPasting(false); setTextInput(''); }}
                        className="flex-1 py-2.5 bg-transparent border border-white/10 hover:bg-white/5 rounded-full text-white text-xs font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => uploadText(textInput)}
                        disabled={!textInput.trim()}
                        className="flex-1 py-2.5 bg-white hover:bg-gray-200 disabled:opacity-50 text-black rounded-full text-xs font-semibold transition-colors shadow-xl"
                      >
                        Extract Intelligence
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="progress"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-4 w-full"
              >
                {uploadProgress < 100 ? (
                  <div className="w-full max-w-sm space-y-6">
                    <div className="flex justify-between items-end text-xs font-medium">
                      <span className="text-white flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" /> Deep Model Executing...
                      </span>
                      <span className="text-white/50 font-mono text-[10px]">{Math.floor(uploadProgress)}%</span>
                    </div>
                    <div className="h-1 bg-black/50 rounded-full overflow-hidden relative">
                      <motion.div
                        className="absolute top-0 left-0 h-full bg-white rounded-full shadow-[0_0_10px_white]"
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-4 text-white font-medium text-sm"
                  >
                    <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white">
                      <Check className="w-5 h-5" />
                    </div>
                    Trace Logic Aligned
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
