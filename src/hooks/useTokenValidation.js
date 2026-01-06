import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';

/**
 * Hook personnalisé pour vérifier automatiquement la validité du token
 * sur chaque page et chaque requête
 */
export const useTokenValidation = () => {
  const { user, logout } = useAuth();

  useEffect(() => {
    // Valider le token au montage du composant
    const validateToken = async () => {
      if (user && localStorage.getItem('token')) {
        try {
          await apiService.ensureValidToken();
        } catch (error) {
          console.error('Token invalide détecté:', error);
          logout();
        }
      }
    };

    validateToken();

    // Intercepter toutes les requêtes fetch pour vérifier le token
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const [url, options] = args;

      // Si c'est une requête API avec un token
      if (url.includes('/api/') && options?.headers?.Authorization) {
        try {
          await apiService.ensureValidToken();
        } catch (error) {
          console.error('Token invalide lors de la requête:', error);
          logout();
          throw error;
        }
      }

      return originalFetch(...args);
    };

    // Nettoyer à la fin
    return () => {
      window.fetch = originalFetch;
    };
  }, [user, logout]);

  return {
    isAuthenticated: !!user,
    user
  };
};
