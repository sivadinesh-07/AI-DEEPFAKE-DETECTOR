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
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0b2922] tracking-tight font-sans">
            Forensic Analysis Workspace
          </h1>
          <p className="text-xs text-[#205347] mt-1">Deepfake detection, temporal-spectral inconsistency & biometric verification</p>
        </div>
        {result && (
          <button
            onClick={handleReset}
            className="px-4 py-2.5 bg-white hover:bg-[#eef8f3] text-[#0b2922] rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all border border-[#54C392]/35 shadow-xs cursor-pointer hover:border-[#15B392]/60"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#15B392]" />
            <span>Analyze Another Video</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-2xl flex items-center space-x-3 text-xs">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Offline Alert when trying to analyze */}
      {!isOnline && status === 'idle' && !result && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-rose-500/20 rounded-xl text-rose-400 shrink-0">
              <WifiOff className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Backend Service Offline</p>
              <p className="text-rose-300/80 mt-0.5">Video uploads and forensic inferences are paused until the server is running.</p>
            </div>
          </div>
          <button
            onClick={() => checkHealth()}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl shrink-0 transition-colors shadow-sm cursor-pointer"
          >
            Check Status
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
