import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { VideoUploader } from '../components/VideoUploader';
import { ProcessingProgress } from '../components/ProcessingProgress';
import { PredictionCard } from '../components/PredictionCard';
import { AnalysisCard } from '../components/AnalysisCard';
import { TimelineChart } from '../components/TimelineChart';
import { HeatmapViewer } from '../components/HeatmapViewer';
import { FrameGallery } from '../components/FrameGallery';
import { api } from '../services/api';
import type { AnalysisResult } from '../types/analysis';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { useBackendStatus } from '../context/BackendStatusContext';

export const Analysis: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get('id');

  const [analysisId, setAnalysisId] = useState<string | null>(queryId);
  const { isOnline, checkHealth } = useBackendStatus();
  const [status, setStatus] = useState<string>('idle');
  const [stage, setStage] = useState<string>('initializing');
  const [progress, setProgress] = useState<number>(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Poll status when job is active
  useEffect(() => {
    if (!analysisId || status === 'completed' || status === 'failed') return;

    const interval = setInterval(async () => {
      try {
        const job = await api.getStatus(analysisId);
        setStatus(job.status);
        setStage(job.stage);
        setProgress(job.progress);

        if (job.status === 'completed') {
          clearInterval(interval);
          const finalRes = await api.getResult(analysisId);
          setResult(finalRes);
        } else if (job.status === 'failed') {
          clearInterval(interval);
          setError(job.error_message || 'Pipeline execution failed.');
        }
      } catch (err: any) {
        console.error('Polling error:', err);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [analysisId, status]);

  // Load existing analysis if ID in URL
  useEffect(() => {
    if (queryId) {
      setAnalysisId(queryId);
      api.getResult(queryId)
        .then((res) => {
          setResult(res);
          setStatus(res.status);
        })
        .catch((err) => {
          console.error(err);
          setError('Could not load analysis with specified ID.');
        });
    }
  }, [queryId]);

  const handleStartAnalysis = async (file: File) => {
    setError(null);
    setResult(null);
    setStatus('uploading');
    setStage('uploading');
    setProgress(5);

    try {
      const res = await api.uploadVideo(file, (percent) => {
        setProgress(Math.min(percent, 20));
      });
      setAnalysisId(res.analysis_id);
      setStatus('processing');
    } catch (err: any) {
      setStatus('failed');
      setError(err.response?.data?.detail || 'Failed to upload video.');
    }
  };

  const handleReset = () => {
    setAnalysisId(null);
    setStatus('idle');
    setStage('initializing');
    setProgress(0);
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-fadeIn">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-black text-white tracking-tight font-heading">
              Forensic Analysis Workspace
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-500/30">
              PIPELINE v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Multimodal deepfake identification, spatial-spectral inconsistency extraction &amp; biometric verification
          </p>
        </div>

        {result && (
          <button
            onClick={handleReset}
            className="px-4 py-2.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all border border-slate-700/80 shadow-md cursor-pointer hover:border-cyan-500/50"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Audit Another Video</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-2xl flex items-center space-x-3 text-xs shadow-lg">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Offline Alert when trying to analyze */}
      {!isOnline && status === 'idle' && !result && (
        <div className="bg-slate-900/90 border border-rose-500/30 text-rose-300 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-rose-500/20 rounded-xl text-rose-400 shrink-0">
              <WifiOff className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Backend Engine Offline</p>
              <p className="text-slate-300 text-[11px] mt-0.5">Video uploads and forensic inferences are paused until the FastAPI server is running.</p>
            </div>
          </div>
          <button
            onClick={() => checkHealth()}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl shrink-0 transition-colors shadow-sm cursor-pointer"
          >
            Ping Server
          </button>
        </div>
      )}

      {/* Upload View */}
      {status === 'idle' && !result && (
        <VideoUploader onAnalyze={handleStartAnalysis} disabled={!isOnline} />
      )}

      {/* Live Processing View */}
      {(status === 'uploading' || status === 'processing') && (
        <ProcessingProgress stage={stage} progress={progress} />
      )}

      {/* Results View */}
      {result && (() => {
        const allFrames = (result.all_frames && result.all_frames.length > 0)
          ? result.all_frames
          : (result.heatmaps || []).map((h) => ({
              frame: h.frame,
              timestamp: h.timestamp,
              anomaly_score: h.anomaly_score,
              is_suspicious: h.anomaly_score >= 0.45,
              status: h.anomaly_score >= 0.45 ? 'Suspicious' : 'Normal',
              frame_url: h.image_url,
              heatmap_url: h.image_url,
            }));

        const suspiciousFrames = (result.suspicious_frames && result.suspicious_frames.length > 0)
          ? result.suspicious_frames
          : allFrames.filter((f) => f.is_suspicious || f.anomaly_score >= 0.45);

        return (
          <div className="space-y-8 animate-fadeIn">
            {/* Verdict Card */}
            <PredictionCard result={result} />

            {/* Multimodal Radar & Sub-Score Cards */}
            <AnalysisCard result={result} />

            {/* Suspicious Frame Localization Gallery */}
            <FrameGallery
              frames={allFrames}
              suspiciousFrames={suspiciousFrames}
            />

            {/* Temporal Anomaly Timeline */}
            {result.timeline && result.timeline.length > 0 && (
              <TimelineChart timeline={result.timeline} />
            )}

            {/* Grad-CAM Heatmap Viewer */}
            {result.heatmaps && result.heatmaps.length > 0 && (
              <HeatmapViewer heatmaps={result.heatmaps} />
            )}
          </div>
        );
      })()}
    </div>
  );
};
