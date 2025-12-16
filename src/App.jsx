import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import CompteEpargne from './components/CompteEpargne';
import TransactionManagement from './components/TransactionManagement';
import TransactionConsultation from './components/TransactionConsultation';
import Analytics from './components/Analytics';
import Estimations from './components/Estimations';
import KeywordRules from './components/KeywordRules';
import './App.css';

function AppContent() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.2rem' 
      }}>
        Chargement de l'application...
      </div>
    );
  }

  return (
    <Routes>
      {user ? (
        <>
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/compte-epargne" element={
            <ProtectedRoute>
              <CompteEpargne />
            </ProtectedRoute>
          } />
          <Route path="/transactions" element={
            <ProtectedRoute>
              <TransactionManagement />
            </ProtectedRoute>
          } />
          <Route path="/consultation" element={
            <ProtectedRoute>
              <TransactionConsultation />
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          } />
          <Route path="/estimations" element={
            <ProtectedRoute>
              <Estimations />
            </ProtectedRoute>
          } />
          <Route path="/keyword-rules" element={
            <ProtectedRoute>
              <KeywordRules />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </>
      ) : (
        <>
          <Route 
            path="/login" 
            element={<Login onToggleMode={() => navigate('/register')} />} 
          />
          <Route 
            path="/register" 
            element={<Register onToggleMode={() => navigate('/login')} onRegisterSuccess={() => navigate('/login')} />} 
          />
          <Route path="*" element={<Navigate to="/login" />} />
        </>
      )}
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
