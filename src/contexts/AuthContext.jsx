/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api';

export const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const decodeJwt = (token) => {
  try {
    const [, payload] = token.split('.');
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(base64).split('').map(c => '%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(json);
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const normalizeUser = (raw) => {
    if (!raw || typeof raw !== 'object') return null;
    const id = raw.id || raw.userId || raw.uuid || raw.userUUID || raw.user_id;
    return id ? { ...raw, id } : { ...raw };
  };

  // Fonction pour nettoyer les données d'authentification
  const clearAuthData = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Fonction pour valider et récupérer l'utilisateur connecté
  const validateAndSetUser = async () => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const refreshToken = localStorage.getItem('refreshToken');

    if (!token || !userData || !refreshToken) {
      clearAuthData();
      setLoading(false);
      return;
    }

    try {
      // Vérifier si le token est valide
      await apiService.ensureValidToken();

      // Parser et normaliser les données utilisateur
      const parsed = JSON.parse(userData);
      let normalized = normalizeUser(parsed);

      if (normalized && !normalized.id) {
        const claims = decodeJwt(token);
        const derivedId = claims?.sub || claims?.userId || claims?.uid || claims?.id || claims?.user_id;
        if (derivedId) {
          normalized = { ...normalized, id: derivedId };
        }
      }

      if (normalized && normalized.id && normalized.id !== 'undefined') {
        setUser(normalized);
        localStorage.setItem('user', JSON.stringify(normalized));
      } else {
        console.error('ID utilisateur invalide:', normalized);
        clearAuthData();
      }
    } catch (error) {
      console.error('Erreur lors de la validation du token:', error);
      clearAuthData();
    }

    setLoading(false);
  };

  useEffect(() => {
    validateAndSetUser();

    // Vérifier périodiquement la validité du token (toutes les 5 minutes)
    const tokenCheckInterval = setInterval(async () => {
      if (localStorage.getItem('token')) {
        try {
          await apiService.ensureValidToken();
        } catch (error) {
          console.error('Session expirée:', error);
          clearAuthData();
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(tokenCheckInterval);
  }, []);

  const login = async (email, password) => {
    const res = await apiService.login(email, password);
    localStorage.setItem('token', res.token);
    localStorage.setItem('refreshToken', res.refreshToken);

    const rawUser = {
      id: res.id,
      userId: res.userId,
      uuid: res.uuid,
      email: res.email,
      displayName: res.displayName,
      isAdmin: res.isAdmin,
    };

    let normalized = normalizeUser(rawUser);
    if (normalized && !normalized.id && res.token) {
      const claims = decodeJwt(res.token);
      const derivedId = claims?.sub || claims?.userId || claims?.uid || claims?.id || claims?.user_id;
      if (derivedId) normalized = { ...normalized, id: derivedId };
    }

    if (!normalized || !normalized.id || normalized.id === 'undefined') {
      throw new Error('Données utilisateur invalides reçues du serveur');
    }

    localStorage.setItem('user', JSON.stringify(normalized));
    setUser(normalized);
    return res;
  };

  const logout = () => {
    clearAuthData();
  };

  const register = async (userData) => {
    return apiService.register(userData);
  };

  const value = {
    user,
    login,
    logout,
    register,
    loading,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
