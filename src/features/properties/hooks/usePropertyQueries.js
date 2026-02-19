import { useQuery, useMutation, useQueryClient, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { propertyAPI } from '../api/propertyApi';

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
