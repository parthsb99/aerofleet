const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  serviceType: { type: String, required: true },
  packageName: { type: String, default: 'Custom' },
  packagePrice: { type: Number, default: 0 },
  serviceQuantity: { type: Number, default: 1 },
  packageSubtotal: { type: Number, default: 0 },
  extraServices: [
    {
      id: String,
      label: String,
      price: Number,
    }
  ],
  extraServicesSubtotal: { type: Number, default: 0 },
  garage: {
    id: String,
    name: String,
    city: String,
    address: String,
  },
  cost: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  status: {
    type: String,
    enum: ['Pending Confirmation', 'Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Pending'],
    default: 'Pending Confirmation'
  },
  completedAt: { type: Date, default: null },
  finalPricing: {
    packageCost: { type: Number, default: 0 },
    extraServicesCost: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    finalCost: { type: Number, default: 0 },
    completedAt: { type: Date, default: null },
    finalized: { type: Boolean, default: false },
  },
  rescheduledAt: { type: Date, default: null },
  rescheduleHistory: [
    {
      previousDate: Date,
      previousTime: String,
      rescheduledAt: { type: Date, default: Date.now },
    }
  ],
  notes: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);

