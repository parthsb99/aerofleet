const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

// Seed initial default administrator if not present
const seedAdminUser = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@aerofleet.com';
    const adminExists = await User.findOne({ email: adminEmail });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123', salt);
      await User.create({
        name: 'AeroFleet Administrator',
        email: adminEmail,
        number: '+91 9999999999',
        password: hashedPassword,
        role: 'admin',
        status: 'Active',
      });
      console.log(`[AeroFleet Admin] Default administrator provisioned: ${adminEmail}`);
    } else if (adminExists.role !== 'admin') {
      adminExists.role = 'admin';
      adminExists.status = 'Active';
      await adminExists.save();
    }
  } catch (err) {
    console.error('Error seeding admin user:', err);
  }
};

router.post('/register', async (req, res) => {
  try {
    const { name, email, number, password } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Accept: +91 XXXXXXXXXX, +91XXXXXXXXXX, or plain 10-digit number
    const digits = (number || '').replace(/^\+91\s?/, '').trim();
    if (!/^[0-9]{10}$/.test(digits)) {
      return res.status(400).json({ message: 'Invalid phone number. Enter a valid 10-digit number.' });
    }
    const normalizedNumber = '+91 ' + digits;

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // SECURITY: Public registration is strictly customer role
    const user = await User.create({
      name,
      email,
      number: normalizedNumber,
      password: hashedPassword,
      role: 'customer',
      status: 'Active',
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = (email || '').trim();

    // Case-insensitive lookup allowing for whitespace trimming
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.status === 'Suspended') {
      return res.status(403).json({ message: 'Your account has been suspended. Please contact administrator.' });
    }

    let isMatch = false;
    if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
      isMatch = await bcrypt.compare(password, user.password);
    } else if (user.password) {
      isMatch = user.password === password;
      if (isMatch) {
        // Automatically upgrade legacy plain-text password to bcrypt hash
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();
      }
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Log admin login activity
    if (user.role === 'admin') {
      try {
        await AuditLog.create({
          action: 'ADMIN_LOGIN',
          adminId: user._id,
          adminName: user.name,
          adminEmail: user.email,
          targetType: 'Auth',
          targetId: user._id.toString(),
          details: `Admin ${user.name} logged in successfully`,
          result: 'Success',
        });
      } catch (logErr) {}
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.seedAdminUser = seedAdminUser;
module.exports = router;
