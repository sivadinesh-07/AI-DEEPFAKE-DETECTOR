import axios from 'axios';
import type { AnalysisResult, JobStatus, HistoryResponse } from '../types/analysis';

const rawEnvUrl = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

export const API_BASE_URL = rawEnvUrl ? `${rawEnvUrl}/api/v1` : '/api/v1';

export const getEndpointDisplayUrl = (): string => {
  if (rawEnvUrl) {
    return `${rawEnvUrl}/api/v1`;
  }
  return 'http://127.0.0.1:8000/api/v1';
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
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
      const response = await axios.get(`${API_BASE_URL}/health`, {
        timeout: 5000,
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
    return `${API_BASE_URL}/analysis/${analysisId}/report`;
  }
};
