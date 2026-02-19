import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { maintenanceAPI } from '../api/maintenanceApi';

export const useMaintenanceRequests = (params = {}) => {
  return useQuery({
    queryKey: ['maintenance', params],
    queryFn: () => maintenanceAPI.getRequests(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    placeholderData: keepPreviousData,
  });
};

export const useMaintenanceRequest = (id) => {
  return useQuery({
    queryKey: ['maintenance', id],
    queryFn: () => maintenanceAPI.getRequestById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateMaintenanceRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => maintenanceAPI.createRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
    },
  });
};
