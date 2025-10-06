import React, { useEffect, useMemo, useState } from 'react';
import { addRule, clearRules, deleteRule, getRules, updateRule } from '../services/keywordRules';
import { apiService as fe } from '../services/api';
import './KeywordRules.css';

const defaultRule = { keyword: '', type: 'DEBIT', category: '' };

const KeywordRules = () => {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(defaultRule);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const refresh = () => setRules(getRules());

  useEffect(() => {
    refresh();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const token = localStorage.getItem('token');
      const categoriesData = await fe.getCategories(token);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
      setError('Erreur lors du chargement des catégories');
    } finally {
      setLoadingCategories(false);
    }
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.keyword.trim()) {
      setError('Veuillez renseigner un mot-clé');
      return;
    }
    if (form.type !== 'DEBIT' && form.type !== 'CREDIT') {
      setError('Type invalide');
      return;
    }
    if (!form.category) {
      setError('Veuillez sélectionner une catégorie');
      return;
    }
    addRule(form);
    setForm(defaultRule);
    setSuccess('Règle ajoutée');
    refresh();
  };

  const onDelete = (id) => {
    if (window.confirm('Supprimer cette règle ?')) {
      deleteRule(id);
      refresh();
    }
  };

  const onClear = () => {
    if (window.confirm('Supprimer toutes les règles ?')) {
      clearRules();
      refresh();
    }
  };

  const filtered = useMemo(() => {
    if (!search) return rules;
    const q = search.toLowerCase();
    return rules.filter((r) => r.keyword.toLowerCase().includes(q));
  }, [rules, search]);

  const updateInline = (id, field, value) => {
    updateRule(id, { [field]: value });
    refresh();
  };

  const getCategoryDisplayName = (categoryValue) => {
    if (!categoryValue) return '';

    // Si c'est un ID, trouver le nom de la catégorie
    const categoryById = categories.find(cat => cat.id === categoryValue);
    if (categoryById) {
      return categoryById.name;
    }

    // Si c'est un nom, le retourner directement (compatibilité ancienne version)
    return categoryValue;
  };

  const getCategoryIdFromValue = (categoryValue) => {
    if (!categoryValue) return '';

    // Si c'est déjà un ID valide, le retourner
    const categoryById = categories.find(cat => cat.id === categoryValue);
    if (categoryById) {
      return categoryValue;
    }

    // Si c'est un nom, essayer de trouver l'ID correspondant
    const categoryByName = categories.find(cat => cat.name === categoryValue);
    if (categoryByName) {
      return categoryByName.id;
    }

    // Sinon retourner une chaîne vide pour forcer la sélection par défaut
    return '';
  };

  // Fonction pour mettre à jour automatiquement les anciennes règles avec les nouveaux IDs
  const migrateOldCategoryNames = () => {
    const needsMigration = rules.some(rule => {
      if (!rule.category) return false;
      // Vérifier si c'est un nom de catégorie (pas un ID)
      const isId = categories.some(cat => cat.id === rule.category);
      const isName = categories.some(cat => cat.name === rule.category);
      return !isId && isName;
    });

    if (needsMigration && categories.length > 0) {
      rules.forEach(rule => {
        if (rule.category) {
          const categoryByName = categories.find(cat => cat.name === rule.category);
          if (categoryByName && !categories.find(cat => cat.id === rule.category)) {
            // Mettre à jour la règle avec l'ID
            updateRule(rule.id, { category: categoryByName.id });
          }
        }
      });
      // Rafraîchir après migration
      setTimeout(() => refresh(), 100);
    }
  };

  // Effectuer la migration quand les catégories sont chargées
  useEffect(() => {
    if (categories.length > 0 && rules.length > 0) {
      migrateOldCategoryNames();
    }
  }, [categories, rules]);

  return (
    <div className="keyword-rules">
      <div className="rules-header">
        <h1>Règles de mots-clés</h1>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="rules-form-card">
        <h2>Ajouter une règle</h2>
        <form onSubmit={onSubmit} className="rules-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="keyword">Mot-clé</label>
              <input
                id="keyword"
                name="keyword"
                value={form.keyword}
                onChange={onChange}
                placeholder="ex: T2RIV"
              />
            </div>
            <div className="form-group">
              <label htmlFor="type">Type</label>
              <select id="type" name="type" value={form.type} onChange={onChange}>
                <option value="DEBIT">Débit</option>
                <option value="CREDIT">Crédit</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="category">Catégorie</label>
              {loadingCategories ? (
                <div className="loading-categories">Chargement des catégories...</div>
              ) : (
                <select
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={onChange}
                  required
                >
                  <option value="">Sélectionner une catégorie</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="form-group">
              <button type="submit" className="primary">Ajouter</button>
            </div>
          </div>
        </form>
      </div>

      <div className="rules-list-card">
        <div className="list-toolbar">
          <input
            placeholder="Rechercher un mot-clé…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="danger" onClick={onClear}>Tout supprimer</button>
        </div>

        {filtered.length === 0 ? (
          <div className="no-data">Aucune règle</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Mot-clé</th>
                  <th>Type</th>
                  <th>Catégorie</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const selectedCategoryId = getCategoryIdFromValue(r.category);
                  return (
                    <tr key={r.id}>
                      <td>
                        <input
                          value={r.keyword}
                          onChange={(e) => updateInline(r.id, 'keyword', e.target.value)}
                        />
                      </td>
                      <td>
                        <select
                          value={r.type}
                          onChange={(e) => updateInline(r.id, 'type', e.target.value)}
                        >
                          <option value="DEBIT">Débit</option>
                          <option value="CREDIT">Crédit</option>
                        </select>
                      </td>
                      <td>
                        <select
                          value={selectedCategoryId}
                          onChange={(e) => updateInline(r.id, 'category', e.target.value)}
                          title={getCategoryDisplayName(r.category)}
                        >
                          <option value="">Sélectionner une catégorie</option>
                          {categories.map(category => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                        {r.category && !selectedCategoryId && (
                          <div className="category-warning" title="Cette catégorie n'existe plus dans le système">
                            ⚠️ {r.category}
                          </div>
                        )}
                      </td>
                      <td>
                        <button className="danger" onClick={() => onDelete(r.id)}>
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default KeywordRules;

