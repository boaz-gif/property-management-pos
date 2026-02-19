import { useQuery, useMutation, useQueryClient, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { tenantAPI } from '../api/tenantApi';

export const useTenants = (params = {}) => {
  return useQuery({
    queryKey: ['tenants', params],
    queryFn: () => tenantAPI.getTenants(params),
    staleTime: 3 * 60 * 1000, // 3 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
    placeholderData: keepPreviousData,
  });
};

export const useTenant = (id) => {
  return useQuery({
    queryKey: ['tenant', id],
    queryFn: () => tenantAPI.getTenantById(id),
    enabled: !!id, // Only fetch if ID is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useTenantStats = () => {
  return useQuery({
    queryKey: ['tenants', 'stats'],
    queryFn: () => tenantAPI.getTenantStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });
};

export const useInfiniteTenants = (params = {}) => {
  return useInfiniteQuery({
    queryKey: ['tenants', 'infinite', params],
    queryFn: ({ pageParam = 1 }) => 
      tenantAPI.getTenants({ ...params, page: pageParam, limit: 20 }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.data.length < 20) return undefined;
      return allPages.length + 1;
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
};

export const useCreateTenant = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => tenantAPI.createTenant(data),
    onSuccess: () => {
      // Invalidate and refetch tenants list
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenants', 'stats'] });
    },
    onError: (error) => {
      console.error('Failed to create tenant:', error);
    },
  });
};

export const useUpdateTenant = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => tenantAPI.updateTenant(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tenant', id] });
      
      // Snapshot the previous value
      const previousTenant = queryClient.getQueryData(['tenant', id]);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['tenant', id], (old) => ({ ...old, ...data }));
      
      return { previousTenant };
    },
    onError: (err, { id }, context) => {
      // If the mutation fails, roll back to the previous value
      queryClient.setQueryData(['tenant', id], context.previousTenant);
    },
    onSettled: (data, error, { id }) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['tenant', id] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
};

export const usePrefetchTenant = () => {
  const queryClient = useQueryClient();
  
  return (id) => {
    queryClient.prefetchQuery({
      queryKey: ['tenant', id],
      queryFn: () => tenantAPI.getTenantById(id),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };
};
