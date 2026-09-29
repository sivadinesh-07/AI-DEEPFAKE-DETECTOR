import axios from 'axios';
import type { AnalysisResult, JobStatus, HistoryResponse } from '../types/analysis';

const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
  },
});

type StatusListener = (isOnline: boolean) => void;
const statusListeners = new Set<StatusListener>();

export const registerBackendStatusListener = (listener: StatusListener) => {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
};

const notifyStatus = (isOnline: boolean) => {
  statusListeners.forEach((listener) => {
    try {
      listener(isOnline);
    } catch {
      // ignore
    }
  });
};

// Response interceptor to detect backend online / offline automatically
apiClient.interceptors.response.use(
  (response) => {
    notifyStatus(true);
    return response;
  },
  (error) => {
    // If request failed because the server is not reachable
    if (!error.response || [502, 503, 504].includes(error.response?.status) || error.code === 'ERR_NETWORK') {
      notifyStatus(false);
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Check backend health status
  async checkHealth(): Promise<{ online: boolean; latencyMs?: number; data?: any }> {
    const start = performance.now();
    try {
      const response = await axios.get('/api/v1/health', {
        timeout: 3000,
        headers: { 'Cache-Control': 'no-cache' }
      });
      const latencyMs = Math.round(performance.now() - start);
      const isHealthy = response.status === 200 && response.data?.status === 'online';
      notifyStatus(isHealthy);
      return { online: isHealthy, latencyMs, data: response.data };
    } catch (error) {
      notifyStatus(false);
      return { online: false };
    }
  },

  // Upload video
  async uploadVideo(file: File, onProgress?: (percent: number) => void): Promise<{ analysis_id: string; status: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/analysis/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
    return response.data;
  },

  // Get job status
  async getStatus(analysisId: string): Promise<JobStatus> {
    const response = await apiClient.get(`/analysis/${analysisId}`);
    return response.data;
  },

  // Get final result
  async getResult(analysisId: string): Promise<AnalysisResult> {
    const response = await apiClient.get(`/analysis/${analysisId}/result`);
    return response.data;
  },

  // Get audit history & KPIs
  async getHistory(skip = 0, limit = 50): Promise<HistoryResponse> {
    const response = await apiClient.get('/history', {
      params: { skip, limit },
    });
    return response.data;
  },

  // Delete analysis
  async deleteAnalysis(analysisId: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`/history/${analysisId}`);
    return response.data;
  },

  // Download PDF Report
  getReportUrl(analysisId: string): string {
    return `/api/v1/analysis/${analysisId}/report`;
  }
};
