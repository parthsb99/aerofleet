const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const Expense = require('../models/Expense');
const AuditLog = require('../models/AuditLog');
const SystemConfig = require('../models/SystemConfig');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { emitToUser, emitToAdmins, createNotification } = require('../socket/socketManager');
const bcrypt = require('bcryptjs');

// Apply protection & admin role check to all admin routes
router.use(protect);
router.use(adminOnly);

/* ──────────────────────────────────────────────────────────────────────────
   DEFAULT DATA & HELPERS
   ────────────────────────────────────────────────────────────────────────── */
const DEFAULT_PACKAGES = [
  {
    id: 'Aero',
    name: 'Aero Package',
    badge: 'Basic',
    basePrice: 1499,
    description: 'Essential preventive vehicle maintenance and health inspection.',
    features: [
      'Engine oil inspection',
      'Fluid level checks',
      'Tyre pressure inspection',
      'Battery inspection',
      'Basic vehicle health check',
    ],
    active: true,
  },
  {
    id: 'Pro',
    name: 'Pro Package',
    badge: 'Standard',
    basePrice: 2999,
    description: 'Comprehensive mid-tier service including engine oil & filter replacements.',
    features: [
      'Everything in Aero',
      'Engine oil & oil filter replacement',
      'Brake inspection & cleaning',
      'Air filter inspection',
      'AC inspection',
      'General vehicle diagnostics',
    ],
    active: true,
  },
  {
    id: 'Elite',
    name: 'Elite Package',
    badge: 'Premium',
    basePrice: 4999,
    description: 'Complete high-performance servicing, wheel alignment & full diagnostics.',
    features: [
      'Everything in Pro',
      'Comprehensive vehicle diagnostics',
      'Full brake servicing',
      'AC servicing & cleaning',
      'Wheel alignment & balancing',
      'Complete vehicle health audit',
    ],
    active: true,
  },
];

const DEFAULT_EXTRA_SERVICES = [
  { id: 'car-washing',       label: 'Car Washing',            price: 399,  category: 'Cleaning',    active: true },
  { id: 'interior-cleaning', label: 'Interior Deep Cleaning', price: 799,  category: 'Detailing',   active: true },
  { id: 'ac-gas',            label: 'AC Gas Refill',          price: 1499, category: 'Climate',     active: true },
  { id: 'wheel-alignment',   label: 'Wheel Alignment',        price: 699,  category: 'Tyres',       active: true },
  { id: 'wheel-balancing',   label: 'Wheel Balancing',        price: 499,  category: 'Tyres',       active: true },
  { id: 'battery-test',      label: 'Battery Health Test',    price: 299,  category: 'Electrical',  active: true },
  { id: 'engine-diag',       label: 'Engine Diagnostics',     price: 999,  category: 'Performance', active: true },
  { id: 'brake-pads',        label: 'Brake Pad Replacement',  price: 1999, category: 'Safety',      active: true },
  { id: 'car-sanitization',  label: 'Car Sanitization',       price: 499,  category: 'Health',      active: true },
];

const DEFAULT_GARAGES = [
  {
    id: 'mum-01',
    name: 'AeroFleet Bandra Atelier',
    city: 'Mumbai',
    address: 'Plot 42, Bandra Kurla Complex, Bandra East, Mumbai, Maharashtra 400051',
    phone: '+91 22 4988 1200',
    operatingHours: '08:00 AM – 08:00 PM',
    capacity: 12,
    active: true,
    lat: 19.0657,
    lng: 72.8687,
  },
  {
    id: 'pun-01',
    name: 'AeroFleet Koregaon Hub',
    city: 'Pune',
    address: 'Lane 7, Koregaon Park, Pune, Maharashtra 411001',
    phone: '+91 20 4912 3400',
    operatingHours: '08:30 AM – 07:30 PM',
    capacity: 10,
    active: true,
    lat: 18.5362,
    lng: 73.8940,
  },
  {
    id: 'nas-01',
    name: 'AeroFleet Gangapur Center',
    city: 'Nashik',
    address: 'Gangapur Road, Near Serene Meadows, Nashik, Maharashtra 422013',
    phone: '+91 253 234 5678',
    operatingHours: '09:00 AM – 07:00 PM',
    capacity: 8,
    active: true,
    lat: 19.9975,
    lng: 73.7898,
  },
  {
    id: 'goa-01',
    name: 'AeroFleet Coastal Workshop',
    city: 'Goa',
    address: 'Chogm Road, Porvorim, North Goa, Goa 403521',
    phone: '+91 832 241 8900',
    operatingHours: '09:00 AM – 06:30 PM',
    capacity: 6,
    active: true,
    lat: 15.5284,
    lng: 73.8276,
  },
  {
    id: 'vad-01',
    name: 'AeroFleet Alkapuri Depot',
    city: 'Vadodara',
    address: 'RC Dutt Road, Alkapuri, Vadodara, Gujarat 390007',
    phone: '+91 265 233 4455',
    operatingHours: '08:30 AM – 07:30 PM',
    capacity: 8,
    active: true,
    lat: 22.3107,
    lng: 73.1812,
  },
];

// Helper to get or init system config
async function getConfig(key, defaultValue) {
  try {
    let conf = await SystemConfig.findOne({ key });
    if (!conf) {
      conf = await SystemConfig.create({ key, value: defaultValue });
    }
    return conf.value;
  } catch (err) {
    return defaultValue;
  }
}

async function setConfig(key, value) {
  return SystemConfig.findOneAndUpdate({ key }, { value }, { upsert: true, new: true });
}

function normalizeBooking(b) {
  if (!b) return null;
  const doc = b.toObject ? b.toObject() : { ...b };

  let pkg = doc.packageName;
  let pkgPrice = doc.finalPricing?.packageCost || doc.packagePrice || doc.packageSubtotal || 0;
  let extrasCost = doc.finalPricing?.extraServicesCost || doc.extraServicesSubtotal || 0;

  if ((!pkg || pkg === 'Custom') && doc.serviceType) {
    if (doc.serviceType.includes('Elite')) { pkg = 'Elite'; if (pkgPrice === 0) pkgPrice = 4999; }
    else if (doc.serviceType.includes('Pro')) { pkg = 'Pro'; if (pkgPrice === 0) pkgPrice = 2999; }
    else if (doc.serviceType.includes('Aero')) { pkg = 'Aero'; if (pkgPrice === 0) pkgPrice = 1499; }
    else { pkg = 'Aero'; if (pkgPrice === 0) pkgPrice = 1499; }
  }

  if (extrasCost === 0 && doc.serviceType && doc.serviceType.includes('+')) {
    const afterPlus = doc.serviceType.split('+')[1] || '';
    const items = afterPlus.split(',').map(s => s.trim().toLowerCase());
    items.forEach(item => {
      if (item.includes('washing')) extrasCost += 399;
      else if (item.includes('interior')) extrasCost += 799;
      else if (item.includes('alignment')) extrasCost += 699;
      else if (item.includes('balancing')) extrasCost += 499;
      else if (item.includes('brake')) extrasCost += 1999;
      else if (item.includes('battery')) extrasCost += 299;
      else if (item.includes('sanitization')) extrasCost += 499;
      else extrasCost += 499;
    });
  }

  const finalCost = doc.finalPricing?.finalCost || doc.cost || (pkgPrice + extrasCost);

  return {
    ...doc,
    vehicle: doc.vehicleId || doc.vehicle,
    user: doc.userId || doc.user,
    serviceDate: doc.date ? new Date(doc.date).toISOString().split('T')[0] : (doc.serviceDate || '—'),
    serviceTime: doc.time || doc.serviceTime || '10:00 AM',
    servicePackage: pkg || 'Standard',
    packageName: pkg || 'Standard',
    packagePrice: pkgPrice,
    estimatedPrice: finalCost,
    finalPrice: finalCost,
    garageCity: doc.garage?.city || doc.garageCity || doc.garageLocation || 'Main Hub',
    garageLocation: doc.garage?.name || doc.garageLocation || doc.garageCity || 'AeroFleet Workshop',
  };
}

async function backfillHistoricalPricing() {
  try {
    const bookings = await Booking.find({ status: 'Completed' });
    for (const b of bookings) {
      if (!b.cost || b.cost === 0 || !b.finalPricing?.finalCost || b.finalPricing.finalCost === 0) {
        const norm = normalizeBooking(b);
        b.packageName = norm.packageName;
        b.packagePrice = norm.packagePrice;
        b.packageSubtotal = norm.packagePrice;
        b.extraServicesSubtotal = norm.finalPrice - norm.packagePrice;
        b.cost = norm.finalPrice;
        b.completedAt = b.completedAt || b.updatedAt || b.date;
        b.finalPricing = {
          packageCost: norm.packagePrice,
          extraServicesCost: norm.finalPrice - norm.packagePrice,
          tax: 0,
          finalCost: norm.finalPrice,
          completedAt: b.completedAt,
          finalized: true,
        };
        await b.save();

        const existingExp = await Expense.findOne({ bookingId: b._id });
        if (!existingExp && norm.finalPrice > 0 && b.userId && b.vehicleId) {
          await Expense.create({
            userId: b.userId,
            vehicleId: b.vehicleId,
            date: b.completedAt,
            category: 'Service Package',
            description: `${norm.packageName} Package Service`,
            amount: norm.finalPrice,
            notes: 'Completed service finalized',
            source: 'service_booking',
            bookingId: b._id,
          });
        }
      }
    }
  } catch (err) {
    console.error('Backfill historical pricing error:', err);
  }
}
router.backfillHistoricalPricing = backfillHistoricalPricing;

/* ──────────────────────────────────────────────────────────────────────────
   1. DASHBOARD OVERVIEW STATS
   ────────────────────────────────────────────────────────────────────────── */
router.get('/dashboard-stats', async (req, res) => {
  try {
    const [
      totalUsers,
      totalVehicles,
      rawBookings,
      auditLogs,
      recentUsers
    ] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      Vehicle.countDocuments(),
      Booking.find().populate('vehicleId', 'make model licensePlate').populate('userId', 'name email'),
      AuditLog.find().sort({ createdAt: -1 }).limit(8),
      User.find({ role: 'customer' }).sort({ createdAt: -1 }).limit(5).select('name email createdAt')
    ]);

    const bookings = rawBookings.map(normalizeBooking);

    const totalBookings = bookings.length;
    const pendingServices = bookings.filter(b => b.status === 'Pending Confirmation' || b.status === 'Pending').length;
    const scheduledServices = bookings.filter(b => b.status === 'Scheduled').length;
    const inProgressServices = bookings.filter(b => b.status === 'In Progress').length;
    const completedBookings = bookings.filter(b => b.status === 'Completed');
    const completedServices = completedBookings.length;
    const cancelledServices = bookings.filter(b => b.status === 'Cancelled').length;

    // Revenue calculations (COMPLETED ONLY)
    const totalRevenue = completedBookings.reduce((sum, b) => {
      return sum + (b.finalPrice || b.estimatedPrice || 0);
    }, 0);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    const monthlyRevenue = completedBookings.filter(b => {
      const d = b.completedAt ? new Date(b.completedAt) : new Date(b.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }).reduce((sum, b) => {
      return sum + (b.finalPrice || b.estimatedPrice || 0);
    }, 0);

    // Monthly Trend (Past 6 Months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(currentYear, currentMonth - i, 1);
      const targetY = targetDate.getFullYear();
      const targetM = targetDate.getMonth();
      const monthLabel = targetDate.toLocaleString('en-US', { month: 'short' });

      const monthBookings = bookings.filter(b => {
        const d = new Date(b.createdAt || b.date);
        return d.getFullYear() === targetY && d.getMonth() === targetM;
      });

      const monthCompletedRev = completedBookings.filter(b => {
        const d = b.completedAt ? new Date(b.completedAt) : new Date(b.date);
        return d.getFullYear() === targetY && d.getMonth() === targetM;
      }).reduce((sum, b) => sum + (b.finalPrice || 0), 0);

      monthlyTrend.push({
        month: monthLabel,
        year: targetY,
        bookings: monthBookings.length,
        revenue: monthCompletedRev,
      });
    }

    // Package Popularity
    const pkgCounts = { Aero: 0, Pro: 0, Elite: 0, Custom: 0 };
    bookings.forEach(b => {
      const p = b.packageName || 'Pro';
      if (pkgCounts[p] !== undefined) pkgCounts[p]++;
      else pkgCounts['Custom']++;
    });

    // Manufacturer Distribution
    const allVehicles = await Vehicle.find().select('make');
    const makeCounts = {};
    allVehicles.forEach(v => {
      const m = v.make || 'Other';
      makeCounts[m] = (makeCounts[m] || 0) + 1;
    });

    res.json({
      totalUsers,
      totalVehicles,
      totalBookings,
      pendingServices,
      scheduledServices,
      inProgressServices,
      completedServices,
      cancelledServices,
      totalRevenue,
      monthlyRevenue,
      monthlyTrend,
      packagePopularity: Object.entries(pkgCounts).map(([name, count]) => ({ name, count })),
      manufacturerDistribution: Object.entries(makeCounts)
        .map(([make, count]) => ({ make, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      recentActivity: auditLogs,
      recentUsers,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ message: 'Server error computing dashboard stats' });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   2. USERS MANAGEMENT
   ────────────────────────────────────────────────────────────────────────── */
router.get('/users', async (req, res) => {
  try {
    const { q, status } = req.query;
    const filter = { role: 'customer' };

    if (status && status !== 'All') {
      filter.status = status;
    }

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { number: { $regex: q, $options: 'i' } },
      ];
    }

    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    const userIds = users.map(u => u._id);

    // Aggregate counts and expenditure per user
    const [vehicles, bookings, manualExpenses] = await Promise.all([
      Vehicle.find({ userId: { $in: userIds } }),
      Booking.find({ userId: { $in: userIds } }),
      Expense.find({ userId: { $in: userIds }, source: 'manual' })
    ]);

    const userStats = users.map(u => {
      const uVehicles = vehicles.filter(v => v.userId.toString() === u._id.toString());
      const uBookings = bookings.filter(b => b.userId.toString() === u._id.toString());
      const completed = uBookings.filter(b => b.status === 'Completed');
      const bookingCost = completed.reduce((sum, b) => sum + (b.finalPricing?.finalCost || b.cost || 0), 0);
      const manualCost = manualExpenses.filter(e => e.userId.toString() === u._id.toString()).reduce((sum, e) => sum + (e.amount || 0), 0);

      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        number: u.number,
        role: u.role,
        status: u.status || 'Active',
        createdAt: u.createdAt,
        vehiclesCount: uVehicles.length,
        bookingsCount: uBookings.length,
        completedCount: completed.length,
        totalExpenditure: bookingCost + manualCost,
      };
    });

    res.json(userStats);
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const [vehicles, bookings, expenses] = await Promise.all([
      Vehicle.find({ userId: user._id }),
      Booking.find({ userId: user._id }).populate('vehicleId', 'make model licensePlate').sort({ createdAt: -1 }),
      Expense.find({ userId: user._id }).populate('vehicleId', 'make model licensePlate').sort({ date: -1 })
    ]);

    const completedBookings = bookings.filter(b => b.status === 'Completed');
    const upcomingBookings = bookings.filter(b => b.status === 'Scheduled' || b.status === 'Pending Confirmation');
    const cancelledBookings = bookings.filter(b => b.status === 'Cancelled');

    const totalExpenditure = completedBookings.reduce((sum, b) => sum + (b.finalPricing?.finalCost || b.cost || 0), 0) +
      expenses.filter(e => e.source === 'manual').reduce((sum, e) => sum + (e.amount || 0), 0);

    res.json({
      user,
      vehicles,
      bookings,
      completedBookings,
      upcomingBookings,
      cancelledBookings,
      expenses,
      totalExpenditure,
    });
  } catch (err) {
    console.error('User details error:', err);
    res.status(500).json({ message: 'Server error fetching user details' });
  }
});

router.patch('/users/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Active', 'Suspended'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot suspend administrator accounts' });

    user.status = status;
    await user.save();

    await AuditLog.create({
      action: status === 'Active' ? 'USER_ACTIVATED' : 'USER_SUSPENDED',
      adminId: req.user.id,
      adminName: req.user.name || 'Admin',
      adminEmail: req.user.email || 'admin@aerofleet.com',
      targetType: 'User',
      targetId: user._id.toString(),
      details: `User ${user.name} (${user.email}) status changed to ${status}`,
    });

    res.json({ message: `User status changed to ${status}`, user });
  } catch (err) {
    console.error('Update user status error:', err);
    res.status(500).json({ message: 'Server error updating user status' });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   3. VEHICLES MANAGEMENT
   ────────────────────────────────────────────────────────────────────────── */
router.get('/vehicles', async (req, res) => {
  try {
    const { q, make } = req.query;
    const filter = {};

    if (make && make !== 'All') {
      filter.make = make;
    }

    if (q) {
      filter.$or = [
        { licensePlate: { $regex: q, $options: 'i' } },
        { make: { $regex: q, $options: 'i' } },
        { model: { $regex: q, $options: 'i' } },
      ];
    }

    const vehicles = await Vehicle.find(filter)
      .populate('userId', 'name email number status')
      .sort({ createdAt: -1 });

    const vehicleIds = vehicles.map(v => v._id);
    const bookings = await Booking.find({ vehicleId: { $in: vehicleIds } });
    const expenses = await Expense.find({ vehicleId: { $in: vehicleIds } });

    const enriched = vehicles.map(v => {
      const vBookings = bookings.filter(b => b.vehicleId?.toString() === v._id.toString());
      const completed = vBookings.filter(b => b.status === 'Completed');
      const upcoming = vBookings.filter(b => b.status === 'Scheduled' || b.status === 'Pending Confirmation');
      const lastCompleted = [...completed].sort((a, b) => new Date(b.completedAt || b.date) - new Date(a.completedAt || a.date))[0];

      const vExpenses = expenses.filter(e => e.vehicleId?.toString() === v._id.toString());
      const totalExp = completed.reduce((sum, b) => sum + (b.finalPricing?.finalCost || b.cost || 0), 0) +
        vExpenses.filter(e => e.source === 'manual').reduce((sum, e) => sum + (e.amount || 0), 0);

      return {
        _id: v._id,
        make: v.make,
        model: v.model,
        variant: v.variant,
        year: v.year,
        licensePlate: v.licensePlate,
        fuelType: v.fuelType || 'Petrol/Diesel',
        owner: v.userId,
        createdAt: v.createdAt,
        bookingsCount: vBookings.length,
        completedCount: completed.length,
        upcomingCount: upcoming.length,
        lastCompletedService: lastCompleted ? {
          date: lastCompleted.completedAt || lastCompleted.date,
          package: lastCompleted.packageName,
          cost: lastCompleted.finalPricing?.finalCost || lastCompleted.cost
        } : null,
        totalExpenditure: totalExp,
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error('Fetch vehicles error:', err);
    res.status(500).json({ message: 'Server error fetching vehicles' });
  }
});

router.get('/vehicles/:id', async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).populate('userId', 'name email number status');
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const [bookings, expenses] = await Promise.all([
      Booking.find({ vehicleId: vehicle._id }).sort({ date: -1 }),
      Expense.find({ vehicleId: vehicle._id }).sort({ date: -1 })
    ]);

    const completed = bookings.filter(b => b.status === 'Completed');
    const totalExp = completed.reduce((sum, b) => sum + (b.finalPricing?.finalCost || b.cost || 0), 0) +
      expenses.filter(e => e.source === 'manual').reduce((sum, e) => sum + (e.amount || 0), 0);

    res.json({
      vehicle,
      bookings,
      expenses,
      totalExpenditure: totalExp,
    });
  } catch (err) {
    console.error('Vehicle details error:', err);
    res.status(500).json({ message: 'Server error fetching vehicle details' });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   4. SERVICE BOOKINGS MANAGEMENT & ACTIONS
   ────────────────────────────────────────────────────────────────────────── */
router.get('/bookings', async (req, res) => {
  try {
    const { status, garage, q, date } = req.query;
    const filter = {};

    if (status && status !== 'All') {
      filter.status = status;
    }
    if (garage && garage !== 'All') {
      filter['garage.name'] = { $regex: garage, $options: 'i' };
    }

    const bookings = await Booking.find(filter)
      .populate('userId', 'name email number')
      .populate('vehicleId', 'make model licensePlate year variant')
      .sort({ createdAt: -1 });

    let result = bookings;
    if (q) {
      const query = q.toLowerCase();
      result = bookings.filter(b => {
        const idMatch = b._id.toString().toLowerCase().includes(query);
        const userMatch = b.userId?.name?.toLowerCase().includes(query) || b.userId?.email?.toLowerCase().includes(query);
        const carMatch = b.vehicleId?.make?.toLowerCase().includes(query) || b.vehicleId?.licensePlate?.toLowerCase().includes(query);
        return idMatch || userMatch || carMatch;
      });
    }

    res.json(result.map(normalizeBooking));
  } catch (err) {
    console.error('Fetch bookings error:', err);
    res.status(500).json({ message: 'Server error fetching bookings' });
  }
});

// Admin confirm booking (Pending -> Scheduled)
const handleConfirmBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('vehicleId', 'make model licensePlate');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status === 'Cancelled' || booking.status === 'Completed') {
      return res.status(400).json({ message: `Cannot confirm booking in ${booking.status} status` });
    }

    booking.status = 'Scheduled';
    await booking.save();

    await AuditLog.create({
      action: 'BOOKING_CONFIRMED',
      adminId: req.user.id,
      adminName: req.user.name || 'Admin',
      adminEmail: req.user.email || 'admin@aerofleet.com',
      targetType: 'Booking',
      targetId: booking._id.toString(),
      details: `Booking #${booking._id.toString().slice(-6).toUpperCase()} confirmed for ${booking.vehicleId?.make} ${booking.vehicleId?.model}`,
    });

    // ── Real-time: notify booking owner ──────────────────────────────────────
    const confirmOwnerId = String(booking.userId?._id || booking.userId);
    const confirmVehicle = booking.vehicleId ? `${booking.vehicleId.make} ${booking.vehicleId.model}` : 'Vehicle';
    emitToUser(confirmOwnerId, 'service:updated', {
      bookingId: booking._id, status: 'Scheduled', previousStatus: 'Pending Confirmation', vehicleName: confirmVehicle,
    });
    emitToAdmins('booking:updated', { bookingId: booking._id, status: 'Scheduled', vehicleName: confirmVehicle });
    await createNotification({
      userId: confirmOwnerId, audience: 'customer', type: 'booking:confirmed',
      title: 'Booking Confirmed ✓',
      message: `Your ${confirmVehicle} service has been confirmed and scheduled.`,
      data: { bookingId: booking._id },
    });

    res.json(normalizeBooking(booking));
  } catch (err) {
    console.error('Confirm booking error:', err);
    res.status(500).json({ message: 'Server error confirming booking' });
  }
};
router.patch('/bookings/:id/confirm', handleConfirmBooking);
router.post('/bookings/:id/confirm', handleConfirmBooking);

// Admin mark In Progress
const handleProgressBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('vehicleId', 'make model licensePlate');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status === 'Completed' || booking.status === 'Cancelled') {
      return res.status(400).json({ message: `Cannot set ${booking.status} booking to in progress` });
    }

    booking.status = 'In Progress';
    await booking.save();

    await AuditLog.create({
      action: 'BOOKING_IN_PROGRESS',
      adminId: req.user.id,
      adminName: req.user.name || 'Admin',
      adminEmail: req.user.email || 'admin@aerofleet.com',
      targetType: 'Booking',
      targetId: booking._id.toString(),
      details: `Service #${booking._id.toString().slice(-6).toUpperCase()} moved to In Progress in bay`,
    });

    // ── Real-time ────────────────────────────────────────────────────────────
    const progOwnerId = String(booking.userId?._id || booking.userId);
    const progVehicle = booking.vehicleId ? `${booking.vehicleId.make} ${booking.vehicleId.model}` : 'Vehicle';
    emitToUser(progOwnerId, 'service:updated', { bookingId: booking._id, status: 'In Progress', vehicleName: progVehicle });
    emitToAdmins('booking:updated', { bookingId: booking._id, status: 'In Progress', vehicleName: progVehicle });
    await createNotification({
      userId: progOwnerId, audience: 'customer', type: 'service:started',
      title: 'Service In Progress 🔧',
      message: `Your ${progVehicle} service has started at the workshop.`,
      data: { bookingId: booking._id },
    });

    res.json(normalizeBooking(booking));
  } catch (err) {
    console.error('Set in progress error:', err);
    res.status(500).json({ message: 'Server error updating booking' });
  }
};
router.patch('/bookings/:id/progress', handleProgressBooking);
router.post('/bookings/:id/progress', handleProgressBooking);

// Admin reschedule booking
const handleRescheduleBooking = async (req, res) => {
  try {
    const { date, time, garage } = req.body;
    if (!date || !time) return res.status(400).json({ message: 'Date and time are required' });

    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('vehicleId', 'make model licensePlate');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status === 'Completed' || booking.status === 'Cancelled') {
      return res.status(400).json({ message: `Cannot reschedule ${booking.status} booking` });
    }

    booking.rescheduleHistory.push({
      previousDate: booking.date,
      previousTime: booking.time,
      rescheduledAt: new Date(),
    });

    booking.date = new Date(date);
    booking.time = time;
    if (garage) booking.garage = garage;
    booking.rescheduledAt = new Date();
    booking.status = 'Scheduled';

    await booking.save();

    await AuditLog.create({
      action: 'BOOKING_RESCHEDULED',
      adminId: req.user.id,
      adminName: req.user.name || 'Admin',
      adminEmail: req.user.email || 'admin@aerofleet.com',
      targetType: 'Booking',
      targetId: booking._id.toString(),
      details: `Booking rescheduled to ${new Date(date).toLocaleDateString()} at ${time}`,
    });

    // ── Real-time ────────────────────────────────────────────────────────────
    const resOwnerId = String(booking.userId?._id || booking.userId);
    const resVehicle = booking.vehicleId ? `${booking.vehicleId.make} ${booking.vehicleId.model}` : 'Vehicle';
    emitToUser(resOwnerId, 'service:updated', { bookingId: booking._id, status: 'Scheduled', vehicleName: resVehicle, newDate: date, newTime: time });
    emitToAdmins('booking:updated', { bookingId: booking._id, status: 'Scheduled', vehicleName: resVehicle });
    await createNotification({
      userId: resOwnerId, audience: 'customer', type: 'booking:rescheduled',
      title: 'Booking Rescheduled 📅',
      message: `Your ${resVehicle} service was rescheduled to ${new Date(date).toLocaleDateString('en-IN')} at ${time}.`,
      data: { bookingId: booking._id, newDate: date, newTime: time },
    });

    res.json(normalizeBooking(booking));
  } catch (err) {
    console.error('Admin reschedule error:', err);
    res.status(500).json({ message: 'Server error rescheduling booking' });
  }
};
router.patch('/bookings/:id/reschedule', handleRescheduleBooking);
router.post('/bookings/:id/reschedule', handleRescheduleBooking);

// Admin cancel booking
const handleCancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('vehicleId', 'make model licensePlate');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status === 'Completed') {
      return res.status(400).json({ message: 'Completed bookings cannot be cancelled' });
    }

    booking.status = 'Cancelled';
    await booking.save();

    await AuditLog.create({
      action: 'BOOKING_CANCELLED',
      adminId: req.user.id,
      adminName: req.user.name || 'Admin',
      adminEmail: req.user.email || 'admin@aerofleet.com',
      targetType: 'Booking',
      targetId: booking._id.toString(),
      details: `Booking #${booking._id.toString().slice(-6).toUpperCase()} cancelled by administrator`,
    });

    // ── Real-time ────────────────────────────────────────────────────────────
    const cancelOwnerId = String(booking.userId?._id || booking.userId);
    const cancelVehicle = booking.vehicleId ? `${booking.vehicleId.make} ${booking.vehicleId.model}` : 'Vehicle';
    emitToUser(cancelOwnerId, 'service:updated', { bookingId: booking._id, status: 'Cancelled', vehicleName: cancelVehicle });
    emitToAdmins('booking:updated', { bookingId: booking._id, status: 'Cancelled', vehicleName: cancelVehicle });
    await createNotification({
      userId: cancelOwnerId, audience: 'customer', type: 'booking:cancelled',
      title: 'Booking Cancelled',
      message: `Your ${cancelVehicle} service booking has been cancelled by the administrator.`,
      data: { bookingId: booking._id },
    });

    res.json(normalizeBooking(booking));
  } catch (err) {
    console.error('Cancel booking error:', err);
    res.status(500).json({ message: 'Server error cancelling booking' });
  }
};
router.patch('/bookings/:id/cancel', handleCancelBooking);
router.post('/bookings/:id/cancel', handleCancelBooking);

/* ──────────────────────────────────────────────────────────────────────────
   5. MARK SERVICE AS DONE (CRITICAL REQUIREMENT)
   ────────────────────────────────────────────────────────────────────────── */
const handleCompleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('vehicleId', 'make model licensePlate');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status === 'Cancelled') {
      return res.status(400).json({ message: 'Cancelled services cannot be marked as completed' });
    }
    if (booking.status === 'Completed') {
      return res.json({ message: 'Service was already marked as completed', booking: normalizeBooking(booking) });
    }

    const completionDate = new Date();
    let packageCost = booking.packageSubtotal || booking.packagePrice || 0;
    let extraServicesCost = booking.extraServicesSubtotal || (
      Array.isArray(booking.extraServices) ? booking.extraServices.reduce((s, ex) => s + (ex.price || 0), 0) : 0
    );

    // If cost was 0, estimate from package name
    if (packageCost === 0) {
      if (booking.serviceType?.includes('Elite') || booking.packageName === 'Elite') packageCost = 4999;
      else if (booking.serviceType?.includes('Pro') || booking.packageName === 'Pro') packageCost = 2999;
      else packageCost = 1499;
    }

    const tax = booking.tax || 0;
    const finalCost = booking.cost || (packageCost + extraServicesCost + tax);

    booking.status = 'Completed';
    booking.cost = finalCost;
    booking.completedAt = completionDate;
    booking.finalPricing = {
      packageCost,
      extraServicesCost,
      tax,
      finalCost,
      completedAt: completionDate,
      finalized: true,
    };

    await booking.save();

    // Idempotently create Expense records in MongoDB
    try {
      const existingExpenses = await Expense.find({ bookingId: booking._id });
      if (existingExpenses.length === 0) {
        // 1. Package expense
        await Expense.create({
          userId: booking.userId?._id || booking.userId,
          vehicleId: booking.vehicleId?._id || booking.vehicleId,
          date: completionDate,
          category: 'Service Package',
          description: `${booking.packageName || 'Aero'} Service Package (${booking.serviceQuantity ? (booking.serviceQuantity === 1 ? '1st Service' : booking.serviceQuantity === 2 ? '2nd Service' : `${booking.serviceQuantity}th Service`) : 'Completed'})`,
          amount: packageCost,
          notes: booking.garage?.name ? `Completed at ${booking.garage.name}` : '',
          source: 'service_booking',
          bookingId: booking._id,
        });

        // 2. Extra services expense
        if (extraServicesCost > 0) {
          const extraNames = Array.isArray(booking.extraServices) && booking.extraServices.length > 0
            ? booking.extraServices.map(e => e.label).join(', ')
            : 'Additional Services';

          await Expense.create({
            userId: booking.userId?._id || booking.userId,
            vehicleId: booking.vehicleId?._id || booking.vehicleId,
            date: completionDate,
            category: 'Extra Services',
            description: `Extra Services (${extraNames})`,
            amount: extraServicesCost,
            notes: `Completed during service #${booking._id.toString().slice(-6).toUpperCase()}`,
            source: 'service_booking',
            bookingId: booking._id,
          });
        }
      }
    } catch (expErr) {
      console.error('Error creating expense record:', expErr);
    }

    // Record in Audit Log
    await AuditLog.create({
      action: 'SERVICE_COMPLETED',
      adminId: req.user.id,
      adminName: req.user.name || 'Admin',
      adminEmail: req.user.email || 'admin@aerofleet.com',
      targetType: 'Booking',
      targetId: booking._id.toString(),
      details: `Service marked Completed by Admin. Finalized Cost: ₹${finalCost.toLocaleString('en-IN')}`,
      result: 'Success',
    });

    // ── Real-time: notify booking owner and all admins ───────────────────────
    const ownerId = String(booking.userId?._id || booking.userId);
    const vehicleName = booking.vehicleId
      ? `${booking.vehicleId.make} ${booking.vehicleId.model}`
      : 'Vehicle';

    emitToUser(ownerId, 'service:updated', {
      bookingId: booking._id,
      status: 'Completed',
      finalPricing: booking.finalPricing,
      vehicleName,
    });

    emitToUser(ownerId, 'expenditure:updated', {
      bookingId: booking._id,
      amount: finalCost,
      month: completionDate.getMonth(),
      year: completionDate.getFullYear(),
    });

    emitToAdmins('dashboard:updated', {
      trigger: 'service:completed',
      bookingId: booking._id,
      finalCost,
    });

    emitToAdmins('booking:updated', {
      bookingId: booking._id,
      userId: ownerId,
      status: 'Completed',
      vehicleName,
      finalCost,
    });

    await createNotification({
      userId: ownerId,
      audience: 'customer',
      type: 'service:completed',
      title: 'Service Completed ✓',
      message: `Your ${vehicleName} service is complete. Final cost: ₹${finalCost.toLocaleString('en-IN')}`,
      data: { bookingId: booking._id, finalCost, vehicleName },
    });

    res.json({
      message: 'Service marked as completed successfully. Pricing finalized and expenditure recorded.',
      booking: normalizeBooking(booking),
      pricingSummary: {
        packageCost,
        extraServicesCost,
        tax,
        finalTotal: finalCost,
        completedAt: completionDate
      }
    });
  } catch (err) {
    console.error('Mark as done error:', err);
    res.status(500).json({ message: 'Server error marking service as completed' });
  }
};
router.patch('/bookings/:id/complete', handleCompleteBooking);
router.post('/bookings/:id/complete', handleCompleteBooking);

/* ──────────────────────────────────────────────────────────────────────────
   6. ADMIN SERVICE HISTORY
   ────────────────────────────────────────────────────────────────────────── */
router.get('/service-history', async (req, res) => {
  try {
    const { status, garage, package: pkg, q, fromDate, toDate } = req.query;
    const filter = {};

    if (status && status !== 'All') {
      filter.status = status;
    }
    if (garage && garage !== 'All') {
      filter['garage.name'] = { $regex: garage, $options: 'i' };
    }
    if (pkg && pkg !== 'All') {
      filter.packageName = pkg;
    }
    if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) filter.date.$gte = new Date(fromDate);
      if (toDate) filter.date.$lte = new Date(toDate);
    }

    const bookings = await Booking.find(filter)
      .populate('userId', 'name email number')
      .populate('vehicleId', 'make model licensePlate')
      .sort({ completedAt: -1, date: -1 });

    let result = bookings;
    if (q) {
      const query = q.toLowerCase();
      result = bookings.filter(b => {
        return (
          b._id.toString().toLowerCase().includes(query) ||
          b.userId?.name?.toLowerCase().includes(query) ||
          b.vehicleId?.make?.toLowerCase().includes(query) ||
          b.vehicleId?.licensePlate?.toLowerCase().includes(query)
        );
      });
    }

    res.json(result.map(normalizeBooking));
  } catch (err) {
    console.error('Service history error:', err);
    res.status(500).json({ message: 'Server error fetching service history' });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   7. SERVICE PACKAGES & EXTRA SERVICES CONFIGURATION
   ────────────────────────────────────────────────────────────────────────── */
router.get('/packages', async (req, res) => {
  try {
    const packages = await getConfig('service_packages', DEFAULT_PACKAGES);
    const extraServices = await getConfig('extra_services', DEFAULT_EXTRA_SERVICES);
    res.json({ packages, extraServices });
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching packages' });
  }
});

router.put('/packages', async (req, res) => {
  try {
    const { packages, extraServices } = req.body;
    if (packages) await setConfig('service_packages', packages);
    if (extraServices) await setConfig('extra_services', extraServices);

    await AuditLog.create({
      action: 'PACKAGE_UPDATED',
      adminId: req.user.id,
      adminName: req.user.name || 'Admin',
      adminEmail: req.user.email || 'admin@aerofleet.com',
      targetType: 'Package',
      details: 'Administrator updated service package prices/features',
    });

    res.json({ message: 'Packages and extra services configuration saved successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error updating packages' });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   8. GARAGES CONFIGURATION
   ────────────────────────────────────────────────────────────────────────── */
router.get('/garages', async (req, res) => {
  try {
    const garages = await getConfig('garages', DEFAULT_GARAGES);
    const bookings = await Booking.find().select('garage status cost');

    // Enrich with live platform stats per garage
    const enriched = garages.map(g => {
      const gBookings = bookings.filter(b => b.garage?.city?.toLowerCase() === g.city.toLowerCase() || b.garage?.name?.toLowerCase() === g.name.toLowerCase());
      const completed = gBookings.filter(b => b.status === 'Completed');
      const active = gBookings.filter(b => b.status === 'Scheduled' || b.status === 'In Progress');
      const rev = completed.reduce((sum, b) => sum + (b.cost || 0), 0);

      return {
        ...g,
        totalBookings: gBookings.length,
        completedBookings: completed.length,
        activeBookings: active.length,
        revenue: rev,
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching garages' });
  }
});

router.put('/garages/:id', async (req, res) => {
  try {
    const currentGarages = await getConfig('garages', DEFAULT_GARAGES);
    const index = currentGarages.findIndex(g => g.id === req.params.id);
    if (index === -1) return res.status(404).json({ message: 'Garage not found' });

    currentGarages[index] = { ...currentGarages[index], ...req.body };
    await setConfig('garages', currentGarages);

    await AuditLog.create({
      action: 'GARAGE_UPDATED',
      adminId: req.user.id,
      adminName: req.user.name || 'Admin',
      adminEmail: req.user.email || 'admin@aerofleet.com',
      targetType: 'Garage',
      targetId: req.params.id,
      details: `Updated configuration for garage ${currentGarages[index].name}`,
    });

    res.json({ message: 'Garage configuration updated', garage: currentGarages[index] });
  } catch (err) {
    res.status(500).json({ message: 'Server error updating garage' });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   9. EXPENDITURE AND REVENUE MANAGEMENT
   ────────────────────────────────────────────────────────────────────────── */
router.get('/expenditure', async (req, res) => {
  try {
    const [bookings, manualExpenses] = await Promise.all([
      Booking.find()
        .populate('userId', 'name email')
        .populate('vehicleId', 'make model licensePlate')
        .sort({ completedAt: -1, date: -1 }),
      Expense.find({ source: 'manual' })
        .populate('userId', 'name email')
        .populate('vehicleId', 'make model licensePlate')
        .sort({ date: -1 })
    ]);

    const rawCompletedBookings = bookings.filter(b => b.status === 'Completed');
    const completedBookings = rawCompletedBookings.map(normalizeBooking);

    // Total Completed-Service Charges (Revenue to AeroFleet)
    const totalCompletedCharges = completedBookings.reduce((sum, b) => {
      return sum + (b.finalPrice || b.estimatedPrice || 0);
    }, 0);

    // Package Revenue Breakdown
    const packageCharges = completedBookings.reduce((sum, b) => {
      return sum + (b.packagePrice || 0);
    }, 0);

    // Extra Services Charges
    const extraServicesCharges = completedBookings.reduce((sum, b) => {
      return sum + Math.max(0, (b.finalPrice || 0) - (b.packagePrice || 0));
    }, 0);

    // Average completed service value
    const avgServiceValue = completedBookings.length > 0 ? Math.round(totalCompletedCharges / completedBookings.length) : 0;

    // User-entered manual maintenance costs (distinguished from AeroFleet revenue)
    const userManualExpenditure = manualExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Monthly Completed-Service Charges (Current Month)
    const now = new Date();
    const currentM = now.getMonth();
    const currentY = now.getFullYear();
    const monthlyCompletedCharges = completedBookings.filter(b => {
      const d = b.completedAt ? new Date(b.completedAt) : new Date(b.date);
      return d.getMonth() === currentM && d.getFullYear() === currentY;
    }).reduce((sum, b) => sum + (b.finalPrice || 0), 0);

    // Vehicle Breakdown
    const vehicleMap = {};
    completedBookings.forEach(b => {
      const vId = (b.vehicle?._id || b.vehicleId?._id || b.vehicleId || 'unknown').toString();
      if (!vehicleMap[vId]) {
        vehicleMap[vId] = {
          vehicle: b.vehicle || b.vehicleId,
          owner: b.user || b.userId,
          completedCount: 0,
          totalAmount: 0,
          packageTotal: 0,
          extrasTotal: 0,
        };
      }
      vehicleMap[vId].completedCount++;
      const cost = b.finalPrice || 0;
      const pkgCost = b.packagePrice || 0;
      vehicleMap[vId].totalAmount += cost;
      vehicleMap[vId].packageTotal += pkgCost;
      vehicleMap[vId].extrasTotal += Math.max(0, cost - pkgCost);
    });

    // Garage Breakdown
    const garageMap = {};
    completedBookings.forEach(b => {
      const gName = b.garageLocation || b.garageCity || 'AeroFleet Workshop';
      if (!garageMap[gName]) {
        garageMap[gName] = { garage: gName, city: b.garageCity || '', count: 0, amount: 0 };
      }
      garageMap[gName].count++;
      garageMap[gName].amount += (b.finalPrice || 0);
    });

    res.json({
      totalCompletedCharges,
      monthlyCompletedCharges,
      packageCharges,
      extraServicesCharges,
      completedServicesCount: completedBookings.length,
      avgServiceValue,
      userManualExpenditure,
      vehicleBreakdown: Object.values(vehicleMap),
      garageBreakdown: Object.values(garageMap),
      recentTransactions: completedBookings.slice(0, 20),
    });
  } catch (err) {
    console.error('Expenditure stats error:', err);
    res.status(500).json({ message: 'Server error computing expenditure' });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   10. REPORTS AND ANALYTICS
   ────────────────────────────────────────────────────────────────────────── */
router.get('/reports', async (req, res) => {
  try {
    const [users, vehicles, bookings] = await Promise.all([
      User.find({ role: 'customer' }),
      Vehicle.find(),
      Booking.find().populate('vehicleId', 'make model').populate('userId', 'name')
    ]);

    const completed = bookings.filter(b => b.status === 'Completed');
    const cancelled = bookings.filter(b => b.status === 'Cancelled');
    const scheduled = bookings.filter(b => b.status === 'Scheduled');

    // Extra services popularity
    const extraCounts = {};
    bookings.forEach(b => {
      if (Array.isArray(b.extraServices)) {
        b.extraServices.forEach(ex => {
          extraCounts[ex.label] = (extraCounts[ex.label] || 0) + 1;
        });
      }
    });

    res.json({
      summary: {
        totalUsers: users.length,
        totalVehicles: vehicles.length,
        totalBookings: bookings.length,
        completedCount: completed.length,
        cancelledCount: cancelled.length,
        scheduledCount: scheduled.length,
        completionRate: bookings.length > 0 ? Math.round((completed.length / bookings.length) * 100) : 0,
      },
      extraServicesPopularity: Object.entries(extraCounts).map(([service, count]) => ({ service, count })).sort((a,b) => b.count - a.count),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error generating reports' });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   11. SYSTEM ACTIVITY AND AUDIT LOGS
   ────────────────────────────────────────────────────────────────────────── */
router.get('/activity', async (req, res) => {
  try {
    const { action, limit = 50 } = req.query;
    const filter = {};
    if (action && action !== 'All') filter.action = action;

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10));

    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching activity' });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   12. NOTIFICATIONS
   ────────────────────────────────────────────────────────────────────────── */
router.get('/notifications', async (req, res) => {
  try {
    const [pendingBookings, recentCancelled, recentCompleted] = await Promise.all([
      Booking.find({ status: { $in: ['Pending Confirmation', 'Pending'] } })
        .populate('vehicleId', 'make model')
        .populate('userId', 'name')
        .sort({ createdAt: -1 })
        .limit(5),
      Booking.find({ status: 'Cancelled' })
        .populate('vehicleId', 'make model')
        .populate('userId', 'name')
        .sort({ updatedAt: -1 })
        .limit(3),
      Booking.find({ status: 'Completed' })
        .populate('vehicleId', 'make model')
        .populate('userId', 'name')
        .sort({ completedAt: -1 })
        .limit(3),
    ]);

    const notifications = [];

    pendingBookings.forEach(b => {
      notifications.push({
        id: `pending-${b._id}`,
        type: 'warning',
        title: 'Pending Booking Confirmation',
        message: `${b.userId?.name || 'Customer'} requested service for ${b.vehicleId?.make || ''} ${b.vehicleId?.model || ''}`,
        date: b.createdAt,
        bookingId: b._id,
      });
    });

    recentCancelled.forEach(b => {
      notifications.push({
        id: `cancel-${b._id}`,
        type: 'danger',
        title: 'Booking Cancelled',
        message: `Booking #${b._id.toString().slice(-6).toUpperCase()} was cancelled`,
        date: b.updatedAt,
        bookingId: b._id,
      });
    });

    recentCompleted.forEach(b => {
      notifications.push({
        id: `done-${b._id}`,
        type: 'success',
        title: 'Service Completed',
        message: `Service completed for ${b.vehicleId?.make || ''} ${b.vehicleId?.model || ''}`,
        date: b.completedAt || b.updatedAt,
        bookingId: b._id,
      });
    });

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
});

/* ──────────────────────────────────────────────────────────────────────────
   13. ADMIN SETTINGS
   ────────────────────────────────────────────────────────────────────────── */
router.get('/settings', async (req, res) => {
  try {
    const admin = await User.findById(req.user.id).select('-password');
    const systemSettings = await getConfig('system_settings', {
      taxRate: 0,
      maxDailyCapacityPerGarage: 12,
      platformName: 'AeroFleet Automotive Atelier',
      notificationEmails: true,
      maintenanceAlerts: true,
    });
    res.json({ admin, systemSettings });
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching settings' });
  }
});

router.put('/settings/profile', async (req, res) => {
  try {
    const { name, number } = req.body;
    const admin = await User.findById(req.user.id);
    if (!admin) return res.status(404).json({ message: 'Admin user not found' });

    if (name) admin.name = name.trim();
    if (number) admin.number = number.trim();
    await admin.save();

    res.json({ message: 'Profile updated successfully', admin: { name: admin.name, email: admin.email, number: admin.number } });
  } catch (err) {
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

router.put('/settings/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const admin = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);
    await admin.save();

    await AuditLog.create({
      action: 'ADMIN_PASSWORD_CHANGED',
      adminId: req.user.id,
      adminName: req.user.name || 'Admin',
      adminEmail: req.user.email || 'admin@aerofleet.com',
      targetType: 'Auth',
      details: 'Administrator changed their account password',
    });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error updating password' });
  }
});

router.put('/settings/system', async (req, res) => {
  try {
    const settings = await setConfig('system_settings', req.body);
    await AuditLog.create({
      action: 'SYSTEM_SETTINGS_UPDATED',
      adminId: req.user.id,
      adminName: req.user.name || 'Admin',
      adminEmail: req.user.email || 'admin@aerofleet.com',
      targetType: 'System',
      details: 'Administrator updated general system settings',
    });
    res.json({ message: 'System configuration updated successfully', settings });
  } catch (err) {
    res.status(500).json({ message: 'Server error updating system settings' });
  }
});

module.exports = router;
