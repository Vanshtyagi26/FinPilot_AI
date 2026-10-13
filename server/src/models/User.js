const mongoose = require('mongoose');
const { DEFAULT_CURRENCY_CODE, SUPPORTED_CURRENCY_CODES } = require('../config/currency');
const isValidEmail = require('../utils/isValidEmail');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: { validator: isValidEmail, message: 'Email must be a valid email address' },
    },
    password: { type: String, required: true, minlength: 6, select: false },
    currencyCode: { type: String, enum: SUPPORTED_CURRENCY_CODES, default: DEFAULT_CURRENCY_CODE },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
