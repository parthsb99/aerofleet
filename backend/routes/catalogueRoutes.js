const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Load pre-built catalogue once at startup
const CATALOGUE_PATH = path.join(__dirname, '../data/catalogue.json');
let catalogue = {};

try {
  catalogue = JSON.parse(fs.readFileSync(CATALOGUE_PATH, 'utf8'));
  console.log('Catalogue loaded:', Object.keys(catalogue).length, 'brands');
} catch (err) {
  console.error('Failed to load catalogue.json:', err.message);
}

// GET /api/catalogue/brands
router.get('/brands', (req, res) => {
  const brands = Object.keys(catalogue).sort();
  res.json(brands);
});

// GET /api/catalogue/models?brand=Tata
router.get('/models', (req, res) => {
  const { brand } = req.query;
  if (!brand || !catalogue[brand]) {
    return res.json([]);
  }
  const models = catalogue[brand].map(m => ({
    model: m.model,
    segment: m.segment,
    year: m.year,
    fuelTypes: m.fuelTypes,
  }));
  res.json(models);
});

// GET /api/catalogue/variants?brand=Tata&model=Nexon
router.get('/variants', (req, res) => {
  const { brand, model } = req.query;
  if (!brand || !model || !catalogue[brand]) {
    return res.json([]);
  }
  const entry = catalogue[brand].find(m => m.model === model);
  if (!entry) return res.json([]);
  res.json(entry.variants || []);
});

// GET /api/catalogue/all — full catalogue for client-side caching
router.get('/all', (req, res) => {
  res.json(catalogue);
});

module.exports = router;
