const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  adminName: { type: String, default: 'System Admin' },
  adminEmail: { type: String, default: 'admin@aerofleet.com' },
  targetType: { type: String, required: true },
  targetId: { type: String, default: '' },
  details: { type: String, default: '' },
  result: { type: String, default: 'Success' },
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
