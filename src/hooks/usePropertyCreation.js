import { useAuth } from '../context/AuthContext';
import api from '../services/api';

/**
 * Custom hook for creating properties with automatic token refresh
 * PHASE 1 FIX: Handles JWT token update after property creation
 */
export const usePropertyCreation = () => {
  const { updateToken } = useAuth();

  const createProperty = async (propertyData) => {
    try {
      const response = await api.post('/properties', propertyData);

      // If response includes new token, update it
      if (response.data?.token) {
        updateToken(response.data.token);
      }

      return response.data.data; // Return the property data
    } catch (error) {
      throw error;
    }
  };

  return { createProperty };
};

export default usePropertyCreation;
