import React, { useState, useRef } from 'react';
import { UploadCloud, FileVideo, X, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

interface VideoUploaderProps {
  onAnalyze: (file: File) => void;
  disabled?: boolean;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({ onAnalyze, disabled }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (file: File) => {
    setError(null);
    const validExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validExtensions.includes(ext)) {
      setError(`Unsupported video format. Please upload MP4, MOV, AVI, or WEBM.`);
      return;
    }

    if (file.size > 250 * 1024 * 1024) {
      setError(`File size exceeds 250MB limit.`);
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleRemove = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = () => {
    if (selectedFile) {
      onAnalyze(selectedFile);
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800/80">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h2 className="text-base font-bold text-white font-heading">
            Submit Target Video For Deepfake Forensics
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Ingest authentic camera recordings or suspected synthetic/manipulated facial videos.
          </p>
        </div>
        <div className="flex items-center space-x-1.5 text-[10px] font-mono text-cyan-400 bg-cyan-950/70 border border-cyan-500/30 px-2.5 py-1 rounded-full">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Max 250MB • GPU/CPU Automated Scale</span>
        </div>
      </div>

      {error && (
        <div className="mb-5 bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-xl flex items-center space-x-2.5 text-xs shadow-md">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!selectedFile ? (
        <div
          onDragEnter={disabled ? undefined : handleDrag}
          onDragLeave={disabled ? undefined : handleDrag}
          onDragOver={disabled ? undefined : handleDrag}
          onDrop={disabled ? undefined : handleDrop}
          onClick={() => {
            if (!disabled) fileInputRef.current?.click();
          }}
          className={`relative overflow-hidden border-2 border-dashed rounded-3xl p-10 sm:p-14 flex flex-col items-center justify-center transition-all ${
            disabled
              ? 'border-slate-800 bg-slate-900/30 opacity-50 cursor-not-allowed'
              : dragActive
              ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_40px_rgba(0,240,255,0.15)] cursor-pointer scale-[1.005]'
              : 'border-slate-700/80 hover:border-cyan-500/60 hover:bg-slate-900/60 bg-slate-950/40 cursor-pointer group'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp4,.mov,.avi,.mkv,.webm,video/mp4,video/quicktime,video/x-msvideo,video/webm"
            onChange={handleChange}
            disabled={disabled}
            className="hidden"
          />

          {/* Glowing Center Icon with Radar Rings */}
          <div className="relative mb-4">
            <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-2xl blur-md opacity-40 group-hover:opacity-75 transition duration-300" />
            <div className="relative bg-slate-900 border border-cyan-500/40 p-4 rounded-2xl text-cyan-400 shadow-xl group-hover:scale-105 transition-transform">
              <UploadCloud className="w-8 h-8" />
            </div>
          </div>

          <p className="text-sm font-semibold text-slate-100 mb-1">
            Drag &amp; drop forensic target file here, or <span className="text-cyan-400 underline underline-offset-4 font-bold group-hover:text-cyan-300">browse files</span>
          </p>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Supported containers: MP4, MOV, AVI, WEBM (Up to 250MB)
          </p>

          {/* Formats Pills */}
          <div className="mt-5 flex items-center space-x-2">
            {['H.264 / MP4', 'ProRes / MOV', 'VP9 / WEBM', 'AVI'].map((fmt, i) => (
              <span key={i} className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono bg-slate-900/90 border border-slate-800 text-slate-400">
                {fmt}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-4 flex items-center justify-between border border-cyan-500/30 shadow-lg">
            <div className="flex items-center space-x-3.5 overflow-hidden">
              <div className="bg-cyan-500/10 border border-cyan-500/30 p-2.5 rounded-xl text-cyan-400 shrink-0">
                <FileVideo className="w-5 h-5" />
              </div>
              <div className="truncate">
                <p className="text-sm font-bold text-white truncate font-sans">{selectedFile.name}</p>
                <p className="text-xs text-slate-400 font-mono">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for Ingestion
                </p>
              </div>
            </div>
            <button
              onClick={handleRemove}
              disabled={disabled}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {previewUrl && (
            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-black aspect-video max-h-80 flex items-center justify-center shadow-2xl relative">
              <video src={previewUrl} controls className="max-h-full max-w-full rounded-xl" />
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-3">
            <button
              onClick={handleRemove}
              disabled={disabled}
              className="px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel Selection
            </button>
            <button
              onClick={handleSubmit}
              disabled={disabled}
              className="px-6 py-2.5 text-xs font-black text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 rounded-xl shadow-lg shadow-cyan-500/20 flex items-center space-x-2 transition-all hover:scale-[1.02] disabled:opacity-50 cursor-pointer"
            >
              <span>Execute Multimodal Audit</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
