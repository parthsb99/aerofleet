const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const { protect } = require('../middleware/authMiddleware');

// GET all vehicles for logged-in user
router.get('/', protect, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST add a new vehicle
router.post('/', protect, async (req, res) => {
  try {
    const { make, model, variant, year, licensePlate } = req.body;
    if (!make || !model || !year || !licensePlate) {
      return res.status(400).json({ message: 'Make, model, year, and license plate are required' });
    }
    const vehicle = await Vehicle.create({
      userId: req.user.id,
      make,
      model,
      variant: variant || '',
      year: Number(year),
      licensePlate,
    });
    res.status(201).json(vehicle);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT update a vehicle
router.put('/:id', protect, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    if (vehicle.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const { make, model, variant, year, licensePlate } = req.body;
    if (!make || !model || !year || !licensePlate) {
      return res.status(400).json({ message: 'Make, model, year, and license plate are required' });
    }
    vehicle.make         = make;
    vehicle.model        = model;
    vehicle.variant      = variant || '';
    vehicle.year         = Number(year);
    vehicle.licensePlate = licensePlate;
    await vehicle.save();
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE a vehicle
router.delete('/:id', protect, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    if (vehicle.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await vehicle.deleteOne();
    res.json({ message: 'Vehicle removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH update vehicle location
router.patch('/:id/location', protect, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    if (vehicle.userId.toString() !== req.user.id)
      return res.status(403).json({ message: 'Not authorized' });

    const { lat, lng, address, mapStatus } = req.body;
    vehicle.location = {
      lat:       lat   ?? vehicle.location?.lat,
      lng:       lng   ?? vehicle.location?.lng,
      address:   address ?? vehicle.location?.address ?? '',
      updatedAt: new Date(),
    };
    if (mapStatus) vehicle.mapStatus = mapStatus;
    vehicle.liveTracking = true;
    await vehicle.save();
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
