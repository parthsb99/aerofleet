const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  date: { type: Date, required: true },
  category: {
    type: String,
    enum: ['Service Package', 'Extra Services', 'Fuel', 'Repairs', 'Maintenance', 'Insurance', 'Tyres', 'Other'],
    required: true,
    default: 'Maintenance'
  },
  description: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: [0.01, 'Amount must be greater than zero'] },
  notes: { type: String, default: '' },
  source: {
    type: String,
    enum: ['service_booking', 'manual'],
    default: 'manual'
  },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
