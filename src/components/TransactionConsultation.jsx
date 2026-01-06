import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTokenValidation } from '../hooks/useTokenValidation';
import { apiService } from '../services/api';
import './TransactionConsultation.css';

const TransactionConsultation = () => {
  const { user } = useAuth();
  const { isAuthenticated } = useTokenValidation();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // États pour les filtres
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    type: '',
    categorieId: '',
    searchTerm: ''
  });

  // État pour le formulaire d'édition
  const [editForm, setEditForm] = useState({
    operation: '',
    date: '',
    type: '',
    valeur: '',
    categorieId: ''
  });

  useEffect(() => {
    loadTransactions();
    loadCategories();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const transactionsData = await apiService.getTransactions(token);
      setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
    } catch (error) {
      console.error('Erreur lors du chargement des transactions:', error);
      setError('Erreur lors du chargement des transactions');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const categoriesData = await apiService.getCategories(token);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
    }
  };

  const handleEditTransaction = (transaction) => {
    setEditingTransaction(transaction);
    setEditForm({
      operation: transaction.operation || '',
      date: transaction.date || '',
      type: transaction.type || '',
      valeur: transaction.valeur?.toString() || '',
      categorieId: transaction.categorie?.id || ''
    });
    setShowEditModal(true);
    setError('');
    setSuccess('');
  };

  const handleUpdateTransaction = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const updateData = {
        ...editForm,
        valeur: parseFloat(editForm.valeur)
      };
      
      await apiService.updateTransaction(editingTransaction.id, updateData, token);
      setSuccess('Transaction mise à jour avec succès !');
      setShowEditModal(false);
      setEditingTransaction(null);
      loadTransactions();
    } catch (error) {
      setError(error.message || 'Erreur lors de la mise à jour de la transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) {
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await apiService.deleteTransaction(transactionId, token);
      setSuccess('Transaction supprimée avec succès !');
      loadTransactions();
    } catch (error) {
      setError(error.message || 'Erreur lors de la suppression de la transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      type: '',
      categorieId: '',
      searchTerm: ''
    });
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingTransaction(null);
    setError('');
    setSuccess('');
  };

  // Filtrer les transactions
  const filteredTransactions = transactions.filter(transaction => {
    const matchesDateFrom = !filters.dateFrom || new Date(transaction.date) >= new Date(filters.dateFrom);
    const matchesDateTo = !filters.dateTo || new Date(transaction.date) <= new Date(filters.dateTo);
    const matchesType = !filters.type || transaction.type === filters.type;
    const matchesCategory = !filters.categorieId || transaction.categorie?.id === filters.categorieId;
    const matchesSearch = !filters.searchTerm || 
      transaction.operation?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      transaction.categorie?.name?.toLowerCase().includes(filters.searchTerm.toLowerCase());

    return matchesDateFrom && matchesDateTo && matchesType && matchesCategory && matchesSearch;
  });

  // Calculer le total des transactions filtrées
  const totalCredit = filteredTransactions
    .filter(t => t.type === 'CREDIT')
    .reduce((sum, t) => sum + (t.valeur || 0), 0);
  
  const totalDebit = filteredTransactions
    .filter(t => t.type === 'DEBIT')
    .reduce((sum, t) => sum + (t.valeur || 0), 0);

  const solde = totalCredit - totalDebit;

  return (
    <div className="transaction-consultation">
      <div className="consultation-header">
        <h1>Consultation des Transactions</h1>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Filtres */}
      <div className="filters-section">
        <h2>Filtres</h2>
        <div className="filters-form">
          <div className="filter-row">
            <div className="filter-group">
              <label htmlFor="dateFrom">Date de début:</label>
              <input
                type="date"
                id="dateFrom"
                name="dateFrom"
                value={filters.dateFrom}
                onChange={handleFilterChange}
              />
            </div>
            <div className="filter-group">
              <label htmlFor="dateTo">Date de fin:</label>
              <input
                type="date"
                id="dateTo"
                name="dateTo"
                value={filters.dateTo}
                onChange={handleFilterChange}
              />
            </div>
            <div className="filter-group">
              <label htmlFor="filterType">Type:</label>
              <select
                id="filterType"
                name="type"
                value={filters.type}
                onChange={handleFilterChange}
              >
                <option value="">Tous les types</option>
                <option value="DEBIT">Débit</option>
                <option value="CREDIT">Crédit</option>
              </select>
            </div>
          </div>
          <div className="filter-row">
            <div className="filter-group">
              <label htmlFor="filterCategory">Catégorie:</label>
              <select
                id="filterCategory"
                name="categorieId"
                value={filters.categorieId}
                onChange={handleFilterChange}
              >
                <option value="">Toutes les catégories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="searchTerm">Recherche:</label>
              <input
                type="text"
                id="searchTerm"
                name="searchTerm"
                value={filters.searchTerm}
                onChange={handleFilterChange}
                placeholder="Rechercher dans les opérations..."
              />
            </div>
            <div className="filter-group">
              <button onClick={clearFilters} className="clear-filters-button">
                Effacer les filtres
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Résumé financier */}
      <div className="financial-summary">
        <div className="summary-item credit">
          <h3>Total Crédits</h3>
          <p>+{totalCredit.toFixed(2)} €</p>
        </div>
        <div className="summary-item debit">
          <h3>Total Débits</h3>
          <p>-{totalDebit.toFixed(2)} €</p>
        </div>
        <div className={`summary-item solde ${solde >= 0 ? 'positive' : 'negative'}`}>
          <h3>Solde</h3>
          <p>{solde >= 0 ? '+' : ''}{solde.toFixed(2)} €</p>
        </div>
      </div>

      {/* Liste des transactions */}
      <div className="transactions-section">
        <div className="section-header">
          <h2>Transactions ({filteredTransactions.length})</h2>
        </div>
        
        {loading ? (
          <div className="loading">Chargement...</div>
        ) : (
          <div className="transactions-table">
            {filteredTransactions.length === 0 ? (
              <p className="no-data">Aucune transaction trouvée avec ces critères</p>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Opération</th>
                      <th>Catégorie</th>
                      <th>Type</th>
                      <th>Montant</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map(transaction => (
                      <tr key={transaction.id}>
                        <td>{new Date(transaction.date).toLocaleDateString('fr-FR')}</td>
                        <td>{transaction.operation}</td>
                        <td>{transaction.categorie?.name || 'N/A'}</td>
                        <td>
                          <span className={`type-badge ${transaction.type?.toLowerCase()}`}>
                            {transaction.type === 'DEBIT' ? 'Débit' : 'Crédit'}
                          </span>
                        </td>
                        <td className={`amount ${transaction.type?.toLowerCase()}`}>
                          {transaction.type === 'DEBIT' ? '-' : '+'}
                          {transaction.valeur?.toFixed(2)} €
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              onClick={() => handleEditTransaction(transaction)}
                              className="edit-button"
                              title="Modifier"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              className="delete-button"
                              title="Supprimer"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal d'édition */}
      {showEditModal && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Modifier la transaction</h2>
              <button onClick={closeEditModal} className="close-button">×</button>
            </div>
            
            <form onSubmit={handleUpdateTransaction} className="edit-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="editOperation">Opération:</label>
                  <input
                    type="text"
                    id="editOperation"
                    name="operation"
                    value={editForm.operation}
                    onChange={handleEditFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="editDate">Date:</label>
                  <input
                    type="date"
                    id="editDate"
                    name="date"
                    value={editForm.date}
                    onChange={handleEditFormChange}
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="editType">Type:</label>
                  <select
                    id="editType"
                    name="type"
                    value={editForm.type}
                    onChange={handleEditFormChange}
                    required
                  >
                    <option value="">Sélectionner un type</option>
                    <option value="DEBIT">Débit</option>
                    <option value="CREDIT">Crédit</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="editValeur">Valeur:</label>
                  <input
                    type="number"
                    id="editValeur"
                    name="valeur"
                    value={editForm.valeur}
                    onChange={handleEditFormChange}
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="editCategorieId">Catégorie:</label>
                <select
                  id="editCategorieId"
                  name="categorieId"
                  value={editForm.categorieId}
                  onChange={handleEditFormChange}
                  required
                >
                  <option value="">Sélectionner une catégorie</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={closeEditModal} className="cancel-button">
                  Annuler
                </button>
                <button type="submit" disabled={loading} className="save-button">
                  {loading ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionConsultation;
