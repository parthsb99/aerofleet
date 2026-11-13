const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  make:         { type: String, required: true },
  model:        { type: String, required: true },
  variant:      { type: String, default: '' },
  year:         { type: Number, required: true },
  licensePlate: { type: String, required: true },

  /* ── Location tracking (optional) ── */
  location: {
    lat:     { type: Number, default: null },
    lng:     { type: Number, default: null },
    address: { type: String, default: '' },
    updatedAt: { type: Date, default: null },
  },
  mapStatus:    { type: String, enum: ['active', 'idle', 'maintenance', 'alert'], default: 'idle' },
  liveTracking: { type: Boolean, default: false },

}, { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
