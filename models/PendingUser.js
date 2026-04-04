const mongoose = require('mongoose');

const pendingUserSchema = new mongoose.Schema({
  fullName: String,
  address: String,
  phone: String,
  email: { type: String, unique: true },
  birthDate: Date,
  passwordHash: String,
  verifyCode: String,
  codeExpires: Date,
}, { timestamps: true });

module.exports = mongoose.model('PendingUser', pendingUserSchema);