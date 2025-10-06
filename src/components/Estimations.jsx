import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiService } from '../services/api';
import './Estimations.css';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const nf = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function parseNumber(val) {
  if (val === '' || val == null) return 0;
  if (typeof val === 'number') return isFinite(val) ? val : 0;
  const s = String(val).replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

const COLORS = [
  '#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f', '#edc948',
  '#b07aa1', '#ff9da7', '#9c755f', '#bab0ab', '#6b5b95', '#88b04b',
  '#f7cac9', '#92a8d1', '#955251', '#b565a7', '#009b77', '#dd4124'
];

export default function Estimations() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Removed global success banner per user request
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState({});
  const saveTimersRef = useRef({});
  // Track last saved values per category to prevent redundant PUTs
  const lastSavedRef = useRef({});

  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('token');
        const [cats, txs] = await Promise.all([
          apiService.getCategoriesEstimations(token).catch(async () => {
            const basic = await apiService.getCategories(token);
            return basic?.map((c) => ({ ...c, estimationDepenses: 0, estimationRevenus: 0 })) || [];
          }),
          apiService.getTransactions(token),
        ]);
        if (!mounted) return;
        const catsArr = Array.isArray(cats) ? cats : [];
        setCategories(catsArr);
        const txArr = Array.isArray(txs) ? txs : [];
        setTransactions(txArr);

        // compute N-1 sums by type
        const lastDebit = {};
        const lastCredit = {};
        for (const t of txArr) {
          if (!t?.date || !t?.categorie?.id || !t?.type) continue;
          const y = new Date(t.date).getFullYear();
          if (y !== previousYear) continue;
          const id = String(t.categorie.id);
          const amt = Number(t.valeur) || 0;
          if (t.type === 'DEBIT') lastDebit[id] = (lastDebit[id] || 0) + amt;
          else if (t.type === 'CREDIT') lastCredit[id] = (lastCredit[id] || 0) + amt;
        }

        // initialize values from API or N-1
        const initial = {};
        for (const c of catsArr) {
          const id = String(c.id);
          const apiDep = Number(c.estimationDepenses) || 0;
          const apiRev = Number(c.estimationRevenus) || 0;
          initial[id] = {
            dep: apiDep > 0 ? apiDep : (lastDebit[id] || 0),
            rev: apiRev > 0 ? apiRev : (lastCredit[id] || 0),
          };
        }
        setValues(initial);
      } catch (e) {
        console.error(e);
        setError(e?.message || 'Erreur de chargement');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [previousYear]);

  // Build N-1 maps for display
  const lastYearDebit = useMemo(() => {
    const map = {};
    for (const t of transactions) {
      if (!t?.date || !t?.categorie?.id || t.type !== 'DEBIT') continue;
      const y = new Date(t.date).getFullYear();
      if (y !== previousYear) continue;
      const id = String(t.categorie.id);
      map[id] = (map[id] || 0) + (Number(t.valeur) || 0);
    }
    return map;
  }, [transactions, previousYear]);

  const lastYearCredit = useMemo(() => {
    const map = {};
    for (const t of transactions) {
      if (!t?.date || !t?.categorie?.id || t.type !== 'CREDIT') continue;
      const y = new Date(t.date).getFullYear();
      if (y !== previousYear) continue;
      const id = String(t.categorie.id);
      map[id] = (map[id] || 0) + (Number(t.valeur) || 0);
    }
    return map;
  }, [transactions, previousYear]);

  // Rows for tables
  const creditRows = useMemo(() => {
    return categories
      .map((c) => {
        const id = String(c.id);
        return { id, name: c.name, last: lastYearCredit[id] || 0, value: values[id]?.rev ?? 0 };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [categories, lastYearCredit, values]);

  const debitRows = useMemo(() => {
    return categories
      .map((c) => {
        const id = String(c.id);
        return { id, name: c.name, last: lastYearDebit[id] || 0, value: values[id]?.dep ?? 0 };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [categories, lastYearDebit, values]);

  const totals = useMemo(() => {
    const totalCredit = creditRows.reduce((s, r) => s + (Number(r.value) || 0), 0);
    const totalDebit = debitRows.reduce((s, r) => s + (Number(r.value) || 0), 0);
    return { totalCredit, totalDebit, balance: totalCredit - totalDebit };
  }, [creditRows, debitRows]);

  // Charts
  const creditChartData = useMemo(() => creditRows.filter(r => (Number(r.value) || 0) > 0).map(r => ({ name: r.name, value: Number(r.value) || 0 })), [creditRows]);
  const debitChartData = useMemo(() => debitRows.filter(r => (Number(r.value) || 0) > 0).map(r => ({ name: r.name, value: Number(r.value) || 0 })), [debitRows]);
  const creditTotal = useMemo(() => creditChartData.reduce((s, d) => s + d.value, 0), [creditChartData]);
  const debitTotal = useMemo(() => debitChartData.reduce((s, d) => s + d.value, 0), [debitChartData]);
  const creditTooltipFormatter = useMemo(() => (value, name) => {
    const v = Number(value) || 0; const p = creditTotal > 0 ? (v / creditTotal) * 100 : 0; return [`${nf.format(v)} € (${p.toFixed(0)}%)`, name];
  }, [creditTotal]);
  const debitTooltipFormatter = useMemo(() => (value, name) => {
    const v = Number(value) || 0; const p = debitTotal > 0 ? (v / debitTotal) * 100 : 0; return [`${nf.format(v)} € (${p.toFixed(0)}%)`, name];
  }, [debitTotal]);

  const saveOne = async (id) => {
    try {
      const dep = Math.max(0, parseNumber(values[id]?.dep));
      const rev = Math.max(0, parseNumber(values[id]?.rev));
      const last = lastSavedRef.current[id] || { dep: undefined, rev: undefined };
      // Skip if nothing changed since last save
      if (last.dep === dep && last.rev === rev) return;

      setSaving((prev) => ({ ...prev, [id]: true }));
      setError('');
      const token = localStorage.getItem('token');
      await apiService.updateCategorieEstimations(id, { estimationDepenses: dep, estimationRevenus: rev }, token);
      lastSavedRef.current[id] = { dep, rev };
    } catch (e) {
      console.error(e);
      setError(e?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving((prev) => ({ ...prev, [id]: false }));
    }
  };

  const scheduleSave = (id) => {
    if (saveTimersRef.current[id]) {
      clearTimeout(saveTimersRef.current[id]);
    }
    saveTimersRef.current[id] = setTimeout(() => {
      saveOne(id);
    }, 250);
  };

  const handleChange = (type, id, value) => {
    setValues((prev) => ({
      ...prev,
      [id]: { dep: type === 'DEBIT' ? value : (prev[id]?.dep ?? 0), rev: type === 'CREDIT' ? value : (prev[id]?.rev ?? 0) }
    }));
    scheduleSave(id);
  };

  const handleBlur = (id) => {
    if (saveTimersRef.current[id]) {
      clearTimeout(saveTimersRef.current[id]);
      saveTimersRef.current[id] = null;
    }
    saveOne(id);
  };

  const handleKeyDown = (e, id) => {
    if (e.key === 'Enter') {
      if (saveTimersRef.current[id]) {
        clearTimeout(saveTimersRef.current[id]);
        saveTimersRef.current[id] = null;
      }
      saveOne(id);
    }
  };

  // Seed lastSavedRef after initial load so first change compares correctly
  useEffect(() => {
    const snapshot = {};
    for (const [id, v] of Object.entries(values || {})) {
      snapshot[id] = { dep: Math.max(0, parseNumber(v?.dep)), rev: Math.max(0, parseNumber(v?.rev)) };
    }
    lastSavedRef.current = snapshot;
  }, [loading]);

  // Cleanup timers on unmount
  useEffect(() => () => {
    Object.values(saveTimersRef.current || {}).forEach((t) => clearTimeout(t));
  }, []);

  return (
    <div className="estimations-container">
      <div className="estimations-header">
        <h1>Estimations par catégorie</h1>
        <div className="header-controls">

        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Chargement...</div>
      ) : (
        <>
          <div className="summary-cards">
            <div className="card credit">
              <h3>Revenus prévus</h3>
              <div className="amount">+{nf.format(totals.totalCredit)} €</div>
            </div>
            <div className="card debit">
              <h3>Dépenses prévues</h3>
              <div className="amount">-{nf.format(totals.totalDebit)} €</div>
            </div>
            <div className={`card balance ${totals.balance >= 0 ? 'positive' : 'negative'}`}>
              <h3>Solde estimé</h3>
              <div className="amount">{totals.balance >= 0 ? '+' : ''}{nf.format(totals.balance)} €</div>
            </div>
          </div>

          <div className="estimations-main">
            <div className="tables">
              <div className="table-section">
                <h2>Revenus (CREDIT)</h2>
                <div className="table-wrapper">
                  <table className="estimations-table">
                    <thead>
                      <tr>
                        <th>Catégorie</th>
                        <th className="right">N-1</th>
                        <th className="right">Estimation</th>
                        <th className="right">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creditRows.map((row) => (
                        <tr key={`credit-${row.id}`}>
                          <td>{row.name}</td>
                          <td className="right">{nf.format(row.last)} €</td>
                          <td className="right">
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              min="0"
                              value={values[row.id]?.rev ?? 0}
                              onChange={(e) => handleChange('CREDIT', row.id, e.target.value)}
                              onBlur={() => handleBlur(row.id)}
                              onKeyDown={(e) => handleKeyDown(e, row.id)}
                            />
                          </td>
                          <td className="right">{saving[row.id] ? '⏳' : '✓'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th>Total</th>
                        <th className="right">{nf.format(creditRows.reduce((s, r) => s + (r.last || 0), 0))} €</th>
                        <th className="right">{nf.format(totals.totalCredit)} €</th>
                        <th></th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="table-section">
                <h2>Dépenses (DEBIT)</h2>
                <div className="table-wrapper">
                  <table className="estimations-table">
                    <thead>
                      <tr>
                        <th>Catégorie</th>
                        <th className="right">N-1</th>
                        <th className="right">Estimation</th>
                        <th className="right">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {debitRows.map((row) => (
                        <tr key={`debit-${row.id}`}>
                          <td>{row.name}</td>
                          <td className="right">{nf.format(row.last)} €</td>
                          <td className="right">
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              min="0"
                              value={values[row.id]?.dep ?? 0}
                              onChange={(e) => handleChange('DEBIT', row.id, e.target.value)}
                              onBlur={() => handleBlur(row.id)}
                              onKeyDown={(e) => handleKeyDown(e, row.id)}
                            />
                          </td>
                          <td className="right">{saving[row.id] ? '⏳' : '✓'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th>Total</th>
                        <th className="right">{nf.format(debitRows.reduce((s, r) => s + (r.last || 0), 0))} €</th>
                        <th className="right">{nf.format(totals.totalDebit)} €</th>
                        <th></th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            <div className="charts-panel">
              <div className="chart-card">
                <h2>Répartition des revenus</h2>
                <div className="chart-container">
                  {creditChartData.length === 0 ? (
                    <div className="no-chart-data">Aucune donnée</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={creditChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {creditChartData.map((entry, index) => (
                            <Cell key={`credit-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={creditTooltipFormatter} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="chart-card">
                <h2>Répartition des dépenses</h2>
                <div className="chart-container">
                  {debitChartData.length === 0 ? (
                    <div className="no-chart-data">Aucune donnée</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={debitChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {debitChartData.map((entry, index) => (
                            <Cell key={`debit-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={debitTooltipFormatter} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
