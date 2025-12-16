import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  useEffect(() => {
    const checkAuthentication = async () => {
      if (user) {
        try {
          // Vérifier la validité du token à chaque navigation
          await apiService.ensureValidToken();
        } catch (error) {
          console.error('Token invalide, redirection vers login:', error);
          // Le service API se charge de la redirection
        }
      }
    };

    checkAuthentication();
  }, [user]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.2rem'
      }}>
        Vérification de l'authentification...
      </div>
    );
  }

  if (!user) {
    // L'utilisateur sera redirigé par le AuthContext
    return null;
  }

  return children;
};

export default ProtectedRoute;
