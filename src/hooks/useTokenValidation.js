import { useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook personnalisé pour vérifier la validité du token
 * Version simplifiée pour éviter les boucles infinies
 */
export const useTokenValidation = () => {
  const { user } = useAuth();
  const isInitialized = useRef(false);

  // Marquer comme initialisé au premier appel
  if (!isInitialized.current) {
    isInitialized.current = true;
  }

  return {
    isAuthenticated: !!user,
    user
  };
};
