import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import './PdfTransactionImporter.css';
import { applyRules } from '../services/keywordRules';

const PdfTransactionImporter = ({ onImportComplete, onCancel }) => {
  const { user } = useAuth();
  const [step, setStep] = useState('upload'); // 'upload', 'review', 'processing'
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [parseResult, setParseResult] = useState(null);
  const [categories, setCategories] = useState([]);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [savedSessions, setSavedSessions] = useState([]);
  const [sessionName, setSessionName] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [autoSaving, setAutoSaving] = useState(false);

  useEffect(() => {
    loadCategories();
    loadSavedSessions();
  }, []);

  const loadSavedSessions = () => {
    const saved = localStorage.getItem('pdfImportSessions');
    if (saved) {
      try {
        setSavedSessions(JSON.parse(saved));
      } catch (error) {
        console.error('Erreur lors du chargement des sessions sauvegardées:', error);
      }
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

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError('');
    } else {
      setError('Veuillez sélectionner un fichier PDF valide');
      setFile(null);
    }
  };

  const handleUploadAndParse = async () => {
    if (!file) {
      setError('Veuillez sélectionner un fichier PDF');
      return;
    }

    if (!sessionName.trim()) {
      setError('Veuillez entrer un nom pour cette session');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Créer un ID unique pour cette session
      const sessionId = Date.now().toString();
      setCurrentSessionId(sessionId);
      
      const token = localStorage.getItem('token');
      
      const result = await apiService.parseCcfStatement(file, 'structured', token);
      setParseResult(result);
      
      // Convertir les transactions parsées en format utilisable
      const transactions = result.transactions.map((transaction, index) => {
        // Convertir la date au format YYYY-MM-DD
        let formattedDate = '';
        if (transaction.dateValeur || transaction.dateOperation) {
          const dateStr = transaction.dateValeur || transaction.dateOperation;
          // Si la date est au format DD/MM ou DD/MM/YYYY
          if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 2) {
              // Format DD/MM - ajouter l'année courante
              const currentYear = new Date().getFullYear();
              formattedDate = `${currentYear}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            } else if (parts.length === 3) {
              // Format DD/MM/YYYY
              let year = parts[2];
              if (year.length === 2) {
                year = '20' + year; // Convertir YY en 20YY
              }
              formattedDate = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          } else {
            // Si c'est déjà au bon format ou autre format
            formattedDate = dateStr;
          }
        }
        
        return {
          id: `parsed-${index}`,
          operation: transaction.libelle || '',
          date: formattedDate || new Date().toISOString().split('T')[0],
          type: transaction.credit > 0 ? 'CREDIT' : 'DEBIT',
          valeur: transaction.credit > 0 ? transaction.credit : Math.abs(transaction.debit),
          categorieId: '',
          reference: transaction.reference || '',
          page: transaction.page || 1,
          confirmed: false,
          modified: false,
          cancelled: false
        };
      });
      
      // NEW: appliquer les règles de mots-clés (éventuellement change le type)
      const transactionsAfterRules = applyRules(transactions);
      
      setPendingTransactions(transactionsAfterRules);
      setStep('review');
      setSuccess(`${transactions.length} transactions trouvées dans le PDF`);
    } catch (error) {
      setError(error.message || 'Erreur lors du parsing du PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionChange = (transactionId, field, value) => {
    setPendingTransactions(prev => 
      prev.map(transaction => 
        transaction.id === transactionId 
          ? { ...transaction, [field]: value, modified: true }
          : transaction
      )
    );
    
    // Auto-save immédiat après chaque modification
    setTimeout(() => autoSave(), 100);
  };

  const handleConfirmTransaction = (transactionId) => {
    setPendingTransactions(prev => 
      prev.map(transaction => 
        transaction.id === transactionId 
          ? { ...transaction, confirmed: !transaction.confirmed }
          : transaction
      )
    );
    
    // Auto-save immédiat après confirmation/déconfirmation
    setTimeout(() => autoSave(), 100);
  };

  const handleCancelTransaction = (transactionId) => {
    setPendingTransactions(prev => 
      prev.map(transaction => 
        transaction.id === transactionId 
          ? { ...transaction, cancelled: !transaction.cancelled }
          : transaction
      )
    );
    
    // Auto-save immédiat après annulation/réactivation
    setTimeout(() => autoSave(), 100);
  };

  const handleConfirmAll = () => {
    setPendingTransactions(prev => 
      prev.map(transaction => 
        !transaction.cancelled 
          ? { ...transaction, confirmed: true }
          : transaction
      )
    );
    
    // Auto-save immédiat après confirmation en masse
    setTimeout(() => autoSave(), 100);
  };

  const handleCancelAll = () => {
    setPendingTransactions(prev => 
      prev.map(transaction => ({ ...transaction, cancelled: true, confirmed: false }))
    );
    
    // Auto-save immédiat après annulation en masse
    setTimeout(() => autoSave(), 100);
  };

  const handleImportConfirmedTransactions = async () => {
    const confirmedTransactions = pendingTransactions.filter(t => t.confirmed && !t.cancelled);
    
    if (confirmedTransactions.length === 0) {
      setError('Aucune transaction confirmée à importer');
      return;
    }

    // Vérifier que toutes les transactions confirmées ont une catégorie
    const transactionsWithoutCategory = confirmedTransactions.filter(t => !t.categorieId);
    if (transactionsWithoutCategory.length > 0) {
      setError(`${transactionsWithoutCategory.length} transaction(s) confirmée(s) n'ont pas de catégorie sélectionnée. Veuillez sélectionner une catégorie pour chaque transaction confirmée.`);
      return;
    }

    try {
      setLoading(true);
      setStep('processing');
      const token = localStorage.getItem('token');
      let successCount = 0;
      let errorCount = 0;

      for (const transaction of confirmedTransactions) {
        try {
          const transactionData = {
            operation: transaction.operation,
            date: transaction.date,
            type: transaction.type,
            valeur: transaction.valeur,
            categorieId: transaction.categorieId
          };
          
          await apiService.createTransaction(transactionData, token);
          successCount++;
        } catch (error) {
          console.error('Erreur lors de la création de la transaction:', error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        setSuccess(`${successCount} transaction(s) importée(s) avec succès`);
        if (errorCount > 0) {
          setError(`${errorCount} transaction(s) n'ont pas pu être importées`);
        }
        
        // Nettoyer la session sauvegardée après importation réussie
        if (currentSessionId) {
          const sessions = JSON.parse(localStorage.getItem('pdfImportSessions') || '[]');
          const updatedSessions = sessions.filter(s => s.id !== currentSessionId);
          localStorage.setItem('pdfImportSessions', JSON.stringify(updatedSessions));
        }
        
        setTimeout(() => {
          onImportComplete();
        }, 2000);
      } else {
        setError('Aucune transaction n\'a pu être importée');
      }
    } catch (error) {
      setError('Erreur lors de l\'importation des transactions');
    } finally {
      setLoading(false);
    }
  };

  const confirmedCount = pendingTransactions.filter(t => t.confirmed && !t.cancelled).length;
  const cancelledCount = pendingTransactions.filter(t => t.cancelled).length;

  // Fonction pour gérer l'annulation avec confirmation
  const handleCancelWithConfirmation = () => {
    const hasUnsavedWork = pendingTransactions.length > 0;
    
    if (hasUnsavedWork) {
      const confirmMessage = `Attention ! En annulant, vous perdrez toute la session en cours.\n\n` +
        `Session actuelle :\n` +
        `• ${pendingTransactions.length} transactions analysées\n` +
        `• ${confirmedCount} confirmées\n` +
        `• ${cancelledCount} annulées\n\n` +
        `Voulez-vous vraiment abandonner cette session ?`;
      
      if (window.confirm(confirmMessage)) {
        // Supprimer la session actuelle des sauvegardes
        if (currentSessionId) {
          const sessions = JSON.parse(localStorage.getItem('pdfImportSessions') || '[]');
          const updatedSessions = sessions.filter(s => s.id !== currentSessionId);
          localStorage.setItem('pdfImportSessions', JSON.stringify(updatedSessions));
        }
        
        // Appeler la fonction d'annulation du parent
        onCancel();
      }
    } else {
      // Pas de travail en cours, annuler directement
      onCancel();
    }
  };

  // Fonctions de sauvegarde/chargement - saveCurrentSession supprimée car l'auto-save gère tout
  const loadSession = (sessionId) => {
    const sessions = JSON.parse(localStorage.getItem('pdfImportSessions') || '[]');
    const session = sessions.find(s => s.id === sessionId);
    
    if (session) {
      setParseResult(session.parseResult);
      setPendingTransactions(session.pendingTransactions);
      setStep(session.step);
      setCurrentSessionId(session.id);
      setSessionName(session.name);
      setSuccess(`Session "${session.name}" chargée avec succès !`);
    }
  };

  const deleteSession = (sessionId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette session ?')) {
      const sessions = JSON.parse(localStorage.getItem('pdfImportSessions') || '[]');
      const updatedSessions = sessions.filter(s => s.id !== sessionId);
      localStorage.setItem('pdfImportSessions', JSON.stringify(updatedSessions));
      setSavedSessions(updatedSessions);
      setSuccess('Session supprimée avec succès !');
    }
  };

  const autoSave = () => {
    if (pendingTransactions.length > 0 && currentSessionId && sessionName.trim()) {
      setAutoSaving(true);
      
      const sessionData = {
        id: currentSessionId,
        name: sessionName.trim(),
        date: new Date().toISOString(),
        parseResult,
        pendingTransactions,
        step
      };

      // Mettre à jour ou créer la session dans la liste
      const existingSessions = JSON.parse(localStorage.getItem('pdfImportSessions') || '[]');
      const sessionIndex = existingSessions.findIndex(s => s.id === currentSessionId);
      
      if (sessionIndex >= 0) {
        existingSessions[sessionIndex] = sessionData;
      } else {
        existingSessions.push(sessionData);
      }
      
      localStorage.setItem('pdfImportSessions', JSON.stringify(existingSessions));
      setSavedSessions(existingSessions);
      
      // Cacher l'indicateur après un court délai
      setTimeout(() => setAutoSaving(false), 500);
    }
  };

  // Auto-save toutes les 30 secondes
  useEffect(() => {
    const interval = setInterval(autoSave, 30000);
    return () => clearInterval(interval);
  }, [pendingTransactions, parseResult, step]);

  // Vérifier s'il y a une sauvegarde automatique au démarrage - SUPPRIMÉ
  // useEffect(() => {
  //   const autoSave = localStorage.getItem('pdfImportAutoSave');
  //   if (autoSave && step === 'upload') {
  //     // ... ancien code supprimé
  //   }
  // }, []);

  if (step === 'upload') {
    return (
      <div className="pdf-importer">
        <div className="importer-header">
          <h2>Importer des transactions depuis un PDF</h2>
          <p>Sélectionnez un relevé bancaire CCF au format PDF pour extraire automatiquement les transactions</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* Sessions sauvegardées */}
        {savedSessions.length > 0 && (
          <div className="saved-sessions-section">
            <h3>Sessions sauvegardées</h3>
            <div className="sessions-list">
              {savedSessions.map(session => (
                <div key={session.id} className="session-item">
                  <div className="session-info">
                    <h4>{session.name}</h4>
                    <p>Sauvegardé le {new Date(session.date).toLocaleString('fr-FR')}</p>
                    <p>{session.pendingTransactions?.length || 0} transactions</p>
                  </div>
                  <div className="session-actions">
                    <button 
                      onClick={() => loadSession(session.id)}
                      className="load-session-button"
                    >
                      Reprendre
                    </button>
                    <button 
                      onClick={() => deleteSession(session.id)}
                      className="delete-session-button"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="upload-section">
          <div className="session-name-section">
            <h3>Nom de la session</h3>
            <p>Donnez un nom à votre session de travail pour pouvoir la reprendre plus tard si nécessaire</p>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="Ex: Relevé Janvier 2025, Import Salaire Décembre..."
              className="session-name-input-main"
            />
          </div>

          <div className="file-input-wrapper">
            <input
              type="file"
              id="pdfFile"
              accept=".pdf"
              onChange={handleFileSelect}
              className="file-input"
            />
            <label htmlFor="pdfFile" className="file-input-label">
              <span className="file-icon">📄</span>
              <span>{file ? file.name : 'Choisir un fichier PDF'}</span>
            </label>
          </div>

          {file && (
            <div className="file-info">
              <p><strong>Fichier sélectionné:</strong> {file.name}</p>
              <p><strong>Taille:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          )}

          <div className="action-buttons">
            <button 
              onClick={onCancel} 
              className="cancel-button"
            >
              Annuler
            </button>
            <button 
              onClick={handleUploadAndParse}
              disabled={!file || !sessionName.trim() || loading}
              className="parse-button"
            >
              {loading ? 'Analyse en cours...' : 'Analyser le PDF'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'review') {
    return (
      <div className="pdf-importer with-floating-actions">
        <div className="importer-header">
          <h2>Validation des transactions</h2>
          <p>Vérifiez et modifiez les transactions avant de les importer</p>
          
          {parseResult && (
            <div className="parse-summary">
              <div className="summary-item">
                <span>Compte:</span>
                <span>{parseResult.compteInfo?.numeroCompte || 'N/A'}</span>
              </div>
              <div className="summary-item">
                <span>Titulaire:</span>
                <span>{parseResult.compteInfo?.titulaire || 'N/A'}</span>
              </div>
              <div className="summary-item">
                <span>Total Crédits:</span>
                <span className="credit">+{parseResult.resume?.totalCredits?.toFixed(2) || '0.00'} €</span>
              </div>
              <div className="summary-item">
                <span>Total Débits:</span>
                <span className="debit">-{parseResult.resume?.totalDebits?.toFixed(2) || '0.00'} €</span>
              </div>
            </div>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="review-controls">
          <div className="bulk-actions">
            <button onClick={handleConfirmAll} className="confirm-all-button">
              Confirmer tout ({pendingTransactions.filter(t => !t.cancelled).length})
            </button>
            <button onClick={handleCancelAll} className="cancel-all-button">
              Annuler tout
            </button>
          </div>
          
          <div className="review-stats">
            <span className="stat confirmed">Confirmées: {confirmedCount}</span>
            <span className="stat cancelled">Annulées: {cancelledCount}</span>
            <span className="stat pending">En attente: {pendingTransactions.length - confirmedCount - cancelledCount}</span>
          </div>
        </div>

        <div className="transactions-review">
          {pendingTransactions.map(transaction => (
            <div 
              key={transaction.id} 
              className={`transaction-review-item ${transaction.confirmed ? 'confirmed' : ''} ${transaction.cancelled ? 'cancelled' : ''}`}
            >
              <div className="transaction-header">
                <div className="transaction-controls">
                  <button
                    onClick={() => handleConfirmTransaction(transaction.id)}
                    className={`confirm-button ${transaction.confirmed ? 'active' : ''}`}
                    disabled={transaction.cancelled}
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => handleCancelTransaction(transaction.id)}
                    className={`cancel-button ${transaction.cancelled ? 'active' : ''}`}
                  >
                    ✕
                  </button>
                </div>
                <div className="transaction-status">
                  {transaction.cancelled ? 'Annulée' : transaction.confirmed ? 'Confirmée' : 'En attente'}
                </div>
              </div>

              <div className="transaction-fields">
                <div className="field-row">
                  <div className="field-group">
                    <label>Opération:</label>
                    <input
                      type="text"
                      value={transaction.operation}
                      onChange={(e) => handleTransactionChange(transaction.id, 'operation', e.target.value)}
                      disabled={transaction.cancelled}
                    />
                  </div>
                  <div className="field-group">
                    <label>Date:</label>
                    <input
                      type="date"
                      value={transaction.date}
                      onChange={(e) => handleTransactionChange(transaction.id, 'date', e.target.value)}
                      disabled={transaction.cancelled}
                    />
                  </div>
                </div>

                <div className="field-row">
                  <div className="field-group">
                    <label>Type:</label>
                    <select
                      value={transaction.type}
                      onChange={(e) => handleTransactionChange(transaction.id, 'type', e.target.value)}
                      disabled={transaction.cancelled}
                    >
                      <option value="DEBIT">Débit</option>
                      <option value="CREDIT">Crédit</option>
                    </select>
                  </div>
                  <div className="field-group">
                    <label>Montant:</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={transaction.valeur}
                      onChange={(e) => handleTransactionChange(transaction.id, 'valeur', parseFloat(e.target.value))}
                      disabled={transaction.cancelled}
                    />
                  </div>
                </div>

                <div className="field-group full-width">
                  <label>Catégorie:</label>
                  <select
                    value={transaction.categorieId}
                    onChange={(e) => handleTransactionChange(transaction.id, 'categorieId', e.target.value)}
                    disabled={transaction.cancelled}
                    required={transaction.confirmed}
                  >
                    <option value="">Sélectionner une catégorie</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {transaction.reference && (
                  <div className="field-group full-width">
                    <label>Référence:</label>
                    <input
                      type="text"
                      value={transaction.reference}
                      disabled
                      className="readonly"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Barre d'actions flottante */}
        <div className="floating-actions">
          <div className="actions-left">
            <div className="session-stats">
              {confirmedCount} confirmées • {cancelledCount} annulées • {pendingTransactions.length - confirmedCount - cancelledCount} en attente
              {autoSaving && <span className="auto-save-indicator"> • 💾 Sauvegarde...</span>}
            </div>
          </div>
          
          <div className="actions-right">
            <button
              onClick={handleImportConfirmedTransactions}
              disabled={confirmedCount === 0 || loading}
              className="import-button"
            >
              Importer ({confirmedCount})
            </button>
          </div>
        </div>

        {/* Modal de sauvegarde supprimé - plus nécessaire avec l'auto-save */}
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className="pdf-importer">
        <div className="processing-section">
          <div className="loading-spinner"></div>
          <h2>Importation en cours...</h2>
          <p>Veuillez patienter pendant l'importation des transactions</p>
          
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
        </div>
      </div>
    );
  }

  return null;
};

export default PdfTransactionImporter;
