import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
});

export const getTraces = async (limit: number = 100, service?: string) => {
  const params: any = { limit };
  if (service) params.service = service;
  const response = await api.get('/traces', { params });
  return response.data;
};

export const getTraceById = async (traceId: string) => {
  const response = await api.get(`/traces/${traceId}`);
  return response.data;
};

export const getLogs = async (limit: number = 100, service?: string) => {
  const params: any = { limit };
  if (service) params.service = service;
  const response = await api.get('/logs', { params });
  return response.data;
};

export const getServices = async () => {
  const response = await api.get('/services');
  return response.data;
};

export const getServiceMetrics = async (service: string) => {
  const response = await api.get(`/services/${service}/metrics`);
  return response.data;
};

export const createEventSource = () => {
  return new EventSource(`${API_URL}/api/events/stream`);
};
