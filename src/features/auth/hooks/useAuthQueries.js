import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { authAPI } from '../api/authApi';

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
