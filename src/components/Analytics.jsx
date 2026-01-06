import React, { useEffect, useMemo, useState } from 'react';
import { useTokenValidation } from '../hooks/useTokenValidation';
import { apiService } from '../services/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import './Analytics.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

const monthKey = (dateStr) => {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

const numberFormat = (n) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const Analytics = () => {
  const { isAuthenticated } = useTokenValidation();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    type: '', // '', 'DEBIT', 'CREDIT'
    categorieId: '',
    minAmount: '',
    maxAmount: '',
    searchTerm: '',
    quickFilter: '', // Nouveau filtre rapide pour année/mois
  });

  const [viewMode, setViewMode] = useState('charts'); // 'charts', 'table' ou 'monthly'

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const [tx, cats] = await Promise.all([
          apiService.getTransactions(token),
          apiService.getCategories(token),
        ]);
        setTransactions(Array.isArray(tx) ? tx : []);
        setCategories(Array.isArray(cats) ? cats : []);
      } catch (e) {
        console.error(e);
        setError(e?.message || "Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updateFilter = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // Fonction pour les filtres rapides par année/mois
  const setQuickFilter = (type, value) => {
    let dateFrom = '';
    let dateTo = '';

    if (type === 'year' && value) {
      dateFrom = `${value}-01-01`;
      dateTo = `${value}-12-31`;
    } else if (type === 'month' && value) {
      const [year, month] = value.split('-');
      const lastDay = new Date(year, month, 0).getDate();
      dateFrom = `${value}-01`;
      dateTo = `${value}-${lastDay}`;
    }

    setFilters((prev) => ({
      ...prev,
      dateFrom,
      dateTo,
      quickFilter: type === 'clear' ? '' : value
    }));
  };

  // Générer les options d'années disponibles
  const availableYears = useMemo(() => {
    const years = new Set();
    transactions.forEach(t => {
      const year = new Date(t.date).getFullYear();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  // Générer les options de mois disponibles
  const availableMonths = useMemo(() => {
    const months = new Set();
    transactions.forEach(t => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthKey);
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      type: '',
      categorieId: '',
      minAmount: '',
      maxAmount: '',
      searchTerm: '',
      quickFilter: ''
    });
  };

  const filteredTransactions = useMemo(() => {
    return (transactions || []).filter((t) => {
      const d = new Date(t.date);
      const matchesDateFrom = !filters.dateFrom || d >= new Date(filters.dateFrom);
      const matchesDateTo = !filters.dateTo || d <= new Date(filters.dateTo);
      const matchesType = !filters.type || t.type === filters.type;
      const matchesCategory = !filters.categorieId || t.categorie?.id === filters.categorieId || String(t.categorie?.id) === String(filters.categorieId);
      const matchesSearch = !filters.searchTerm ||
        t.operation?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        t.categorie?.name?.toLowerCase().includes(filters.searchTerm.toLowerCase());
      const amount = Number(t.valeur) || 0;
      const matchesMin = !filters.minAmount || amount >= Number(filters.minAmount);
      const matchesMax = !filters.maxAmount || amount <= Number(filters.maxAmount);
      return matchesDateFrom && matchesDateTo && matchesType && matchesCategory && matchesSearch && matchesMin && matchesMax;
    });
  }, [transactions, filters]);

  // 1) Pie: Répartition des dépenses par catégorie (DEBIT)
  const pieData = useMemo(() => {
    const map = new Map();
    filteredTransactions
      .filter((t) => t.type === 'DEBIT')
      .forEach((t) => {
        const label = t.categorie?.name || 'Sans catégorie';
        map.set(label, (map.get(label) || 0) + (Number(t.valeur) || 0));
      });
    const labels = Array.from(map.keys());
    const data = Array.from(map.values());
    const colors = labels.map((_, i) => `hsl(${(i * 47) % 360} 70% 55%)`);
    return {
      labels,
      datasets: [
        {
          label: 'Dépenses (€)',
          data,
          backgroundColor: colors,
          borderWidth: 0,
        },
      ],
    };
  }, [filteredTransactions]);

  // 2) Bar: Totaux mensuels Crédit vs Débit
  const monthlyBarData = useMemo(() => {
    const monthsSet = new Set();
    const byMonth = new Map();
    filteredTransactions.forEach((t) => {
      const k = monthKey(t.date);
      monthsSet.add(k);
      if (!byMonth.has(k)) byMonth.set(k, { CREDIT: 0, DEBIT: 0 });
      byMonth.get(k)[t.type] += Number(t.valeur) || 0;
    });
    const labels = Array.from(monthsSet).sort();
    const credits = labels.map((m) => byMonth.get(m)?.CREDIT || 0);
    const debits = labels.map((m) => byMonth.get(m)?.DEBIT || 0);
    return {
      labels,
      datasets: [
        { label: 'Crédits', data: credits, backgroundColor: 'hsl(150 70% 45%)' },
        { label: 'Débits', data: debits, backgroundColor: 'hsl(0 75% 55%)' },
      ],
    };
  }, [filteredTransactions]);

  // 3) Line: Solde cumulatif (à partir de 0 sur l’intervalle filtré)
  const cumulativeLineData = useMemo(() => {
    const sorted = [...filteredTransactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    let solde = 0;
    const labels = [];
    const values = [];
    sorted.forEach((t) => {
      solde += (t.type === 'CREDIT' ? 1 : -1) * (Number(t.valeur) || 0);
      labels.push(new Date(t.date).toLocaleDateString('fr-FR'));
      values.push(solde);
    });
    return {
      labels,
      datasets: [
        {
          label: 'Solde cumulatif (€)',
          data: values,
          fill: false,
          borderColor: 'hsl(220 80% 55%)',
          backgroundColor: 'hsl(220 80% 55%)',
          tension: 0.2,
        },
      ],
    };
  }, [filteredTransactions]);

  // 4) Bar: Top opérations (débits) par libellé
  const topOpsData = useMemo(() => {
    const map = new Map();
    filteredTransactions
      .filter((t) => t.type === 'DEBIT')
      .forEach((t) => {
        const key = (t.operation || 'Inconnu').slice(0, 30);
        map.set(key, (map.get(key) || 0) + (Number(t.valeur) || 0));
      });
    const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const labels = entries.map((e) => e[0]);
    const data = entries.map((e) => e[1]);
    return {
      labels,
      datasets: [
        {
          label: 'Montant total (€)',
          data,
          backgroundColor: 'hsl(12 80% 55%)',
        },
      ],
    };
  }, [filteredTransactions]);

  const commonOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${numberFormat(ctx.raw)} €` } },
    },
  };

  const stackedOptions = {
    responsive: true,
    scales: { x: { stacked: true }, y: { stacked: true } },
    plugins: {
      legend: { position: 'top' },
      tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${numberFormat(ctx.raw)} €` } },
    },
  };

  const totalCredit = filteredTransactions.filter(t => t.type === 'CREDIT').reduce((s, t) => s + (Number(t.valeur) || 0), 0);
  const totalDebit = filteredTransactions.filter(t => t.type === 'DEBIT').reduce((s, t) => s + (Number(t.valeur) || 0), 0);
  const solde = totalCredit - totalDebit;

  // Données pour le tableau analytique par catégorie et année
  const tableData = useMemo(() => {
    // Obtenir toutes les années disponibles
    const allYears = Array.from(new Set(
      transactions.map(t => new Date(t.date).getFullYear())
    )).sort((a, b) => a - b);

    // Créer une map: catégorie -> année -> montant pour les débits
    const categoryYearMapDebits = new Map();
    // Créer une map: catégorie -> année -> montant pour les crédits
    const categoryYearMapCredits = new Map();

    // Traiter les débits (dépenses)
    filteredTransactions
      .filter(t => t.type === 'DEBIT')
      .forEach(t => {
        const category = t.categorie?.name || 'Sans catégorie';
        const year = new Date(t.date).getFullYear();
        const amount = Number(t.valeur) || 0;

        if (!categoryYearMapDebits.has(category)) {
          categoryYearMapDebits.set(category, new Map());
        }

        const yearMap = categoryYearMapDebits.get(category);
        yearMap.set(year, (yearMap.get(year) || 0) + amount);
      });

    // Traiter les crédits (revenus)
    filteredTransactions
      .filter(t => t.type === 'CREDIT')
      .forEach(t => {
        const category = t.categorie?.name || 'Sans catégorie';
        const year = new Date(t.date).getFullYear();
        const amount = Number(t.valeur) || 0;

        if (!categoryYearMapCredits.has(category)) {
          categoryYearMapCredits.set(category, new Map());
        }

        const yearMap = categoryYearMapCredits.get(category);
        yearMap.set(year, (yearMap.get(year) || 0) + amount);
      });

    // Convertir en tableau pour l'affichage - DEBITS
    const debitRows = Array.from(categoryYearMapDebits.entries()).map(([category, yearMap]) => {
      const row = { category, type: 'DEBIT' };

      allYears.forEach(year => {
        const currentAmount = yearMap.get(year) || 0;
        const previousAmount = yearMap.get(year - 1) || 0;

        let variation = 0;
        if (previousAmount > 0) {
          variation = ((currentAmount - previousAmount) / previousAmount) * 100;
        } else if (currentAmount > 0) {
          variation = 100;
        }

        row[`year_${year}`] = currentAmount;
        row[`variation_${year}`] = variation;
      });

      return row;
    });

    // Convertir en tableau pour l'affichage - CREDITS
    const creditRows = Array.from(categoryYearMapCredits.entries()).map(([category, yearMap]) => {
      const row = { category, type: 'CREDIT' };

      allYears.forEach(year => {
        const currentAmount = yearMap.get(year) || 0;
        const previousAmount = yearMap.get(year - 1) || 0;

        let variation = 0;
        if (previousAmount > 0) {
          variation = ((currentAmount - previousAmount) / previousAmount) * 100;
        } else if (currentAmount > 0) {
          variation = 100;
        }

        row[`year_${year}`] = currentAmount;
        row[`variation_${year}`] = variation;
      });

      return row;
    });

    // Trier par total décroissant
    const sortByTotal = (rows) => {
      return rows.sort((a, b) => {
        const totalA = allYears.reduce((sum, year) => sum + (a[`year_${year}`] || 0), 0);
        const totalB = allYears.reduce((sum, year) => sum + (b[`year_${year}`] || 0), 0);
        return totalB - totalA;
      });
    };

    return {
      debitRows: sortByTotal(debitRows),
      creditRows: sortByTotal(creditRows),
      years: allYears
    };
  }, [filteredTransactions, transactions]);

  // Données pour le tableau analytique par catégorie et mois sur une année
  const monthlyTableData = useMemo(() => {
    // Obtenir l'année sélectionnée ou l'année courante par défaut
    const selectedYear = filters.dateFrom ? new Date(filters.dateFrom).getFullYear() : new Date().getFullYear();
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // 1-12

    console.log('DEBUG - Date actuelle:', currentDate);
    console.log('DEBUG - Année courante:', currentYear);
    console.log('DEBUG - Mois courant:', currentMonth);
    console.log('DEBUG - Année sélectionnée:', selectedYear);

    // Créer les 12 mois de l'année
    const allMonths = Array.from({ length: 12 }, (_, i) => {
      const month = String(i + 1).padStart(2, '0');
      return `${selectedYear}-${month}`;
    });

    // Calculer les 3 prochains mois futurs à partir de la date actuelle
    const futureMonths = [];

    // Pour l'année courante, on veut les mois futurs DANS la même année
    if (selectedYear === currentYear) {
      // Ajouter les mois restants de l'année courante qui sont après le mois actuel
      for (let i = 1; i <= 3; i++) {
        const futureMonthNum = currentMonth + i;
        if (futureMonthNum <= 12) {
          const futureKey = `${currentYear}-${String(futureMonthNum).padStart(2, '0')}`;
          futureMonths.push(futureKey);
        }
      }

      // Si on n'a pas assez de mois dans l'année courante, ajouter les premiers mois de l'année suivante
      const remainingMonths = 3 - futureMonths.length;
      for (let i = 1; i <= remainingMonths; i++) {
        const nextYearKey = `${currentYear + 1}-${String(i).padStart(2, '0')}`;
        futureMonths.push(nextYearKey);
      }
    } else if (selectedYear > currentYear) {
      // Pour une année future, prendre les 3 premiers mois
      for (let i = 1; i <= 3; i++) {
        const futureKey = `${selectedYear}-${String(i).padStart(2, '0')}`;
        futureMonths.push(futureKey);
      }
    }
    // Pour une année passée, pas de prédictions

    console.log('DEBUG - Mois futurs calculés:', futureMonths);

    // Pour l'année courante, inclure TOUS les mois (y compris les futurs qui sont dans la même année)
    // Pour les autres années, ajouter les mois futurs seulement s'ils ne sont pas déjà inclus
    let allMonthsWithPrediction;
    if (selectedYear === currentYear) {
      // Pour l'année courante, on garde tous les 12 mois + les mois futurs de l'année suivante
      const nextYearFutureMonths = futureMonths.filter(month => !allMonths.includes(month));
      allMonthsWithPrediction = [...allMonths, ...nextYearFutureMonths];
    } else {
      allMonthsWithPrediction = [...allMonths, ...futureMonths];
    }

    // Créer une map: catégorie -> mois -> montant pour les débits
    const categoryMonthMapDebits = new Map();
    // Créer une map: catégorie -> mois -> montant pour les crédits
    const categoryMonthMapCredits = new Map();

    // Traiter les débits (dépenses) pour l'année sélectionnée
    filteredTransactions
      .filter(t => t.type === 'DEBIT' && new Date(t.date).getFullYear() === selectedYear)
      .forEach(t => {
        const category = t.categorie?.name || 'Sans catégorie';
        const monthKey = `${new Date(t.date).getFullYear()}-${String(new Date(t.date).getMonth() + 1).padStart(2, '0')}`;
        const amount = Number(t.valeur) || 0;

        if (!categoryMonthMapDebits.has(category)) {
          categoryMonthMapDebits.set(category, new Map());
        }

        const monthMap = categoryMonthMapDebits.get(category);
        monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + amount);
      });

    // Traiter les crédits (revenus) pour l'année sélectionnée
    filteredTransactions
      .filter(t => t.type === 'CREDIT' && new Date(t.date).getFullYear() === selectedYear)
      .forEach(t => {
        const category = t.categorie?.name || 'Sans catégorie';
        const monthKey = `${new Date(t.date).getFullYear()}-${String(new Date(t.date).getMonth() + 1).padStart(2, '0')}`;
        const amount = Number(t.valeur) || 0;

        if (!categoryMonthMapCredits.has(category)) {
          categoryMonthMapCredits.set(category, new Map());
        }

        const monthMap = categoryMonthMapCredits.get(category);
        monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + amount);
      });

    // Fonction de prédiction basée sur la moyenne mobile et la tendance
    const predictAmount = (categoryMap, category, targetMonth) => {
      const [targetYear, targetMonthNum] = targetMonth.split('-').map(Number);
      const targetDate = new Date(targetYear, targetMonthNum - 1);

      console.log(`DEBUG PREDICTION - Catégorie: ${category}, Mois cible: ${targetMonth}`);

      if (!categoryMap.has(category)) {
        console.log(`DEBUG PREDICTION - Aucune donnée pour la catégorie: ${category}`);
        return 0;
      }

      const monthMap = categoryMap.get(category);
      console.log(`DEBUG PREDICTION - Données de la catégorie ${category}:`, Array.from(monthMap.entries()));

      const historicalData = [];

      // Collecter les données historiques des 12 derniers mois
      for (let i = 12; i >= 1; i--) {
        const histDate = new Date(targetDate);
        histDate.setMonth(histDate.getMonth() - i);
        const histYear = histDate.getFullYear();
        const histMonth = String(histDate.getMonth() + 1).padStart(2, '0');
        const histKey = `${histYear}-${histMonth}`;
        const amount = monthMap.get(histKey) || 0;
        historicalData.push({ month: histKey, amount });
      }

      console.log(`DEBUG PREDICTION - Données historiques pour ${category}:`, historicalData);

      if (historicalData.length === 0) {
        console.log(`DEBUG PREDICTION - Aucune donnée historique pour ${category}`);
        return 0;
      }

      // Calculer la moyenne mobile sur les 3 derniers mois
      const recentData = historicalData.slice(-3);
      const recentAverage = recentData.reduce((sum, d) => sum + d.amount, 0) / recentData.length;

      console.log(`DEBUG PREDICTION - Données récentes (3 derniers mois):`, recentData);
      console.log(`DEBUG PREDICTION - Moyenne récente:`, recentAverage);

      // Calculer la tendance (régression linéaire simple)
      const n = historicalData.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

      historicalData.forEach((data, index) => {
        const x = index + 1;
        const y = data.amount;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
      });

      const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) : 0;

      // Ajustement saisonnier basé sur le mois
      const monthNum = parseInt(targetMonthNum);
      const seasonalFactors = {
        1: 1.1,   // Janvier - dépenses élevées (post-fêtes)
        2: 0.9,   // Février - plus calme
        3: 1.0,   // Mars - normal
        4: 1.0,   // Avril - normal
        5: 1.1,   // Mai - vacances/sorties
        6: 1.2,   // Juin - vacances d'été
        7: 1.3,   // Juillet - vacances d'été
        8: 1.2,   // Août - vacances d'été
        9: 1.0,   // Septembre - rentrée
        10: 1.0,  // Octobre - normal
        11: 1.1,  // Novembre - préparation fêtes
        12: 1.3   // Décembre - fêtes de fin d'année
      };

      const seasonalFactor = seasonalFactors[monthNum] || 1.0;

      // Prédiction finale : moyenne récente + tendance + ajustement saisonnier
      const trendAdjustment = slope * (n + 1);
      const prediction = (recentAverage + trendAdjustment) * seasonalFactor;

      console.log(`DEBUG PREDICTION - Pente de tendance:`, slope);
      console.log(`DEBUG PREDICTION - Facteur saisonnier:`, seasonalFactor);
      console.log(`DEBUG PREDICTION - Ajustement de tendance:`, trendAdjustment);
      console.log(`DEBUG PREDICTION - Prédiction finale pour ${category} en ${targetMonth}:`, prediction);

      return Math.max(0, prediction); // Éviter les valeurs négatives
    };

    // Convertir en tableau pour l'affichage - DEBITS
    const debitRows = Array.from(categoryMonthMapDebits.entries()).map(([category, monthMap]) => {
      const row = { category, type: 'DEBIT' };

      allMonthsWithPrediction.forEach(month => {
        const [year, monthNum] = month.split('-');
        const isPrediction = futureMonths.includes(month);

        let currentAmount;
        if (isPrediction) {
          // Utiliser la prédiction pour les mois futurs
          currentAmount = predictAmount(categoryMonthMapDebits, category, month);
        } else {
          // Utiliser les données réelles pour les mois passés
          currentAmount = monthMap.get(month) || 0;
        }

        const prevMonth = monthNum === '01' ?
          `${parseInt(year) - 1}-12` :
          `${year}-${String(parseInt(monthNum) - 1).padStart(2, '0')}`;
        const previousAmount = monthMap.get(prevMonth) || 0;

        let variation = 0;
        if (previousAmount > 0) {
          variation = ((currentAmount - previousAmount) / previousAmount) * 100;
        } else if (currentAmount > 0) {
          variation = 100;
        }

        row[`month_${month}`] = currentAmount;
        row[`variation_${month}`] = variation;
        row[`isPrediction_${month}`] = isPrediction;
      });

      return row;
    });

    // Convertir en tableau pour l'affichage - CREDITS
    const creditRows = Array.from(categoryMonthMapCredits.entries()).map(([category, monthMap]) => {
      const row = { category, type: 'CREDIT' };

      allMonthsWithPrediction.forEach(month => {
        const [year, monthNum] = month.split('-');
        const isPrediction = futureMonths.includes(month);

        let currentAmount;
        if (isPrediction) {
          // Utiliser la prédiction pour les mois futurs
          currentAmount = predictAmount(categoryMonthMapCredits, category, month);
        } else {
          // Utiliser les données réelles pour les mois passés
          currentAmount = monthMap.get(month) || 0;
        }

        const prevMonth = monthNum === '01' ?
          `${parseInt(year) - 1}-12` :
          `${year}-${String(parseInt(monthNum) - 1).padStart(2, '0')}`;
        const previousAmount = monthMap.get(prevMonth) || 0;

        let variation = 0;
        if (previousAmount > 0) {
          variation = ((currentAmount - previousAmount) / previousAmount) * 100;
        } else if (currentAmount > 0) {
          variation = 100;
        }

        row[`month_${month}`] = currentAmount;
        row[`variation_${month}`] = variation;
        row[`isPrediction_${month}`] = isPrediction;
      });

      return row;
    });

    // Trier par total décroissant
    const sortByTotal = (rows) => {
      return rows.sort((a, b) => {
        const totalA = allMonths.reduce((sum, month) => sum + (a[`month_${month}`] || 0), 0);
        const totalB = allMonths.reduce((sum, month) => sum + (b[`month_${month}`] || 0), 0);
        return totalB - totalA;
      });
    };

    return {
      debitRows: sortByTotal(debitRows),
      creditRows: sortByTotal(creditRows),
      months: allMonths,
      futureMonths,
      allMonthsWithPrediction,
      selectedYear,
      currentYear,
      currentMonth
    };
  }, [filteredTransactions, transactions, filters.dateFrom]);

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h1>Analyse des données</h1>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="filters-section">
        <h2>Filtres</h2>
        <div className="filters-form">
          {/* Filtres rapides par année et par mois */}
          <div className="filter-row quick-filters">
            <div className="filter-group">
              <label>Filtres rapides</label>
              <div className="quick-filter-buttons">
                <button
                  className={`quick-filter-btn ${!filters.quickFilter ? 'active' : ''}`}
                  onClick={() => setQuickFilter('clear', '')}
                >
                  Toutes les données
                </button>
                {availableYears.map(year => (
                  <button
                    key={year}
                    className={`quick-filter-btn ${filters.quickFilter === year.toString() ? 'active' : ''}`}
                    onClick={() => setQuickFilter('year', year.toString())}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="filter-row quick-filters">
            <div className="filter-group">
              <label>Filtrer par mois</label>
              <div className="quick-filter-buttons months-grid">
                {availableMonths.slice(0, 12).map(month => {
                  const [year, monthNum] = month.split('-');
                  const monthName = new Date(year, monthNum - 1, 1).toLocaleDateString('fr-FR', {
                    month: 'long',
                    year: 'numeric'
                  });
                  return (
                    <button
                      key={month}
                      className={`quick-filter-btn month-btn ${filters.quickFilter === month ? 'active' : ''}`}
                      onClick={() => setQuickFilter('month', month)}
                    >
                      {monthName}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="filter-row">
            <div className="filter-group">
              <label htmlFor="dateFrom">Date de début</label>
              <input type="date" id="dateFrom" name="dateFrom" value={filters.dateFrom} onChange={updateFilter} />
            </div>
            <div className="filter-group">
              <label htmlFor="dateTo">Date de fin</label>
              <input type="date" id="dateTo" name="dateTo" value={filters.dateTo} onChange={updateFilter} />
            </div>
            <div className="filter-group">
              <label htmlFor="type">Type</label>
              <select id="type" name="type" value={filters.type} onChange={updateFilter}>
                <option value="">Tous</option>
                <option value="DEBIT">Débit</option>
                <option value="CREDIT">Crédit</option>
              </select>
            </div>
          </div>
          <div className="filter-row">
            <div className="filter-group">
              <label htmlFor="categorieId">Catégorie</label>
              <select id="categorieId" name="categorieId" value={filters.categorieId} onChange={updateFilter}>
                <option value="">Toutes</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="minAmount">Montant min (€)</label>
              <input type="number" step="0.01" id="minAmount" name="minAmount" value={filters.minAmount} onChange={updateFilter} />
            </div>
            <div className="filter-group">
              <label htmlFor="maxAmount">Montant max (€)</label>
              <input type="number" step="0.01" id="maxAmount" name="maxAmount" value={filters.maxAmount} onChange={updateFilter} />
            </div>
            <div className="filter-group">
              <label htmlFor="searchTerm">Recherche</label>
              <input type="text" id="searchTerm" name="searchTerm" placeholder="Libellé, catégorie…" value={filters.searchTerm} onChange={updateFilter} />
            </div>
            <div className="filter-group">
              <button className="clear-filters-button" onClick={clearFilters}>Effacer tous les filtres</button>
            </div>
          </div>
        </div>
      </div>

      <div className="financial-summary">
        <div className="summary-item credit">
          <h3>Total Crédits</h3>
          <p>+{numberFormat(totalCredit)} €</p>
        </div>
        <div className="summary-item debit">
          <h3>Total Débits</h3>
          <p>-{numberFormat(totalDebit)} €</p>
        </div>
        <div className={`summary-item solde ${solde >= 0 ? 'positive' : 'negative'}`}>
          <h3>Solde</h3>
          <p>{solde >= 0 ? '+' : ''}{numberFormat(solde)} €</p>
        </div>
      </div>

      <div className="view-mode-toggle">
        <button
          className={`view-mode-btn ${viewMode === 'charts' ? 'active' : ''}`}
          onClick={() => setViewMode('charts')}
        >
          Vue Graphique
        </button>
        <button
          className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
          onClick={() => setViewMode('table')}
        >
          Vue Tableau
        </button>
        <button
          className={`view-mode-btn ${viewMode === 'monthly' ? 'active' : ''}`}
          onClick={() => setViewMode('monthly')}
        >
          Vue Mensuelle
        </button>
      </div>

      {viewMode === 'charts' ? (
        <div className="charts-grid">
          <div className="chart-card">
            <div className="chart-header">
              <h3>Répartition des dépenses par catégorie</h3>
            </div>
            {loading ? <div className="loading">Chargement…</div> : (
              pieData.labels.length === 0 ? <div className="no-data">Aucune dépense à afficher</div> : <Pie data={pieData} options={commonOptions} />
            )}
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h3>Totaux mensuels Crédit vs Débit</h3>
            </div>
            {loading ? <div className="loading">Chargement…</div> : (
              monthlyBarData.labels.length === 0 ? <div className="no-data">Aucune donnée mensuelle</div> : <Bar data={monthlyBarData} options={stackedOptions} />
            )}
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h3>Solde cumulatif</h3>
            </div>
            {loading ? <div className="loading">Chargement…</div> : (
              cumulativeLineData.labels.length === 0 ? <div className="no-data">Aucune donnée</div> : <Line data={cumulativeLineData} options={commonOptions} />
            )}
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h3>Top 10 dépenses par libellé</h3>
            </div>
            {loading ? <div className="loading">Chargement…</div> : (
              topOpsData.labels.length === 0 ? <div className="no-data">Aucune dépense</div> : <Bar data={topOpsData} options={commonOptions} />
            )}
          </div>
        </div>
      ) : viewMode === 'table' ? (
        <div className="table-container">
          {loading ? (
            <div className="loading">Chargement des données…</div>
          ) : tableData.debitRows.length === 0 && tableData.creditRows.length === 0 ? (
            <div className="no-data">Aucune donnée à afficher</div>
          ) : (
            <div className="analytics-table-wrapper">
              <h3>Analyse par catégorie et année</h3>

              {/* Section Dépenses */}
              {tableData.debitRows.length > 0 && (
                <div className="table-section">
                  <h4 className="section-title expenses">📉 Dépenses par catégorie</h4>
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Catégorie</th>
                        {tableData.years.map(year => (
                          <th key={year} className="year-column">
                            <div>{year}</div>
                            <div className="variation-header">Variation %</div>
                          </th>
                        ))}
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.debitRows.map((row, idx) => {
                        const total = tableData.years.reduce((sum, year) => sum + (row[`year_${year}`] || 0), 0);

                        return (
                          <tr key={idx} className="debit-row">
                            <td className="category-cell">{row.category}</td>
                            {tableData.years.map(year => {
                              const amount = row[`year_${year}`] || 0;
                              const variation = row[`variation_${year}`] || 0;
                              const showVariation = year > Math.min(...tableData.years);

                              return (
                                <td key={year} className="amount-cell">
                                  <div className="amount">{numberFormat(amount)} €</div>
                                  {showVariation && (
                                    <div className={`variation ${variation > 0 ? 'positive' : variation < 0 ? 'negative' : 'neutral'}`}>
                                      {variation > 0 ? '+' : ''}{variation.toFixed(1)}%
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                            <td className="total-cell">{numberFormat(total)} €</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="total-row debit-total">
                        <td><strong>Total Dépenses</strong></td>
                        {tableData.years.map(year => {
                          const yearTotal = tableData.debitRows.reduce((sum, row) => sum + (row[`year_${year}`] || 0), 0);
                          const prevYearTotal = tableData.debitRows.reduce((sum, row) => sum + (row[`year_${year - 1}`] || 0), 0);
                          const totalVariation = prevYearTotal > 0 ? ((yearTotal - prevYearTotal) / prevYearTotal) * 100 : 0;
                          const showVariation = year > Math.min(...tableData.years);

                          return (
                            <td key={year} className="total-amount-cell">
                              <div className="amount"><strong>{numberFormat(yearTotal)} €</strong></div>
                              {showVariation && (
                                <div className={`variation ${totalVariation > 0 ? 'positive' : totalVariation < 0 ? 'negative' : 'neutral'}`}>
                                  <strong>{totalVariation > 0 ? '+' : ''}{totalVariation.toFixed(1)}%</strong>
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="grand-total debit-grand-total">
                          <strong>{numberFormat(tableData.debitRows.reduce((sum, row) =>
                            sum + tableData.years.reduce((yearSum, year) => yearSum + (row[`year_${year}`] || 0), 0), 0
                          ))} €</strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Section Revenus */}
              {tableData.creditRows.length > 0 && (
                <div className="table-section">
                  <h4 className="section-title revenues">📈 Revenus par catégorie</h4>
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Catégorie</th>
                        {tableData.years.map(year => (
                          <th key={year} className="year-column">
                            <div>{year}</div>
                            <div className="variation-header">Variation %</div>
                          </th>
                        ))}
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.creditRows.map((row, idx) => {
                        const total = tableData.years.reduce((sum, year) => sum + (row[`year_${year}`] || 0), 0);

                        return (
                          <tr key={idx} className="credit-row">
                            <td className="category-cell">{row.category}</td>
                            {tableData.years.map(year => {
                              const amount = row[`year_${year}`] || 0;
                              const variation = row[`variation_${year}`] || 0;
                              const showVariation = year > Math.min(...tableData.years);

                              return (
                                <td key={year} className="amount-cell">
                                  <div className="amount">{numberFormat(amount)} €</div>
                                  {showVariation && (
                                    <div className={`variation ${variation > 0 ? 'positive' : variation < 0 ? 'negative' : 'neutral'}`}>
                                      {variation > 0 ? '+' : ''}{variation.toFixed(1)}%
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                            <td className="total-cell">{numberFormat(total)} €</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="total-row credit-total">
                        <td><strong>Total Revenus</strong></td>
                        {tableData.years.map(year => {
                          const yearTotal = tableData.creditRows.reduce((sum, row) => sum + (row[`year_${year}`] || 0), 0);
                          const prevYearTotal = tableData.creditRows.reduce((sum, row) => sum + (row[`year_${year - 1}`] || 0), 0);
                          const totalVariation = prevYearTotal > 0 ? ((yearTotal - prevYearTotal) / prevYearTotal) * 100 : 0;
                          const showVariation = year > Math.min(...tableData.years);

                          return (
                            <td key={year} className="total-amount-cell">
                              <div className="amount"><strong>{numberFormat(yearTotal)} €</strong></div>
                              {showVariation && (
                                <div className={`variation ${totalVariation > 0 ? 'positive' : totalVariation < 0 ? 'negative' : 'neutral'}`}>
                                  <strong>{totalVariation > 0 ? '+' : ''}{totalVariation.toFixed(1)}%</strong>
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="grand-total credit-grand-total">
                          <strong>{numberFormat(tableData.creditRows.reduce((sum, row) =>
                            sum + tableData.years.reduce((yearSum, year) => yearSum + (row[`year_${year}`] || 0), 0), 0
                          ))} €</strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Section Solde Global */}
              {(tableData.debitRows.length > 0 || tableData.creditRows.length > 0) && (
                <div className="table-section">
                  <h4 className="section-title balance">⚖️ Solde global par année</h4>
                  <table className="analytics-table balance-table">
                    <thead>
                      <tr>
                        <th>Catégorie</th>
                        {tableData.years.map(year => (
                          <th key={year} className="year-column">
                            <div>{year}</div>
                            <div className="variation-header">Variation %</div>
                          </th>
                        ))}
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="balance-row">
                        <td className="category-cell"><strong>Solde Global</strong></td>
                        {tableData.years.map(year => {
                          const yearTotalCredits = tableData.creditRows.reduce((sum, row) => sum + (row[`year_${year}`] || 0), 0);
                          const yearTotalDebits = tableData.debitRows.reduce((sum, row) => sum + (row[`year_${year}`] || 0), 0);
                          const yearBalance = yearTotalCredits - yearTotalDebits;

                          const prevYearTotalCredits = tableData.creditRows.reduce((sum, row) => sum + (row[`year_${year - 1}`] || 0), 0);
                          const prevYearTotalDebits = tableData.debitRows.reduce((sum, row) => sum + (row[`year_${year - 1}`] || 0), 0);
                          const prevYearBalance = prevYearTotalCredits - prevYearTotalDebits;

                          const balanceVariation = prevYearBalance !== 0 ? ((yearBalance - prevYearBalance) / Math.abs(prevYearBalance)) * 100 : 0;
                          const showVariation = year > Math.min(...tableData.years);

                          return (
                            <td key={year} className="amount-cell">
                              <div className={`amount ${yearBalance >= 0 ? 'positive-balance' : 'negative-balance'}`}>
                                <strong>{yearBalance >= 0 ? '+' : ''}{numberFormat(yearBalance)} €</strong>
                              </div>
                              {showVariation && (
                                <div className={`variation ${balanceVariation > 0 ? 'positive' : balanceVariation < 0 ? 'negative' : 'neutral'}`}>
                                  <strong>{balanceVariation > 0 ? '+' : ''}{balanceVariation.toFixed(1)}%</strong>
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="total-cell">
                          {(() => {
                            const totalCredits = tableData.creditRows.reduce((sum, row) =>
                              sum + tableData.years.reduce((yearSum, year) => yearSum + (row[`year_${year}`] || 0), 0), 0
                            );
                            const totalDebits = tableData.debitRows.reduce((sum, row) =>
                              sum + tableData.years.reduce((yearSum, year) => yearSum + (row[`year_${year}`] || 0), 0), 0
                            );
                            const totalBalance = totalCredits - totalDebits;
                            return (
                              <strong className={totalBalance >= 0 ? 'positive-balance' : 'negative-balance'}>
                                {totalBalance >= 0 ? '+' : ''}{numberFormat(totalBalance)} €
                              </strong>
                            );
                          })()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="table-container">
          {loading ? (
            <div className="loading">Chargement des données…</div>
          ) : monthlyTableData.debitRows.length === 0 && monthlyTableData.creditRows.length === 0 ? (
            <div className="no-data">Aucune donnée à afficher</div>
          ) : (
            <div className="analytics-table-wrapper">
              <h3>Analyse par catégorie et mois sur l'année {monthlyTableData.selectedYear}
                {monthlyTableData.futureMonths.length > 0 && (
                  <span className="prediction-indicator"> (avec prédictions)</span>
                )}
              </h3>

              {/* Section Dépenses */}
              {monthlyTableData.debitRows.length > 0 && (
                <div className="table-section">
                  <h4 className="section-title expenses">📉 Dépenses par catégorie</h4>
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Catégorie</th>
                        {monthlyTableData.allMonthsWithPrediction.map(month => {
                          const isPrediction = monthlyTableData.futureMonths.includes(month);
                          return (
                            <th key={month} className={`month-column ${isPrediction ? 'prediction-column' : ''}`}>
                              <div>{new Date(`${month}-01`).toLocaleDateString('fr-FR', { month: 'short' })}</div>
                              <div className="variation-header">
                                {isPrediction ? 'Prédiction' : 'Variation %'}
                              </div>
                            </th>
                          );
                        })}
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyTableData.debitRows.map((row, idx) => {
                        const total = monthlyTableData.months.reduce((sum, month) => sum + (row[`month_${month}`] || 0), 0);

                        return (
                          <tr key={idx} className="debit-row">
                            <td className="category-cell">{row.category}</td>
                            {monthlyTableData.allMonthsWithPrediction.map(month => {
                              const amount = row[`month_${month}`] || 0;
                              const variation = row[`variation_${month}`] || 0;
                              const isPrediction = row[`isPrediction_${month}`];
                              const showVariation = month > monthlyTableData.allMonthsWithPrediction[0];

                              return (
                                <td key={month} className={`amount-cell ${isPrediction ? 'prediction-cell' : ''}`}>
                                  <div className={`amount ${isPrediction ? 'prediction-amount' : ''}`}>
                                    {numberFormat(amount)} €
                                    {isPrediction && <span className="prediction-badge">📊</span>}
                                  </div>
                                  {showVariation && !isPrediction && (
                                    <div className={`variation ${variation > 0 ? 'positive' : variation < 0 ? 'negative' : 'neutral'}`}>
                                      {variation > 0 ? '+' : ''}{variation.toFixed(1)}%
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                            <td className="total-cell">{numberFormat(total)} €</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="total-row debit-total">
                        <td><strong>Total Dépenses</strong></td>
                        {monthlyTableData.allMonthsWithPrediction.map(month => {
                          const monthTotal = monthlyTableData.debitRows.reduce((sum, row) => sum + (row[`month_${month}`] || 0), 0);
                          const isPrediction = monthlyTableData.futureMonths.includes(month);

                          if (!isPrediction) {
                            const prevMonth = month.split('-')[1] === '01' ?
                              `${parseInt(month.split('-')[0]) - 1}-12` :
                              `${month.split('-')[0]}-${String(parseInt(month.split('-')[1]) - 1).padStart(2, '0')}`;
                            const prevMonthTotal = monthlyTableData.debitRows.reduce((sum, row) => sum + (row[`month_${prevMonth}`] || 0), 0);
                            const totalVariation = prevMonthTotal > 0 ? ((monthTotal - prevMonthTotal) / prevMonthTotal) * 100 : 0;
                            const showVariation = month > monthlyTableData.allMonthsWithPrediction[0];

                            return (
                              <td key={month} className="total-amount-cell">
                                <div className="amount"><strong>{numberFormat(monthTotal)} €</strong></div>
                                {showVariation && (
                                  <div className={`variation ${totalVariation > 0 ? 'positive' : totalVariation < 0 ? 'negative' : 'neutral'}`}>
                                    <strong>{totalVariation > 0 ? '+' : ''}{totalVariation.toFixed(1)}%</strong>
                                  </div>
                                )}
                              </td>
                            );
                          } else {
                            return (
                              <td key={month} className="total-amount-cell prediction-cell">
                                <div className="amount prediction-amount">
                                  <strong>{numberFormat(monthTotal)} €</strong>
                                  <span className="prediction-badge">📊</span>
                                </div>
                              </td>
                            );
                          }
                        })}
                        <td className="grand-total debit-grand-total">
                          <strong>{numberFormat(monthlyTableData.debitRows.reduce((sum, row) =>
                            sum + monthlyTableData.months.reduce((monthSum, month) => monthSum + (row[`month_${month}`] || 0), 0), 0
                          ))} €</strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Section Revenus */}
              {monthlyTableData.creditRows.length > 0 && (
                <div className="table-section">
                  <h4 className="section-title revenues">📈 Revenus par catégorie</h4>
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Catégorie</th>
                        {monthlyTableData.allMonthsWithPrediction.map(month => {
                          const isPrediction = monthlyTableData.futureMonths.includes(month);
                          return (
                            <th key={month} className={`month-column ${isPrediction ? 'prediction-column' : ''}`}>
                              <div>{new Date(`${month}-01`).toLocaleDateString('fr-FR', { month: 'short' })}</div>
                              <div className="variation-header">
                                {isPrediction ? 'Prédiction' : 'Variation %'}
                              </div>
                            </th>
                          );
                        })}
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyTableData.creditRows.map((row, idx) => {
                        const total = monthlyTableData.months.reduce((sum, month) => sum + (row[`month_${month}`] || 0), 0);

                        return (
                          <tr key={idx} className="credit-row">
                            <td className="category-cell">{row.category}</td>
                            {monthlyTableData.allMonthsWithPrediction.map(month => {
                              const amount = row[`month_${month}`] || 0;
                              const variation = row[`variation_${month}`] || 0;
                              const isPrediction = row[`isPrediction_${month}`];
                              const showVariation = month > monthlyTableData.allMonthsWithPrediction[0];

                              return (
                                <td key={month} className={`amount-cell ${isPrediction ? 'prediction-cell' : ''}`}>
                                  <div className={`amount ${isPrediction ? 'prediction-amount' : ''}`}>
                                    {numberFormat(amount)} €
                                    {isPrediction && <span className="prediction-badge">📊</span>}
                                  </div>
                                  {showVariation && !isPrediction && (
                                    <div className={`variation ${variation > 0 ? 'positive' : variation < 0 ? 'negative' : 'neutral'}`}>
                                      {variation > 0 ? '+' : ''}{variation.toFixed(1)}%
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                            <td className="total-cell">{numberFormat(total)} €</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="total-row credit-total">
                        <td><strong>Total Revenus</strong></td>
                        {monthlyTableData.allMonthsWithPrediction.map(month => {
                          const monthTotal = monthlyTableData.creditRows.reduce((sum, row) => sum + (row[`month_${month}`] || 0), 0);
                          const isPrediction = monthlyTableData.futureMonths.includes(month);

                          if (!isPrediction) {
                            const prevMonth = month.split('-')[1] === '01' ?
                              `${parseInt(month.split('-')[0]) - 1}-12` :
                              `${month.split('-')[0]}-${String(parseInt(month.split('-')[1]) - 1).padStart(2, '0')}`;
                            const prevMonthTotal = monthlyTableData.creditRows.reduce((sum, row) => sum + (row[`month_${prevMonth}`] || 0), 0);
                            const totalVariation = prevMonthTotal > 0 ? ((monthTotal - prevMonthTotal) / prevMonthTotal) * 100 : 0;
                            const showVariation = month > monthlyTableData.allMonthsWithPrediction[0];

                            return (
                              <td key={month} className="total-amount-cell">
                                <div className="amount"><strong>{numberFormat(monthTotal)} €</strong></div>
                                {showVariation && (
                                  <div className={`variation ${totalVariation > 0 ? 'positive' : totalVariation < 0 ? 'negative' : 'neutral'}`}>
                                    <strong>{totalVariation > 0 ? '+' : ''}{totalVariation.toFixed(1)}%</strong>
                                  </div>
                                )}
                              </td>
                            );
                          } else {
                            return (
                              <td key={month} className="total-amount-cell prediction-cell">
                                <div className="amount prediction-amount">
                                  <strong>{numberFormat(monthTotal)} €</strong>
                                  <span className="prediction-badge">📊</span>
                                </div>
                              </td>
                            );
                          }
                        })}
                        <td className="grand-total credit-grand-total">
                          <strong>{numberFormat(monthlyTableData.creditRows.reduce((sum, row) =>
                            sum + monthlyTableData.months.reduce((monthSum, month) => monthSum + (row[`month_${month}`] || 0), 0), 0
                          ))} €</strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Section Solde Global Mensuel */}
              {(monthlyTableData.debitRows.length > 0 || monthlyTableData.creditRows.length > 0) && (
                <div className="table-section">
                  <h4 className="section-title balance">⚖️ Solde global par mois</h4>
                  <table className="analytics-table balance-table">
                    <thead>
                      <tr>
                        <th>Catégorie</th>
                        {monthlyTableData.allMonthsWithPrediction.map(month => {
                          const isPrediction = monthlyTableData.futureMonths.includes(month);
                          return (
                            <th key={month} className={`month-column ${isPrediction ? 'prediction-column' : ''}`}>
                              <div>{new Date(`${month}-01`).toLocaleDateString('fr-FR', { month: 'short' })}</div>
                              <div className="variation-header">
                                {isPrediction ? 'Prédiction' : 'Variation %'}
                              </div>
                            </th>
                          );
                        })}
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="balance-row">
                        <td className="category-cell"><strong>Solde Global</strong></td>
                        {monthlyTableData.allMonthsWithPrediction.map(month => {
                          const monthTotalCredits = monthlyTableData.creditRows.reduce((sum, row) => sum + (row[`month_${month}`] || 0), 0);
                          const monthTotalDebits = monthlyTableData.debitRows.reduce((sum, row) => sum + (row[`month_${month}`] || 0), 0);
                          const monthBalance = monthTotalCredits - monthTotalDebits;
                          const isPrediction = monthlyTableData.futureMonths.includes(month);

                          if (!isPrediction) {
                            const prevMonth = month.split('-')[1] === '01' ?
                              `${parseInt(month.split('-')[0]) - 1}-12` :
                              `${month.split('-')[0]}-${String(parseInt(month.split('-')[1]) - 1).padStart(2, '0')}`;
                            const prevMonthTotalCredits = monthlyTableData.creditRows.reduce((sum, row) => sum + (row[`month_${prevMonth}`] || 0), 0);
                            const prevMonthTotalDebits = monthlyTableData.debitRows.reduce((sum, row) => sum + (row[`month_${prevMonth}`] || 0), 0);
                            const prevMonthBalance = prevMonthTotalCredits - prevMonthTotalDebits;

                            const balanceVariation = prevMonthBalance !== 0 ? ((monthBalance - prevMonthBalance) / Math.abs(prevMonthBalance)) * 100 : 0;
                            const showVariation = month > monthlyTableData.allMonthsWithPrediction[0];

                            return (
                              <td key={month} className="amount-cell">
                                <div className={`amount ${monthBalance >= 0 ? 'positive-balance' : 'negative-balance'}`}>
                                  <strong>{monthBalance >= 0 ? '+' : ''}{numberFormat(monthBalance)} €</strong>
                                </div>
                                {showVariation && (
                                  <div className={`variation ${balanceVariation > 0 ? 'positive' : balanceVariation < 0 ? 'negative' : 'neutral'}`}>
                                    <strong>{balanceVariation > 0 ? '+' : ''}{balanceVariation.toFixed(1)}%</strong>
                                  </div>
                                )}
                              </td>
                            );
                          } else {
                            return (
                              <td key={month} className="amount-cell prediction-cell">
                                <div className={`amount prediction-amount ${monthBalance >= 0 ? 'positive-balance' : 'negative-balance'}`}>
                                  <strong>{monthBalance >= 0 ? '+' : ''}{numberFormat(monthBalance)} €</strong>
                                  <span className="prediction-badge">📊</span>
                                </div>
                              </td>
                            );
                          }
                        })}
                        <td className="total-cell">
                          {(() => {
                            const totalCredits = monthlyTableData.creditRows.reduce((sum, row) =>
                              sum + monthlyTableData.months.reduce((monthSum, month) => monthSum + (row[`month_${month}`] || 0), 0), 0
                            );
                            const totalDebits = monthlyTableData.debitRows.reduce((sum, row) =>
                              sum + monthlyTableData.months.reduce((monthSum, month) => monthSum + (row[`month_${month}`] || 0), 0), 0
                            );
                            const totalBalance = totalCredits - totalDebits;
                            return (
                              <strong className={totalBalance >= 0 ? 'positive-balance' : 'negative-balance'}>
                                {totalBalance >= 0 ? '+' : ''}{numberFormat(totalBalance)} €
                              </strong>
                            );
                          })()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Analytics;

