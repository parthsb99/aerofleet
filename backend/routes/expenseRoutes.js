const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const Vehicle = require('../models/Vehicle');
const { protect } = require('../middleware/authMiddleware');

// Allowed categories
const ALLOWED_CATEGORIES = [
  'Service Package',
  'Extra Services',
  'Fuel',
  'Repairs',
  'Maintenance',
  'Insurance',
  'Tyres',
  'Other'
];

// GET /api/expenses - fetch user's expenses
router.get('/', protect, async (req, res) => {
  try {
    const query = { userId: req.user.id };

    if (req.query.vehicleId && req.query.vehicleId !== 'all') {
      query.vehicleId = req.query.vehicleId;
    }

    if (req.query.category && req.query.category !== 'all') {
      query.category = req.query.category;
    }

    if (req.query.year) {
      const year = parseInt(req.query.year, 10);
      if (!isNaN(year)) {
        let start, end;
        if (req.query.month && req.query.month !== 'all') {
          const month = parseInt(req.query.month, 10); // 1-12
          start = new Date(Date.UTC(year, month - 1, 1));
          end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
        } else {
          start = new Date(Date.UTC(year, 0, 1));
          end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
        }
        query.date = { $gte: start, $lte: end };
      }
    }

    const expenses = await Expense.find(query)
      .populate('vehicleId', 'make model variant year licensePlate')
      .populate('bookingId', 'serviceType packageName status cost date completedAt')
      .sort({ date: -1, createdAt: -1 });

    res.json(expenses);
  } catch (err) {
    console.error('Fetch expenses error:', err);
    res.status(500).json({ message: 'Server error fetching expenses' });
  }
});

// POST /api/expenses - create manual expense
router.post('/', protect, async (req, res) => {
  try {
    const { vehicleId, date, category, description, amount, notes } = req.body;

    if (!vehicleId) {
      return res.status(400).json({ message: 'Please select a vehicle' });
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle || vehicle.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Vehicle not found or unauthorized' });
    }

    if (!date) {
      return res.status(400).json({ message: 'Expense date is required' });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Description is required' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be a valid positive number' });
    }

    const cleanCategory = ALLOWED_CATEGORIES.includes(category) ? category : 'Other';

    const expense = await Expense.create({
      userId: req.user.id,
      vehicleId,
      date: new Date(date),
      category: cleanCategory,
      description: description.trim(),
      amount: Math.round(numAmount * 100) / 100,
      notes: notes ? notes.trim() : '',
      source: 'manual',
    });

    const populated = await expense.populate('vehicleId', 'make model variant year licensePlate');
    res.status(201).json(populated);
  } catch (err) {
    console.error('Create expense error:', err);
    res.status(500).json({ message: 'Server error creating expense' });
  }
});

// PUT /api/expenses/:id - update expense
router.put('/:id', protect, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense record not found' });
    }

    if (expense.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { vehicleId, date, category, description, amount, notes } = req.body;

    if (vehicleId) {
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle || vehicle.userId.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Vehicle not found or unauthorized' });
      }
      expense.vehicleId = vehicleId;
    }

    if (date) {
      expense.date = new Date(date);
    }

    if (category && ALLOWED_CATEGORIES.includes(category)) {
      expense.category = category;
    }

    if (description !== undefined) {
      if (!description.trim()) {
        return res.status(400).json({ message: 'Description cannot be empty' });
      }
      expense.description = description.trim();
    }

    if (amount !== undefined) {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ message: 'Amount must be a valid positive number' });
      }
      expense.amount = Math.round(numAmount * 100) / 100;
    }

    if (notes !== undefined) {
      expense.notes = notes.trim();
    }

    await expense.save();
    const populated = await expense.populate('vehicleId', 'make model variant year licensePlate');
    res.json(populated);
  } catch (err) {
    console.error('Update expense error:', err);
    res.status(500).json({ message: 'Server error updating expense' });
  }
});

// DELETE /api/expenses/:id - delete expense
router.delete('/:id', protect, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense record not found' });
    }

    if (expense.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await expense.deleteOne();
    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    console.error('Delete expense error:', err);
    res.status(500).json({ message: 'Server error deleting expense' });
  }
});

module.exports = router;
