import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { paymentAPI } from '../api/paymentApi';

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
