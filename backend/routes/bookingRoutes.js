const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Vehicle = require('../models/Vehicle');
const Expense = require('../models/Expense');
const { protect } = require('../middleware/authMiddleware');
const { emitToUser, emitToAdmins, createNotification } = require('../socket/socketManager');

/* ── Centralized Server-Side Pricing Table ── */
const SERVICE_LEVEL_MULTIPLIERS = {
  1: 1.0,
  2: 1.2,
  3: 1.5,
  4: 1.7,
  5: 2.0,
  6: 2.3,
};

const SERVICE_PACKAGES = {
  Aero:  { name: 'Aero Package',  badge: 'Basic',    basePrice: 1499 },
  Pro:   { name: 'Pro Package',   badge: 'Standard', basePrice: 2999 },
  Elite: { name: 'Elite Package', badge: 'Premium',  basePrice: 4999 },
};

const EXTRA_SERVICES_MAP = {
  'car-washing':        { label: 'Car Washing',            price: 399 },
  'interior-cleaning':  { label: 'Interior Deep Cleaning', price: 799 },
  'ac-gas':             { label: 'AC Gas Refill',          price: 1499 },
  'wheel-alignment':    { label: 'Wheel Alignment',        price: 699 },
  'wheel-balancing':    { label: 'Wheel Balancing',        price: 499 },
  'battery-test':       { label: 'Battery Health Test',    price: 299 },
  'engine-diag':        { label: 'Engine Diagnostics',     price: 999 },
  'brake-pads':         { label: 'Brake Pad Replacement',  price: 1999 },
  'car-sanitization':   { label: 'Car Sanitization',       price: 499 },
};

// GET all bookings for logged-in user
router.get('/', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id })
      .populate('vehicleId', 'make model variant year licensePlate')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST create a booking
router.post('/', protect, async (req, res) => {
  try {
    const {
      vehicleId,
      packageName,
      serviceQuantity = 1,
      extraServices = [],
      garage,
      date,
      time,
      notes = '',
      serviceType: clientServiceType,
    } = req.body;

    if (!date || !time) {
      return res.status(400).json({ message: 'Date and time are required for scheduling' });
    }

    if (!vehicleId) {
      return res.status(400).json({ message: 'Vehicle selection is required' });
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle || vehicle.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Vehicle not found or unauthorized' });
    }

    /* ── Server-side price recalculation based on periodic service milestone level ── */
    let selectedPackage = SERVICE_PACKAGES[packageName];
    let resolvedPackageName = packageName || 'Aero';
    let basePrice = selectedPackage ? selectedPackage.basePrice : 1499;
    let levelNum = Math.max(1, parseInt(serviceQuantity, 10) || 1);
    let multiplier = SERVICE_LEVEL_MULTIPLIERS[levelNum] || 1.0;
    let packagePrice = Math.round(basePrice * multiplier);
    let packageSubtotal = packagePrice;

    // Validate and recalculate extra services
    let validatedExtras = [];
    if (Array.isArray(extraServices)) {
      extraServices.forEach(ex => {
        const id = typeof ex === 'string' ? ex : ex.id;
        if (id && EXTRA_SERVICES_MAP[id]) {
          validatedExtras.push({
            id,
            label: EXTRA_SERVICES_MAP[id].label,
            price: EXTRA_SERVICES_MAP[id].price,
          });
        }
      });
    }

    let extraServicesSubtotal = validatedExtras.reduce((sum, item) => sum + item.price, 0);
    let finalCost = packageSubtotal + extraServicesSubtotal;

    // Generate clear descriptive serviceType for history display
    let serviceType = clientServiceType;
    if (!serviceType) {
      const pkgLabel = selectedPackage ? `${selectedPackage.name} (${selectedPackage.badge})` : 'Custom Service';
      const qtyLabel = `${levelNum} session${levelNum > 1 ? 's' : ''}`;
      const extrasLabel = validatedExtras.length > 0 ? ` + ${validatedExtras.map(e => e.label).join(', ')}` : '';
      serviceType = `${pkgLabel} [${qtyLabel}]${extrasLabel}`;
    }

    const booking = await Booking.create({
      userId: req.user.id,
      vehicleId,
      serviceType,
      packageName: resolvedPackageName,
      packagePrice,
      serviceQuantity: levelNum,
      packageSubtotal,
      extraServices: validatedExtras,
      extraServicesSubtotal,
      garage: garage || { name: 'AeroFleet Workshop', city: 'Mumbai' },
      cost: finalCost,
      tax: 0,
      date,
      time,
      status: 'Pending Confirmation',
      notes: notes || '',
    });

    const populated = await booking.populate('vehicleId', 'make model variant year licensePlate');

    // ── Real-time: notify admins of new booking ──────────────────────────────
    const vehicleName = `${vehicle.make} ${vehicle.model}`;
    emitToAdmins('booking:created', {
      bookingId: booking._id,
      userId: req.user.id,
      vehicleName,
      package: resolvedPackageName,
      amount: finalCost,
      status: 'Pending Confirmation',
      createdAt: booking.createdAt,
    });

    await createNotification({
      userId: null,
      audience: 'admin',
      type: 'booking:created',
      title: 'New Service Booking',
      message: `${vehicleName} booked for ${resolvedPackageName} package (₹${finalCost.toLocaleString('en-IN')})`,
      data: { bookingId: booking._id, vehicleName, amount: finalCost },
    });

    res.status(201).json(populated);
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ message: 'Server error creating booking' });
  }
});

// PATCH update booking status (Mark as Done, Cancel, etc.)
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const { status } = req.body;
    const allowed = ['Pending Confirmation', 'Scheduled', 'In Progress', 'Cancelled', 'Pending'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Only administrators can mark services as completed.' });
    }

    // Validation of status transitions
    if (booking.status === 'Completed') {
      if (status === 'Completed') {
        // Idempotent: already completed, return populated
        const populated = await booking.populate('vehicleId', 'make model variant year licensePlate');
        return res.json(populated);
      }
      return res.status(400).json({ message: 'Completed bookings cannot be modified' });
    }
    if (booking.status === 'Cancelled') {
      return res.status(400).json({ message: 'Cancelled bookings cannot be modified' });
    }

    const previousStatus = booking.status;
    booking.status = status;

    if (status === 'Completed') {
      const completionDate = new Date();
      booking.completedAt = completionDate;

      const packageCost = booking.packageSubtotal || booking.packagePrice || 0;
      const extraServicesCost = booking.extraServicesSubtotal || (Array.isArray(booking.extraServices) ? booking.extraServices.reduce((s, ex) => s + (ex.price || 0), 0) : 0);
      const tax = booking.tax || 0;
      const finalCost = booking.cost || (packageCost + extraServicesCost + tax);

      booking.finalPricing = {
        packageCost,
        extraServicesCost,
        tax,
        finalCost,
        completedAt: completionDate,
        finalized: true,
      };

      // Create Expense records idempotently
      try {
        const existingExpenses = await Expense.find({ bookingId: booking._id });
        if (existingExpenses.length === 0) {
          // Package expense
          await Expense.create({
            userId: req.user.id,
            vehicleId: booking.vehicleId,
            date: completionDate,
            category: 'Service Package',
            description: `${booking.packageName || 'Aero'} Service Package (${booking.serviceQuantity ? (booking.serviceQuantity === 1 ? '1st Service' : booking.serviceQuantity === 2 ? '2nd Service' : booking.serviceQuantity === 3 ? '3rd Service' : `${booking.serviceQuantity}th Service`) : 'Completed'})`,
            amount: packageCost,
            notes: booking.garage?.name ? `Garage: ${booking.garage.name}` : '',
            source: 'service_booking',
            bookingId: booking._id,
          });

          // Extra services expense
          if (extraServicesCost > 0) {
            const extraNames = Array.isArray(booking.extraServices) && booking.extraServices.length > 0
              ? booking.extraServices.map(e => e.label).join(', ')
              : 'Additional Services';

            await Expense.create({
              userId: req.user.id,
              vehicleId: booking.vehicleId,
              date: completionDate,
              category: 'Extra Services',
              description: `Extra Services (${extraNames})`,
              amount: extraServicesCost,
              notes: `Completed during booking #${booking._id.toString().slice(-6).toUpperCase()}`,
              source: 'service_booking',
              bookingId: booking._id,
            });
          }
        }

        // ── Emit expenditure update to user ─────────────────────────────────
        emitToUser(String(req.user.id), 'expenditure:updated', {
          bookingId: booking._id,
          amount: finalCost,
          month: completionDate.getMonth(),
          year: completionDate.getFullYear(),
        });

      } catch (expErr) {
        console.error('Error auto-creating expense record:', expErr);
      }
    }

    await booking.save();
    const populated = await booking.populate('vehicleId', 'make model variant year licensePlate');

    // ── Emit status change to user and admins ────────────────────────────────
    const vehicleName = populated.vehicleId
      ? `${populated.vehicleId.make} ${populated.vehicleId.model}`
      : 'Vehicle';

    emitToUser(String(req.user.id), 'service:updated', {
      bookingId: booking._id,
      status,
      previousStatus,
      finalPricing: booking.finalPricing,
      vehicleName,
    });

    emitToAdmins('booking:updated', {
      bookingId: booking._id,
      userId: req.user.id,
      status,
      previousStatus,
      vehicleName,
    });

    // Notify user of status change
    if (status === 'Completed') {
      await createNotification({
        userId: req.user.id,
        audience: 'customer',
        type: 'service:completed',
        title: 'Service Completed',
        message: `Your ${vehicleName} service has been completed. Final cost: ₹${(booking.finalPricing?.finalCost || 0).toLocaleString('en-IN')}`,
        data: { bookingId: booking._id, finalCost: booking.finalPricing?.finalCost },
      });
      emitToAdmins('dashboard:updated', { trigger: 'service:completed', bookingId: booking._id });
    } else if (status === 'Cancelled') {
      await createNotification({
        userId: req.user.id,
        audience: 'customer',
        type: 'booking:cancelled',
        title: 'Booking Cancelled',
        message: `Your service booking for ${vehicleName} has been cancelled.`,
        data: { bookingId: booking._id },
      });
    }

    res.json(populated);
  } catch (err) {
    console.error('Status update error:', err);
    res.status(500).json({ message: 'Server error updating status' });
  }
});

// PATCH reschedule booking
router.patch('/:id/reschedule', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.status === 'Completed' || booking.status === 'Cancelled') {
      return res.status(400).json({ message: 'Cannot reschedule completed or cancelled booking' });
    }

    const { date, time, garage } = req.body;
    if (!date || !time) {
      return res.status(400).json({ message: 'Date and time are required for rescheduling' });
    }

    // Save history
    booking.rescheduleHistory.push({
      previousDate: booking.date,
      previousTime: booking.time,
      rescheduledAt: new Date(),
    });

    booking.date = date;
    booking.time = time;
    if (garage) booking.garage = garage;
    booking.rescheduledAt = new Date();
    booking.status = 'Scheduled'; // moves to scheduled when time is confirmed/updated

    await booking.save();
    const populated = await booking.populate('vehicleId', 'make model variant year licensePlate');

    const vehicleName = populated.vehicleId
      ? `${populated.vehicleId.make} ${populated.vehicleId.model}`
      : 'Vehicle';

    // ── Notify admins of rescheduling ────────────────────────────────────────
    emitToAdmins('booking:updated', {
      bookingId: booking._id,
      userId: req.user.id,
      status: 'Scheduled',
      previousStatus: 'rescheduled',
      vehicleName,
      newDate: date,
      newTime: time,
    });

    await createNotification({
      userId: null,
      audience: 'admin',
      type: 'booking:rescheduled',
      title: 'Booking Rescheduled',
      message: `${vehicleName} booking rescheduled to ${new Date(date).toLocaleDateString('en-IN')} at ${time}`,
      data: { bookingId: booking._id, vehicleName, newDate: date, newTime: time },
    });

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Server error rescheduling booking' });
  }
});

// DELETE cancel a booking
router.delete('/:id', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const vehicleInfo = await Vehicle.findById(booking.vehicleId).select('make model');
    const vehicleName = vehicleInfo ? `${vehicleInfo.make} ${vehicleInfo.model}` : 'Vehicle';

    await booking.deleteOne();

    // ── Notify admins of cancellation ────────────────────────────────────────
    emitToAdmins('booking:updated', {
      bookingId: booking._id,
      userId: req.user.id,
      status: 'Cancelled',
      vehicleName,
    });

    await createNotification({
      userId: null,
      audience: 'admin',
      type: 'booking:cancelled',
      title: 'Booking Cancelled',
      message: `${vehicleName} booking has been cancelled by the user.`,
      data: { bookingId: booking._id, vehicleName },
    });

    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
