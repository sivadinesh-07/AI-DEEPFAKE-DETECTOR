import React, { useState, useRef } from 'react';
import { UploadCloud, FileVideo, X, AlertCircle, ArrowRight } from 'lucide-react';

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
      setError(`Unsupported video format. Please upload MP4, MOV, or AVI.`);
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
    <div className="glass-panel rounded-3xl p-7 shadow-sm border border-[#54C392]/30">
      <div className="mb-5">
        <h2 className="text-base font-bold text-[#0b2922] font-sans">Upload Media File</h2>
        <p className="text-xs text-[#205347] mt-0.5">Select an authentic or manipulated video for multimodal forensic analysis.</p>
      </div>

      {error && (
        <div className="mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-500 px-4 py-3 rounded-xl flex items-center space-x-2.5 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
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
          className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all ${
            disabled
              ? 'border-[#54C392]/20 bg-[#f4faf6]/60 opacity-60 cursor-not-allowed'
              : dragActive
              ? 'border-[#15B392] bg-[#73EC8B]/20 shadow-[0_0_30px_rgba(21,179,146,0.15)] cursor-pointer'
              : 'border-[#54C392]/40 hover:border-[#15B392] hover:bg-[#eef8f3]/60 bg-white/70 cursor-pointer'
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
          <div className="bg-gradient-to-br from-[#15B392]/15 to-[#73EC8B]/25 p-4 rounded-2xl text-[#15B392] mb-3.5 border border-[#54C392]/40 shadow-[0_0_15px_rgba(115,236,139,0.25)]">
            <UploadCloud className="w-8 h-8" />
          </div>
          <p className="text-sm font-medium text-[#0b2922] mb-1">
            Drag & drop video here, or <span className="text-[#15B392] underline underline-offset-4 hover:text-[#54C392] font-bold">browse</span>
          </p>
          <p className="text-xs text-[#205347]/80 font-mono">Supports MP4, MOV, AVI up to 250MB</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-4 flex items-center justify-between border border-[#54C392]/30">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="bg-[#73EC8B]/25 border border-[#54C392]/40 p-2.5 rounded-xl text-[#15B392] shrink-0">
                <FileVideo className="w-5 h-5" />
              </div>
              <div className="truncate">
                <p className="text-sm font-bold text-[#0b2922] truncate">{selectedFile.name}</p>
                <p className="text-xs text-[#205347] font-mono">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            </div>
            <button
              onClick={handleRemove}
              disabled={disabled}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {previewUrl && (
            <div className="rounded-2xl overflow-hidden border border-[#54C392]/30 bg-black aspect-video max-h-72 flex items-center justify-center shadow-inner">
              <video src={previewUrl} controls className="max-h-full max-w-full rounded-xl" />
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <button
              onClick={handleRemove}
              disabled={disabled}
              className="px-4 py-2 text-xs font-medium text-[#205347] hover:text-[#0b2922] bg-white hover:bg-[#eef8f3] rounded-xl border border-[#54C392]/30 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={disabled}
              className="px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#15B392] via-[#21bf9e] to-[#54C392] hover:from-[#0fa082] hover:to-[#43aa7d] rounded-xl shadow-lg shadow-[#15B392]/25 flex items-center space-x-2 transition-all hover:scale-[1.02] disabled:opacity-50 cursor-pointer"
            >
              <span>Execute Forensic Pipeline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
