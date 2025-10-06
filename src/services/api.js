const API_BASE_URL = '/api';

class ApiService {
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
        window.location.href = '/login';
        throw new Error(data.message || 'Erreur lors du rafraîchissement du token');
      }

      return data;
    } catch (error) {
      console.error('Erreur de rafraîchissement:', error);
      throw error;
    }
  }

  // Méthodes pour les catégories
  async getCategories(token) {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if(response.status == 401) // Unauthorized, handle accordingly
        {
          if(localStorage.getItem('refreshToken')) {
            const newTokens = await this.refreshToken(localStorage.getItem('refreshToken'));
            // if error
            if (!newTokens) {
              throw new Error('Erreur lors du rafraîchissement du token');
            }
            localStorage.setItem('token', newTokens.token);
            localStorage.setItem('refreshToken', newTokens.refreshToken);
            return await this.getCategories(localStorage.getItem('token'));
          }
          else {
            // If no refresh token is available, redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
        }
        throw new Error(data.message || 'Erreur lors de la récupération des catégories');
      }

      return data;
    } catch (error) {
      if (response.status === 401) {
        console.error('Session expirée, veuillez vous reconnecter.');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        // redirect to login or handle session expiration
        window.location.href = '/login';
      }
      console.error('Erreur lors de la récupération des catégories:', error);
      throw error;
    }
  }

  async createCategory(categoryData, token) {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryData),
      });

      const data = await response.json();

      if (!response.ok) {

        if(response.status == 401) // Unauthorized, handle accordingly
        {
          if(localStorage.getItem('refreshToken')) {
            const newTokens = await this.refreshToken(localStorage.getItem('refreshToken'));
            // if error
            if (!newTokens) {
              throw new Error('Erreur lors du rafraîchissement du token');
            }
            localStorage.setItem('token', newTokens.token);
            localStorage.setItem('refreshToken', newTokens.refreshToken);
            // Retry the original request with the new access token
            return await this.createCategory(categoryData, localStorage.getItem('token'));
          }
          else {
            // If no refresh token is available, redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
        }
        throw new Error(data.message || 'Erreur lors de la création de la catégorie');
      }

      return data;
    } catch (error) {
      console.error('Erreur lors de la création de la catégorie:', error);
      throw error;
    }
  }

  // Méthodes pour les transactions
  async getTransactions(token) {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {

        if(response.status == 401) // Unauthorized, handle accordingly
        {
          if(localStorage.getItem('refreshToken')) {
            const newTokens = await this.refreshToken(localStorage.getItem('refreshToken'));
            // if error
            if (!newTokens) {
              throw new Error('Erreur lors du rafraîchissement du token');
            }
            localStorage.setItem('token', newTokens.token);
            localStorage.setItem('refreshToken', newTokens.refreshToken);
            // Retry the original request with the new access token
            return await this.getTransactions(localStorage.getItem('token'));
          }
          else {
            // If no refresh token is available, redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
        }


        throw new Error(data.message || 'Erreur lors de la récupération des transactions');
      }

      return data;
    } catch (error) {
      console.error('Erreur lors de la récupération des transactions:', error);
      throw error;
    }
  }

  async createTransaction(transactionData, token) {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      });

      const data = await response.json();

      if (!response.ok) {
        if(response.status == 401) // Unauthorized, handle accordingly
        {
          if(localStorage.getItem('refreshToken')) {
            const newTokens = await this.refreshToken(localStorage.getItem('refreshToken'));
            // if error
            if (!newTokens) {
              throw new Error('Erreur lors du rafraîchissement du token');
            }
            localStorage.setItem('token', newTokens.token);
            localStorage.setItem('refreshToken', newTokens.refreshToken);
            // Retry the original request with the new access token
            return await this.createTransaction(transactionData, localStorage.getItem('token'));
          }
          else {
            // If no refresh token is available, redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
        }
        throw new Error(data.message || 'Erreur lors de la création de la transaction');
      }

      return data;
    } catch (error) {
      console.error('Erreur lors de la création de la transaction:', error);
      throw error;
    }
  }

  async getLatestTransactions(token) {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/latest`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if(response.status == 401) // Unauthorized, handle accordingly
        {
          if(localStorage.getItem('refreshToken')) {
            const newTokens = await this.refreshToken(localStorage.getItem('refreshToken'));
            // if error
            if (!newTokens) {
              throw new Error('Erreur lors du rafraîchissement du token');
            }
            localStorage.setItem('token', newTokens.token);
            localStorage.setItem('refreshToken', newTokens.refreshToken);
            // Retry the original request with the new access token
            return await this.getLatestTransactions(localStorage.getItem('token'));
          }
          else {
            // If no refresh token is available, redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
        }
        throw new Error(data.message || 'Erreur lors de la récupération des dernières transactions');
      }

      return data;
    } catch (error) {
      console.error('Erreur lors de la récupération des dernières transactions:', error);
      throw error;
    }
  }

  async updateTransaction(transactionId, transactionData, token) {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/${transactionId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      });

      const data = await response.json();

      if (!response.ok) {
        if(response.status == 401) // Unauthorized, handle accordingly
        {
          if(localStorage.getItem('refreshToken')) {
            const newTokens = await this.refreshToken(localStorage.getItem('refreshToken'));
            // if error
            if (!newTokens) {
              throw new Error('Erreur lors du rafraîchissement du token');
            }
            localStorage.setItem('token', newTokens.token);
            localStorage.setItem('refreshToken', newTokens.refreshToken);
            // Retry the original request with the new access token
            return await this.updateTransaction(transactionId, transactionData, localStorage.getItem('token'));
          }
          else {
            // If no refresh token is available, redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
        }
        throw new Error(data.message || 'Erreur lors de la mise à jour de la transaction');
      }

      return data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la transaction:', error);
      throw error;
    }
  }

  async deleteTransaction(transactionId, token) {
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/${transactionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if(response.status == 401) // Unauthorized, handle accordingly
        {
          if(localStorage.getItem('refreshToken')) {
            const newTokens = await this.refreshToken(localStorage.getItem('refreshToken'));
            // if error
            if (!newTokens) {
              throw new Error('Erreur lors du rafraîchissement du token');
            }
            localStorage.setItem('token', newTokens.token);
            localStorage.setItem('refreshToken', newTokens.refreshToken);
            // Retry the original request with the new access token
            return await this.deleteTransaction(transactionId, localStorage.getItem('token'));
          }
          else {
            // If no refresh token is available, redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
        }
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
  async parseCcfStatement(file, format = 'structured', token) {
    try {
      const formData = new FormData();
      formData.append('pdfFile', file);

      const response = await fetch(`${API_BASE_URL}/transactions/parse-ccf?format=${format}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if(response.status == 401) // Unauthorized, handle accordingly
        {
          if(localStorage.getItem('refreshToken')) {
            const newTokens = await this.refreshToken(localStorage.getItem('refreshToken'));
            // if error
            if (!newTokens) {
              throw new Error('Erreur lors du rafraîchissement du token');
            }
            localStorage.setItem('token', newTokens.token);
            localStorage.setItem('refreshToken', newTokens.refreshToken);
            // Retry the original request with the new access token
            return await this.parseCcfStatement(file, format, localStorage.getItem('token'));
          }
          else {
            // If no refresh token is available, redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
        }
        throw new Error(data.message || 'Erreur lors du parsing du PDF');
      }

      return data;
    } catch (error) {
      console.error('Erreur lors du parsing du PDF:', error);
      throw error;
    }
  }

  async getCategoriesEstimations(token) {
    try {
      const response = await fetch(`${API_BASE_URL}/categories/estimations`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status == 401) {
          if (localStorage.getItem('refreshToken')) {
            const newTokens = await this.refreshToken(localStorage.getItem('refreshToken'));
            if (!newTokens) throw new Error('Erreur lors du rafraîchissement du token');
            localStorage.setItem('token', newTokens.token);
            localStorage.setItem('refreshToken', newTokens.refreshToken);
            return await this.getCategoriesEstimations(localStorage.getItem('token'));
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
        }
        throw new Error(data.message || 'Erreur lors de la récupération des estimations');
      }
      return data;
    } catch (error) {
      console.error('Erreur lors de la récupération des estimations:', error);
      throw error;
    }
  }

  async getCategorieEstimations(id, token) {
    try {
      const response = await fetch(`${API_BASE_URL}/categories/${id}/estimations`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status == 401) {
          if (localStorage.getItem('refreshToken')) {
            const newTokens = await this.refreshToken(localStorage.getItem('refreshToken'));
            if (!newTokens) throw new Error('Erreur lors du rafraîchissement du token');
            localStorage.setItem('token', newTokens.token);
            localStorage.setItem('refreshToken', newTokens.refreshToken);
            return await this.getCategorieEstimations(id, localStorage.getItem('token'));
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
        }
        throw new Error(data.message || 'Erreur lors de la récupération des estimations de la catégorie');
      }
      return data;
    } catch (error) {
      console.error('Erreur lors de la récupération des estimations de la catégorie:', error);
      throw error;
    }
  }

  async updateCategorieEstimations(id, payload, token) {
    try {
      const response = await fetch(`${API_BASE_URL}/categories/${id}/estimations`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        if (response.status == 401) {
          if (localStorage.getItem('refreshToken')) {
            const newTokens = await this.refreshToken(localStorage.getItem('refreshToken'));
            if (!newTokens) throw new Error('Erreur lors du rafraîchissement du token');
            localStorage.setItem('token', newTokens.token);
            localStorage.setItem('refreshToken', newTokens.refreshToken);
            return await this.updateCategorieEstimations(id, payload, localStorage.getItem('token'));
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
        }
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
