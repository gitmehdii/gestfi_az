const API_BASE_URL = 'http://localhost:8080/api';

class ApiService {
  constructor() {
    this.navigate = null;
  }

  // Méthode pour injecter la fonction de navigation de React Router
  setNavigate(navigateFunction) {
    this.navigate = navigateFunction;
  }

  // Vérifier si le token est expiré
  isTokenExpired(token) {
    if (!token) return true;
    try {
      const [, payload] = token.split('.');
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(atob(base64).split('').map(c => '%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      const claims = JSON.parse(json);
      const now = Math.floor(Date.now() / 1000);
      return claims.exp < now;
    } catch {
      return true;
    }
  }

  // Vérifier et rafraîchir le token si nécessaire
  async ensureValidToken() {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');

    if (!token || !refreshToken) {
      this.redirectToLogin();
      throw new Error('Utilisateur non authentifié');
    }

    if (this.isTokenExpired(token)) {
      try {
        const newTokens = await this.refreshToken(refreshToken);
        localStorage.setItem('token', newTokens.token);
        localStorage.setItem('refreshToken', newTokens.refreshToken);
        return newTokens.token;
      } catch (refreshError) {
        console.error('Erreur lors du refresh:', refreshError);
        this.redirectToLogin();
        throw new Error('Session expirée');
      }
    }

    return token;
  }

  // Rediriger vers la page de login
  redirectToLogin() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');

    if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
      if (this.navigate) {
        // Utiliser React Router si disponible
        this.navigate('/login');
      } else {
        // Fallback vers window.location si navigate n'est pas disponible
        window.location.href = '/login';
      }
    }
  }

  // Obtenir l'ID utilisateur valide
  getUserId() {
    const userData = localStorage.getItem('user');
    if (!userData) {
      throw new Error('Utilisateur non trouvé');
    }

    try {
      const user = JSON.parse(userData);
      const userId = user.id || user.userId || user.uuid || user.userUUID || user.user_id;

      if (!userId || userId === 'undefined' || userId === undefined) {
        throw new Error('ID utilisateur invalide');
      }

      return userId;
    } catch (parseError) {
      console.error('Erreur de parsing des données utilisateur:', parseError);
      throw new Error('Données utilisateur invalides');
    }
  }

  // Méthode utilitaire pour gérer les requêtes API avec validation des tokens
  async makeAuthenticatedRequest(url, options = {}) {
    try {
      const validToken = await this.ensureValidToken();

      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (response.status === 401) {
        this.redirectToLogin();
        throw new Error('Session expirée');
      }

      return response;
    } catch (error) {
      if (error.message === 'Utilisateur non authentifié' || error.message === 'Session expirée') {
        this.redirectToLogin();
      }
      throw error;
    }
  }
  async login(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/user/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la connexion');
      }

      return data;
    } catch (error) {
      console.error('Erreur de connexion:', error);
      throw error;
    }
  }

  async register(userData) {
    try {
      const response = await fetch(`${API_BASE_URL}/user/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de l\'inscription');
      }

      return data;
    } catch (error) {
      console.error('Erreur d\'inscription:', error);
      throw error;
    }
  }

  async getCompteEpargneByUserId(userId = null) {
    try {
      // Valider le token avant la requête
      const validToken = await this.ensureValidToken();

      // Utiliser l'userId fourni ou récupérer celui de l'utilisateur connecté
      const finalUserId = userId || this.getUserId();

      if (!finalUserId || finalUserId === 'undefined' || finalUserId === undefined) {
        throw new Error('ID utilisateur invalide');
      }

      const response = await fetch(`${API_BASE_URL}/epargne/${finalUserId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          this.redirectToLogin();
        }
        throw new Error(data.message || 'Erreur lors de la récupération du compte épargne');
      }

      return data;
    } catch (error) {
      console.error('Erreur de récupération du compte épargne:', error);
      if (error.message === 'Utilisateur non authentifié' || error.message === 'Session expirée') {
        this.redirectToLogin();
      }
      throw error;
    }
  }

  async addValueToCompteEpargne(userId = null, addValue) {
    try {
      // Valider le token avant la requête
      const validToken = await this.ensureValidToken();

      // Utiliser l'userId fourni ou récupérer celui de l'utilisateur connecté
      const finalUserId = userId || this.getUserId();

      if (!finalUserId || finalUserId === 'undefined' || finalUserId === undefined) {
        throw new Error('ID utilisateur invalide');
      }

      const response = await fetch(`${API_BASE_URL}/epargne/${finalUserId}/add?addValue=${addValue}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          this.redirectToLogin();
        }
        throw new Error(data.message || "Erreur lors de l'ajout de valeur au compte épargne");
      }

      return data;
    } catch (error) {
      console.error("Erreur d'ajout de valeur:", error);
      if (error.message === 'Utilisateur non authentifié' || error.message === 'Session expirée') {
        this.redirectToLogin();
      }
      throw error;
    }
  }

  async removeValueFromCompteEpargne(userId = null, removeValue) {
    try {
      // Valider le token avant la requête
      const validToken = await this.ensureValidToken();

      // Utiliser l'userId fourni ou récupérer celui de l'utilisateur connecté
      const finalUserId = userId || this.getUserId();

      if (!finalUserId || finalUserId === 'undefined' || finalUserId === undefined) {
        throw new Error('ID utilisateur invalide');
      }

      const response = await fetch(`${API_BASE_URL}/epargne/${finalUserId}/remove?removeValue=${removeValue}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          this.redirectToLogin();
        }
        throw new Error(data.message || "Erreur lors du retrait depuis le compte épargne");
      }

      return data;
    } catch (error) {
      console.error("Erreur lors du retrait:", error);
      if (error.message === 'Utilisateur non authentifié' || error.message === 'Session expirée') {
        this.redirectToLogin();
      }
      throw error;
    }
  }

  async refreshToken(refreshToken) {
    try {
      const response = await fetch(`${API_BASE_URL}/user/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Erreur lors du rafraîchissement du token:', data);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');

        // Redirect to login or handle session expiration
        if (this.navigate) {
          this.navigate('/login');
        } else {
          window.location.href = '/login';
        }
        throw new Error(data.message || 'Erreur lors du rafraîchissement du token');
      }

      return data;
    } catch (error) {
      console.error('Erreur de rafraîchissement:', error);
      throw error;
    }
  }

  // Méthodes pour les catégories
  async getCategories() {
    try {
      const validToken = await this.ensureValidToken();

      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if(response.status === 401) {
          this.redirectToLogin();
        }
        throw new Error(data.message || 'Erreur lors de la récupération des catégories');
      }

      return data;
    } catch (error) {
      console.error('Erreur lors de la récupération des catégories:', error);
      if (error.message === 'Utilisateur non authentifié' || error.message === 'Session expirée') {
        this.redirectToLogin();
      }
      throw error;
    }
  }

  async createCategory(categoryData) {
    try {
      const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/categories`, {
        method: 'POST',
        body: JSON.stringify(categoryData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la création de la catégorie');
      }

      return data;
    } catch (error) {
      console.error('Erreur lors de la création de la catégorie:', error);
      throw error;
    }
  }

  // Méthodes pour les transactions
  async getTransactions() {
    try {
      const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/transactions`, {
        method: 'GET',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la récupération des transactions');
      }

      return data;
    } catch (error) {
      console.error('Erreur lors de la récupération des transactions:', error);
      throw error;
    }
  }

  async createTransaction(transactionData) {
    try {
      const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/transactions`, {
        method: 'POST',
        body: JSON.stringify(transactionData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la création de la transaction');
      }

      return data;
    } catch (error) {
      console.error('Erreur lors de la création de la transaction:', error);
      throw error;
    }
  }

  async getLatestTransactions() {
    try {
      const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/transactions/latest`, {
        method: 'GET',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la récupération des dernières transactions');
      }

      return data;
    } catch (error) {
      console.error('Erreur lors de la récupération des dernières transactions:', error);
      throw error;
    }
  }

  async updateTransaction(transactionId, transactionData) {
    try {
      const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/transactions/${transactionId}`, {
        method: 'PUT',
        body: JSON.stringify(transactionData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la mise à jour de la transaction');
      }

      return data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la transaction:', error);
      throw error;
    }
  }

  async deleteTransaction(transactionId) {
    try {
      const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/transactions/${transactionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erreur lors de la suppression de la transaction');
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la suppression de la transaction:', error);
      throw error;
    }
  }
  

  // Méthode pour parser un PDF CCF
  async parseCcfStatement(file, format = 'structured') {
    try {
      const validToken = await this.ensureValidToken();
      const formData = new FormData();
      formData.append('pdfFile', file);

      const response = await fetch(`${API_BASE_URL}/transactions/parse-ccf?format=${format}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${validToken}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if(response.status === 401) {
          this.redirectToLogin();
        }
        throw new Error(data.message || 'Erreur lors du parsing du PDF');
      }

      return data;
    } catch (error) {
      console.error('Erreur lors du parsing du PDF:', error);
      if (error.message === 'Utilisateur non authentifié' || error.message === 'Session expirée') {
        this.redirectToLogin();
      }
      throw error;
    }
  }

  async getCategoriesEstimations() {
    try {
      const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/categories/estimations`, {
        method: 'GET',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la récupération des estimations');
      }

      return data;
    } catch (error) {
      console.error('Erreur lors de la récupération des estimations:', error);
      throw error;
    }
  }

  async getCategorieEstimations(id) {
    try {
      const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/categories/${id}/estimations`, {
        method: 'GET',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la récupération des estimations de la catégorie');
      }

      return data;
    } catch (error) {
      console.error('Erreur lors de la récupération des estimations de la catégorie:', error);
      throw error;
    }
  }

  async updateCategorieEstimations(id, payload) {
    try {
      const response = await this.makeAuthenticatedRequest(`${API_BASE_URL}/categories/${id}/estimations`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erreur lors de la mise à jour des estimations');
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la mise à jour des estimations:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
