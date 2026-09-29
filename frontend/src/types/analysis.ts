export interface TimelineItem {
  frame: number;
  timestamp: number;
  anomaly_score: number;
}

export interface HeatmapItem {
  frame: number;
  timestamp: number;
  anomaly_score: number;
  image_url: string;
}

export interface FrameItem {
  frame: number;
  timestamp: number;
  anomaly_score: number;
  is_suspicious: boolean;
  status: string;
  frame_url: string;
  heatmap_url?: string;
  ear?: number;
  mar?: number;
}

export interface AnalysisResult {
  analysis_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  filename: string;
  prediction: 'REAL' | 'FAKE';
  confidence: number;
  processing_time: number;
  metadata: {
    resolution: string;
    duration: number;
    fps: number;
  };
  spatial: {
    score: number;
  };
  temporal: {
    score: number;
  };
  audio: {
    score: number;
    has_audio?: boolean;
    duration?: number;
  };
  sync: {
    score: number;
    status: 'consistent' | 'mild_mismatch' | 'significant_mismatch';
  };
  facial_behavior: {
    blink: number;
    gaze: number;
    lip: number;
    mean_ear: number;
    mean_mar: number;
  };
  timeline: TimelineItem[];
  heatmaps: HeatmapItem[];
  all_frames?: FrameItem[];
  suspicious_frames?: FrameItem[];
  report_url?: string;
  stage?: string;
  progress?: number;
  error_message?: string;
}

export interface JobStatus {
  analysis_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  stage: string;
  progress: number;
  error_message?: string;
}

export interface HistoryItem {
  id: string;
  filename: string;
  status: string;
  prediction?: 'REAL' | 'FAKE';
  confidence?: number;
  processing_time?: number;
  created_at?: string;
  report_url?: string;
}

export interface HistoryResponse {
  total: number;
  kpis: {
    total_analyses: number;
    total_real: number;
    total_fake: number;
    avg_confidence: number;
  };
  items: HistoryItem[];
}
