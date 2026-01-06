import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';

/**
 * Hook pour injecter la fonction de navigation React Router dans le service API
 * Ce hook doit être utilisé au niveau du composant racine de l'application
 */
export const useApiNavigation = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Injecter la fonction navigate dans le service API
    apiService.setNavigate(navigate);

    // Cleanup au démontage (optionnel)
    return () => {
      apiService.setNavigate(null);
    };
  }, [navigate]);
};
