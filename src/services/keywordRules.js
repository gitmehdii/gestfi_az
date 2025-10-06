// Simple keyword rules service stored in localStorage
// Rule shape: { id: string, keyword: string, type: 'DEBIT'|'CREDIT', category: string }

const STORAGE_KEY = 'keywordRules';

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch (_) {
    return [];
  }
}

function writeAll(rules) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules || []));
}

export function getRules() {
  return readAll();
}

export function addRule(rule) {
  const rules = readAll();
  const id = rule.id || String(Date.now());
  const newRule = { id, keyword: '', type: 'DEBIT', category: '', ...rule };
  rules.push(newRule);
  writeAll(rules);
  return newRule;
}

export function updateRule(id, partial) {
  const rules = readAll();
  const idx = rules.findIndex((r) => r.id === id);
  if (idx >= 0) {
    rules[idx] = { ...rules[idx], ...partial };
    writeAll(rules);
    return rules[idx];
  }
  return null;
}

export function deleteRule(id) {
  const rules = readAll();
  const next = rules.filter((r) => r.id !== id);
  writeAll(next);
}

export function clearRules() {
  writeAll([]);
}

function matchKeyword(text, keyword) {
  if (!keyword) return false;
  if (!text) return false;
  // Always case insensitive now
  return String(text).toLowerCase().includes(String(keyword).toLowerCase());
}

// Given a single transaction, return a new transaction with type and category overridden if a rule matches.
export function applyRulesToTransaction(tx) {
  const rules = readAll();
  for (const r of rules) {
    if (matchKeyword(tx.operation, r.keyword)) {
      const result = { ...tx, type: r.type };
      if (r.category) {
        result.category = r.category;
      }
      return result;
    }
  }
  return tx;
}

// Convenience: apply to list
export function applyRules(transactions) {
  const rules = readAll();
  if (!Array.isArray(transactions) || rules.length === 0) return transactions || [];
  return transactions.map((t) => {
    for (const r of rules) {
      if (matchKeyword(t.operation, r.keyword)) {
        const result = { ...t, type: r.type };
        if (r.category) {
          // Utiliser categorieId au lieu de category pour les IDs
          result.categorieId = r.category;
        }
        return result;
      }
    }
    return t;
  });
}
