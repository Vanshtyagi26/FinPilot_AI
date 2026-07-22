const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateToken } = require('../utils/generateToken');
const { DEFAULT_CURRENCY_CODE, SUPPORTED_CURRENCY_CODES, normalizeCurrencyCode } = require('../config/currency');

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    const user = await User.create({ name: name || '', email, password: hashed });
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      currencyCode: user.currencyCode || DEFAULT_CURRENCY_CODE,
      supportedCurrencyCodes: SUPPORTED_CURRENCY_CODES,
      token: generateToken(user._id),
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      currencyCode: user.currencyCode || DEFAULT_CURRENCY_CODE,
      supportedCurrencyCodes: SUPPORTED_CURRENCY_CODES,
      token: generateToken(user._id),
    });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    res.json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      currencyCode: req.user.currencyCode || DEFAULT_CURRENCY_CODE,
      supportedCurrencyCodes: SUPPORTED_CURRENCY_CODES,
    });
  } catch (err) {
    next(err);
  }
}

async function updateMe(req, res, next) {
  try {
    const updates = {};
    if (req.body.name !== undefined) {
      updates.name = String(req.body.name || '').trim();
    }
    if (req.body.currencyCode !== undefined) {
      const normalized = normalizeCurrencyCode(req.body.currencyCode);
      if (!normalized) {
        return res.status(400).json({ message: `currencyCode must be one of: ${SUPPORTED_CURRENCY_CODES.join(', ')}` });
      }
      updates.currencyCode = normalized;
    }
    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: 'No updatable fields provided' });
    }

    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true }).lean();
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      currencyCode: user.currencyCode || DEFAULT_CURRENCY_CODE,
      supportedCurrencyCodes: SUPPORTED_CURRENCY_CODES,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, getMe, updateMe };
