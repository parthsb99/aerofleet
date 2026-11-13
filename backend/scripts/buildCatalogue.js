/**
 * buildCatalogue.js
 * Parses Vehicle_Models_India_15k.csv and produces backend/data/catalogue.json
 * Run: node backend/scripts/buildCatalogue.js
 */

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '../../Vehicle_Models_India_15k.csv');
const OUT_PATH = path.join(__dirname, '../data/catalogue.json');

const raw = fs.readFileSync(CSV_PATH, 'utf8');

// Proper CSV parser that handles quoted fields with embedded commas/newlines
function parseCSV(text) {
  const rows = [];
  let cur = '', inQ = false, row = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      row.push(cur.trim()); cur = '';
    } else if ((ch === '\n' || ch === '\r') && !inQ) {
      if (cur.trim() || row.length) { row.push(cur.trim()); rows.push(row); row = []; cur = ''; }
    } else {
      cur += ch;
    }
  }
  if (cur.trim() || row.length) { row.push(cur.trim()); rows.push(row); }
  return rows;
}

const rows = parseCSV(raw);
const [header, ...data] = rows;
console.log('Header:', header);
console.log('Data rows:', data.length);

// Map: brand -> model -> { segment, fuelTypes: Set, year }
const catalogue = {}; // { brand: { model: { segment, fuelTypes, year } } }

for (const row of data) {
  if (row.length < 6) continue;
  const brand = (row[0] || '').trim();
  const model = (row[1] || '').trim();
  const year  = (row[2] || '').trim();
  const segment = (row[3] || '').trim();
  const fuel  = (row[4] || '').trim();
  if (!brand || !model || brand === 'Brand') continue;

  if (!catalogue[brand]) catalogue[brand] = {};
  if (!catalogue[brand][model]) {
    catalogue[brand][model] = { segment, year: year ? parseInt(year) || null : null, fuelTypes: new Set() };
  }
  if (fuel) catalogue[brand][model].fuelTypes.add(fuel);
}

// Generate variant names from fuel types (e.g. "Petrol MT", "Diesel AT", "Electric")
function generateVariants(fuelTypes) {
  const variants = [];
  for (const fuel of fuelTypes) {
    // For each fuel, produce MT and AT variants (except pure Electric)
    const f = fuel.toUpperCase();
    if (f.includes('ELECTRIC') || f === 'EV') {
      variants.push(`${fuel} Standard Range`);
      variants.push(`${fuel} Long Range`);
    } else if (f.includes('/')) {
      // Dual fuel like Petrol/CNG
      variants.push(`${fuel} MT`);
      variants.push(`${fuel} AT`);
    } else {
      variants.push(`${fuel} MT`);
      variants.push(`${fuel} AT`);
    }
  }
  return [...new Set(variants)].sort();
}

// Serialize
const output = {};
const sortedBrands = Object.keys(catalogue).sort();

for (const brand of sortedBrands) {
  output[brand] = [];
  const sortedModels = Object.keys(catalogue[brand]).sort();
  for (const model of sortedModels) {
    const info = catalogue[brand][model];
    output[brand].push({
      model,
      segment: info.segment,
      year: info.year,
      fuelTypes: [...info.fuelTypes].sort(),
      variants: generateVariants(info.fuelTypes),
    });
  }
}

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));

const totalBrands = Object.keys(output).length;
const totalModels = Object.values(output).reduce((a, b) => a + b.length, 0);
console.log(`✅ catalogue.json written: ${totalBrands} brands, ${totalModels} models`);
console.log('Sample:', JSON.stringify(output['Tata']?.slice(0, 2), null, 2));
