import { useQuery, useMutation, useQueryClient, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { tenantAPI } from '../features/tenants/api/tenantApi';
import { propertyAPI } from '../features/properties/api/propertyApi';
import { maintenanceAPI } from '../features/maintenance/api/maintenanceApi';
import { paymentAPI } from '../features/payments/api/paymentApi';
import { documentAPI } from '../services/api';

// Authentication Queries
export const useAuthProfile = () => {
  return useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: () => authAPI.getProfile(),
    staleTime: 10 * 60 * 1000, // 10 minutes - user data changes infrequently
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useUsers = (params = {}) => {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => authAPI.getUsers(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!params.role, // Only fetch if role is specified
    placeholderData: keepPreviousData,
  });
};

// Tenant Queries
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

// Property Queries
export const useProperties = (params = {}) => {
  return useQuery({
    queryKey: ['properties', params],
    queryFn: () => propertyAPI.getProperties(params),
    staleTime: 3 * 60 * 1000, // 3 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
    placeholderData: keepPreviousData,
  });
};

export const useProperty = (id) => {
  return useQuery({
    queryKey: ['property', id],
    queryFn: () => propertyAPI.getPropertyById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const usePropertyStats = () => {
  return useQuery({
    queryKey: ['properties', 'stats'],
    queryFn: () => propertyAPI.getPropertyStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });
};

// Infinite Scroll Queries for large datasets
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

export const useInfiniteProperties = (params = {}) => {
  return useInfiniteQuery({
    queryKey: ['properties', 'infinite', params],
    queryFn: ({ pageParam = 1 }) => 
      propertyAPI.getProperties({ ...params, page: pageParam, limit: 20 }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.data.length < 20) return undefined;
      return allPages.length + 1;
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
};

// Maintenance Queries
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

// Payment Queries
export const usePayments = (params = {}) => {
  return useQuery({
    queryKey: ['payments', params],
    queryFn: () => paymentAPI.getPayments(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    placeholderData: keepPreviousData,
  });
};

export const usePayment = (id) => {
  return useQuery({
    queryKey: ['payment', id],
    queryFn: () => paymentAPI.getPaymentById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const usePaymentStats = () => {
  return useQuery({
    queryKey: ['payments', 'stats'],
    queryFn: () => paymentAPI.getPaymentStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });
};

// Document Queries
export const useDocuments = (params = {}) => {
  return useQuery({
    queryKey: ['documents', params],
    queryFn: () => documentAPI.getDocuments(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    placeholderData: keepPreviousData,
  });
};

export const useDocument = (id) => {
  return useQuery({
    queryKey: ['document', id],
    queryFn: () => documentAPI.getDocumentById(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes - documents don't change often
  });
};

// Mutations with optimistic updates
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

export const useCreateProperty = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => propertyAPI.createProperty(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties', 'stats'] });
    },
  });
};

export const useUpdateProperty = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => propertyAPI.updateProperty(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['property', id] });
      const previousProperty = queryClient.getQueryData(['property', id]);
      queryClient.setQueryData(['property', id], (old) => ({ ...old, ...data }));
      return { previousProperty };
    },
    onError: (err, { id }, context) => {
      queryClient.setQueryData(['property', id], context.previousProperty);
    },
    onSettled: (data, error, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['property', id] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
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

export const useCreatePayment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => paymentAPI.createPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payments', 'stats'] });
    },
  });
};

export const useUploadDocument = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (formData) => documentAPI.uploadDocument(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
};

// Prefetching utilities
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

export const usePrefetchProperty = () => {
  const queryClient = useQueryClient();
  
  return (id) => {
    queryClient.prefetchQuery({
      queryKey: ['property', id],
      queryFn: () => propertyAPI.getPropertyById(id),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };
};
