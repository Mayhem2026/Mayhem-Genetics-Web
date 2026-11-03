(function (root) {
  'use strict';
  const finite = (n, min = 0) => typeof n === 'number' && Number.isFinite(n) && n >= min;
  function requireValue(ok, message) { if (!ok) throw Error(message); }
  function nutrition(value) {
    requireValue(value && typeof value.name === 'string' && value.name.trim().length > 0 && value.name.length <= 200, 'Missing food name');
    for (const k of ['calories', 'protein', 'carbs', 'fat']) requireValue(finite(value[k]), 'Missing or invalid ' + k);
    return {name: value.name.trim(), calories: value.calories, protein: value.protein, carbs: value.carbs, fat: value.fat};
  }
  function backup(value) {
    requireValue(value && typeof value === 'object' && !Array.isArray(value), 'Invalid backup');
    requireValue(finite(value.goal, 1), 'Invalid calorie goal');
    const result = {goal: value.goal, stepGoal: value.stepGoal ?? 8000};
    requireValue(Number.isSafeInteger(result.stepGoal) && result.stepGoal > 0, 'Invalid step goal');
    for (const type of ['foods', 'weights', 'steps', 'calculations']) {
      const list = value[type] ?? (type === 'steps' ? [] : null);
      requireValue(Array.isArray(list) && list.length <= 50000, 'Invalid ' + type);
      const ids = new Set();
      result[type] = list.map(row => {
        requireValue(row && finite(row.id) && !ids.has(row.id), 'Invalid or duplicate record ID'); ids.add(row.id);
        requireValue(typeof row.date === 'string' && row.date.length <= 100, 'Invalid record date');
        const base = {id: row.id, date: row.date};
        if (type !== 'calculations') requireValue(/^\d{4}-\d{2}-\d{2}$/.test(row.date) && !Number.isNaN(Date.parse(row.date)), 'Invalid date');
        if (type === 'foods') { const n = nutrition({...row, calories: row.cal}); return {...base, name:n.name, cal:n.calories, protein:n.protein, carbs:n.carbs, fat:n.fat}; }
        if (type === 'weights' || type === 'steps') {
          requireValue(finite(row.value, type === 'weights' ? Number.MIN_VALUE : 0) && (type !== 'steps' || Number.isSafeInteger(row.value)), 'Invalid ' + type + ' value');
          return {...base, value:row.value};
        }
        for (const k of ['mass', 'solvent', 'concentration']) requireValue(finite(row[k], Number.MIN_VALUE), 'Invalid saved calculation');
        const calc = {...base, mass:row.mass, solvent:row.solvent, concentration:row.concentration};
        if (row.peptides !== undefined) {
          requireValue(Array.isArray(row.peptides) && row.peptides.length > 0 && row.peptides.length <= 5, 'Invalid blend');
          calc.peptides = row.peptides.map(p => {
            requireValue(p && typeof p.name === 'string' && p.name.length <= 200 && finite(Number(p.mass), Number.MIN_VALUE) && ['mcg','mg','g'].includes(p.unit), 'Invalid peptide');
            return {name:p.name, mass:String(p.mass), target:String(p.target ?? ''), unit:p.unit};
          });
          requireValue(typeof row.preset === 'string' && /^(100,1|50,\.5|30,\.3|80,2|40,1|20,\.5)$/.test(row.preset) && finite(row.drawMl, Number.MIN_VALUE), 'Invalid calculation scale');
          calc.preset = row.preset; calc.drawMl = row.drawMl;
        }
        return calc;
      });
    }
    return result;
  }
  function endpoint(value) {
    if (!value) return '';
    const url = new URL(value);
    requireValue(url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash, 'Use an HTTPS endpoint without credentials, query strings, or fragments');
    return url.href;
  }
  const api = Object.freeze({nutrition, backup, endpoint});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MayhemBeta = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
