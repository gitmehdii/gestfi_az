import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import TransactionManagement from './TransactionManagement';
import TransactionConsultation from './TransactionConsultation';
import Analytics from './Analytics';
import KeywordRules from './KeywordRules';
import Estimations from './Estimations';
import CompteEpargne from './CompteEpargne';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');

  const handleLogout = () => {
    logout();
  };

  if (currentView === 'transactions') {
    return (
      <div className="view-with-fixed-header">
        <div className="dashboard-header">
          <h1>Gestion des Transactions</h1>
          <div className="header-buttons">
            <button 
              onClick={() => setCurrentView('dashboard')} 
              className="back-button"
            >
              ← Retour au tableau de bord
            </button>
            <button onClick={handleLogout} className="logout-button">
              Déconnexion
            </button>
          </div>
        </div>
        <TransactionManagement />
      </div>
    );
  }

  if (currentView === 'consultation') {
    return (
      <div className="view-with-fixed-header">
        <div className="dashboard-header">
          <h1>Consultation des Transactions</h1>
          <div className="header-buttons">
            <button 
              onClick={() => setCurrentView('dashboard')} 
              className="back-button"
            >
              ← Retour au tableau de bord
            </button>
            <button onClick={handleLogout} className="logout-button">
              Déconnexion
            </button>
          </div>
        </div>
        <TransactionConsultation />
      </div>
    );
  }

  if (currentView === 'analytics') {
    return (
      <div className="view-with-fixed-header">
        <div className="dashboard-header">
          <h1>Analyse des données</h1>
          <div className="header-buttons">
            <button 
              onClick={() => setCurrentView('dashboard')} 
              className="back-button"
            >
              ← Retour au tableau de bord
            </button>
            <button onClick={handleLogout} className="logout-button">
              Déconnexion
            </button>
          </div>
        </div>
        <Analytics />
      </div>
    );
  }

  if (currentView === 'estimations') {
    return (
      <div className="view-with-fixed-header">
        <div className="dashboard-header">
          <h1>Estimations</h1>
          <div className="header-buttons">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="back-button"
            >
              ← Retour au tableau de bord
            </button>
            <button onClick={handleLogout} className="logout-button">
              Déconnexion
            </button>
          </div>
        </div>
        <Estimations />
      </div>
    );
  }

  if (currentView === 'keyword-rules') {
    return (
      <div className="view-with-fixed-header">
        <div className="dashboard-header">
          <h1>Règles de mots-clés</h1>
          <div className="header-buttons">
            <button 
              onClick={() => setCurrentView('dashboard')} 
              className="back-button"
            >
              ← Retour au tableau de bord
            </button>
            <button onClick={handleLogout} className="logout-button">
              Déconnexion
            </button>
          </div>
        </div>
        <KeywordRules />
      </div>
    );
  }

  if (currentView === 'compte-epargne') {
    return (
      <div className="view-with-fixed-header">
        <div className="dashboard-header">
          <h1>Compte épargne</h1>
          <div className="header-buttons">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="back-button"
            >
              ← Retour au tableau de bord
            </button>
            <button onClick={handleLogout} className="logout-button">
              Déconnexion
            </button>
          </div>
        </div>
        <CompteEpargne showBackLink={false} />
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Tableau de bord</h1>
        <button onClick={handleLogout} className="logout-button">
          Déconnexion
        </button>
      </div>
      
      <div className="dashboard-content">
        <div className="user-info-card">
          <h2>Informations utilisateur</h2>
          <div className="user-details">
            <p><strong>Nom d'affichage:</strong> {user?.displayName}</p>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Administrateur:</strong> {user?.isAdmin ? 'Oui' : 'Non'}</p>
          </div>
        </div>

        <div className="welcome-message">
          <h3>Bienvenue, {user?.displayName} !</h3>
          <p>Vous êtes maintenant connecté à l'application de gestion.</p>
        </div>

        <div className="actions-section">
          <h3>Actions disponibles</h3>
          <div className="action-buttons">
            <button 
              onClick={() => setCurrentView('transactions')} 
              className="action-button transactions-button"
            >
              <span className="action-icon">💰</span>
              <div>
                <h4>Gestion des Transactions</h4>
                <p>Créer et gérer vos transactions et catégories</p>
              </div>
            </button>
            
            <button 
              onClick={() => setCurrentView('consultation')} 
              className="action-button consultation-button"
            >
              <span className="action-icon">📊</span>
              <div>
                <h4>Consultation des Transactions</h4>
                <p>Consulter, filtrer et modifier vos transactions</p>
              </div>
            </button>

            <button 
              onClick={() => setCurrentView('analytics')} 
              className="action-button consultation-button"
            >
              <span className="action-icon">📈</span>
              <div>
                <h4>Analyse des données</h4>
                <p>Graphiques et récapitulatifs interactifs</p>
              </div>
            </button>

            <button
              onClick={() => setCurrentView('estimations')}
              className="action-button consultation-button"
            >
              <span className="action-icon">🧮</span>
              <div>
                <h4>Estimations</h4>
                <p>Prévoir vos montants par catégorie (par défaut N-1)</p>
              </div>
            </button>

            <button 
              onClick={() => setCurrentView('keyword-rules')} 
              className="action-button consultation-button"
            >
              <span className="action-icon">🔎</span>
              <div>
                <h4>Règles de mots-clés</h4>
                <p>Classifier automatiquement les transactions</p>
              </div>
            </button>

            <button
              onClick={() => setCurrentView('compte-epargne')}
              className="action-button consultation-button"
            >
              <span className="action-icon">🏦</span>
              <div>
                <h4>Compte épargne</h4>
                <p>Consulter et alimenter votre épargne</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
