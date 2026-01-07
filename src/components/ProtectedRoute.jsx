import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

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
