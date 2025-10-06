import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import PdfTransactionImporter from './PdfTransactionImporter';
import './TransactionManagement.css';

const TransactionManagement = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('transactions');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPdfImporter, setShowPdfImporter] = useState(false);

  // États pour le formulaire de transaction
  const [transactionForm, setTransactionForm] = useState({
    operation: '',
    date: new Date().toISOString().split('T')[0],
    type: '',
    valeur: '',
    categorieId: ''
  });

  // États pour le formulaire de catégorie
  const [categoryForm, setCategoryForm] = useState({
    name: ''
  });

  useEffect(() => {
    loadCategories();
    loadTransactions();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const categoriesData = await apiService.getCategories(token);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
      setError('Erreur lors du chargement des catégories');
    } finally {
      setLoading(false);
    }
  };

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

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const transactionData = {
        ...transactionForm,
        valeur: parseFloat(transactionForm.valeur)
      };
      
      await apiService.createTransaction(transactionData, token);
      setSuccess('Transaction créée avec succès !');
      setTransactionForm({
        operation: '',
        date: new Date().toISOString().split('T')[0],
        type: '',
        valeur: '',
        categorieId: ''
      });
      loadTransactions();
    } catch (error) {
      setError(error.message || 'Erreur lors de la création de la transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await apiService.createCategory(categoryForm, token);
      setSuccess('Catégorie créée avec succès !');
      setCategoryForm({ name: '' });
      loadCategories();
    } catch (error) {
      setError(error.message || 'Erreur lors de la création de la catégorie');
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionChange = (e) => {
    const { name, value } = e.target;
    setTransactionForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCategoryChange = (e) => {
    const { name, value } = e.target;
    setCategoryForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePdfImportComplete = () => {
    setShowPdfImporter(false);
    setSuccess('Transactions importées avec succès !');
    loadTransactions();
  };

  const handleCancelPdfImport = () => {
    setShowPdfImporter(false);
  };

  // Si l'importateur PDF est ouvert, on l'affiche
  if (showPdfImporter) {
    return (
      <PdfTransactionImporter
        onImportComplete={handlePdfImportComplete}
        onCancel={handleCancelPdfImport}
      />
    );
  }

  return (
    <div className="transaction-management">
      <div className="management-header">
        <h1>Gestion des Transactions et Catégories</h1>
        <div className="tab-buttons">
          <button 
            className={`tab-button ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            Transactions
          </button>
          <button 
            className={`tab-button ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            Catégories
          </button>
          <button 
            className="tab-button pdf-import-button"
            onClick={() => setShowPdfImporter(true)}
          >
            📄 Importer PDF
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {activeTab === 'transactions' && (
        <div className="transactions-section">
          <div className="form-section">
            <h2>Créer une nouvelle transaction</h2>
            <form onSubmit={handleTransactionSubmit} className="transaction-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="operation">Opération:</label>
                  <input
                    type="text"
                    id="operation"
                    name="operation"
                    value={transactionForm.operation}
                    onChange={handleTransactionChange}
                    required
                    placeholder="Description de l'opération"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="date">Date:</label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={transactionForm.date}
                    onChange={handleTransactionChange}
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="type">Type:</label>
                  <select
                    id="type"
                    name="type"
                    value={transactionForm.type}
                    onChange={handleTransactionChange}
                    required
                  >
                    <option value="">Sélectionner un type</option>
                    <option value="DEBIT">Débit</option>
                    <option value="CREDIT">Crédit</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="valeur">Valeur:</label>
                  <input
                    type="number"
                    id="valeur"
                    name="valeur"
                    value={transactionForm.valeur}
                    onChange={handleTransactionChange}
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="categorieId">Catégorie:</label>
                <select
                  id="categorieId"
                  name="categorieId"
                  value={transactionForm.categorieId}
                  onChange={handleTransactionChange}
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

              <button type="submit" disabled={loading} className="submit-button">
                {loading ? 'Création...' : 'Créer la transaction'}
              </button>
            </form>
          </div>

          <div className="list-section">
            <h2>Transactions récentes</h2>
            {loading ? (
              <div className="loading">Chargement...</div>
            ) : (
              <div className="transactions-list">
                {transactions.length === 0 ? (
                  <p className="no-data">Aucune transaction trouvée</p>
                ) : (
                  transactions.slice(0, 10).map(transaction => (
                    <div key={transaction.id} className="transaction-item">
                      <div className="transaction-info">
                        <h3>{transaction.operation}</h3>
                        <p>Date: {new Date(transaction.date).toLocaleDateString('fr-FR')}</p>
                        <p>Catégorie: {transaction.categorie?.name || 'N/A'}</p>
                      </div>
                      <div className={`transaction-amount ${transaction.type?.toLowerCase()}`}>
                        {transaction.type === 'DEBIT' ? '-' : '+'}
                        {transaction.valeur?.toFixed(2)} €
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="categories-section">
          <div className="form-section">
            <h2>Créer une nouvelle catégorie</h2>
            <form onSubmit={handleCategorySubmit} className="category-form">
              <div className="form-group">
                <label htmlFor="categoryName">Nom de la catégorie:</label>
                <input
                  type="text"
                  id="categoryName"
                  name="name"
                  value={categoryForm.name}
                  onChange={handleCategoryChange}
                  required
                  placeholder="Nom de la catégorie"
                />
              </div>
              
              <button type="submit" disabled={loading} className="submit-button">
                {loading ? 'Création...' : 'Créer la catégorie'}
              </button>
            </form>
          </div>

          <div className="list-section">
            <h2>Catégories existantes</h2>
            {loading ? (
              <div className="loading">Chargement...</div>
            ) : (
              <div className="categories-list">
                {categories.length === 0 ? (
                  <p className="no-data">Aucune catégorie trouvée</p>
                ) : (
                  categories.map(category => (
                    <div key={category.id} className="category-item">
                      <h3>{category.name}</h3>
                      <p>ID: {category.id}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionManagement;
