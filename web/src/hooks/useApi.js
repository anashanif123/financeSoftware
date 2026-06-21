import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from '@/lib/api';

// Generic list/detail hooks keyed by resource path, plus typed dashboard hooks.

export function useList(resource, params = {}) {
  return useQuery({
    queryKey: [resource, params],
    queryFn: () => http.get(`/${resource}`, params),
  });
}

export function useItem(resource, id, options = {}) {
  return useQuery({
    queryKey: [resource, id],
    queryFn: () => http.get(`/${resource}/${id}`),
    enabled: Boolean(id),
    ...options,
  });
}

export function useCreate(resource) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => http.post(`/${resource}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [resource] }),
  });
}

export function useUpdate(resource) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) => http.patch(`/${resource}/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [resource] }),
  });
}

export function useRemove(resource) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => http.delete(`/${resource}/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [resource] }),
  });
}

// Dashboard
export const useStats = () => useQuery({ queryKey: ['dashboard', 'stats'], queryFn: () => http.get('/dashboard/stats') });
export const useCharts = (months = 6) =>
  useQuery({ queryKey: ['dashboard', 'charts', months], queryFn: () => http.get('/dashboard/charts', { months }) });
export const useRecent = () => useQuery({ queryKey: ['dashboard', 'recent'], queryFn: () => http.get('/dashboard/recent') });
