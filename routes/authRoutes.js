const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const jwt = require("jsonwebtoken");
const User = require('../models/User');
const PendingUser = require('../models/PendingUser');


// ----- REGISTER -----
router.post('/register', async (req, res) => {
  const { fullName, address, phone, email, birthDate, password } = req.body;

  if (!fullName || !address || !phone || !email || !birthDate || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const codeExpires = new Date(Date.now() + 15 * 60 * 1000);

    // Check if pending user exists
    let pendingUser = await PendingUser.findOne({ email });
    if (pendingUser) {
      pendingUser.fullName = fullName;
      pendingUser.address = address;
      pendingUser.phone = phone;
      pendingUser.birthDate = birthDate;
      pendingUser.passwordHash = passwordHash;
      pendingUser.verifyCode = code;
      pendingUser.codeExpires = codeExpires;
      await pendingUser.save();
    } else {
      pendingUser = new PendingUser({
        fullName,
        address,
        phone,
        email,
        birthDate,
        passwordHash,
        verifyCode: code,
        codeExpires
      });
      await pendingUser.save();
    }

    // Send verification email
    await resend.emails.send({
  from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
  to: email,
  subject: 'Your Verification Code',
  html: `
    <div style="font-family: sans-serif; text-align:center; padding:20px;">
      <h2>BitExchange</h2>
      <p>Hello <strong>${fullName}</strong>, your verification code is:</p>
      <h1>${code}</h1>
      <p>This code expires in 15 minutes.</p>
    </div>
  `
});

    res.json({ message: 'Verification code sent! Check your email.' });

  } catch (err) {
    console.error('Register route error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ----- VERIFY CODE -----
router.post('/verify', async (req, res) => {
  const { email, code } = req.body;
  try {
    const pendingUser = await PendingUser.findOne({ email });
    if (!pendingUser) return res.status(400).json({ message: 'No pending account found' });
    if (pendingUser.verifyCode !== code) return res.status(400).json({ message: 'Invalid code' });
    if (pendingUser.codeExpires < new Date()) return res.status(400).json({ message: 'Code expired' });

    const user = new User({
      fullName: pendingUser.fullName,
      address: pendingUser.address,
      phone: pendingUser.phone,
      email: pendingUser.email,
      birthDate: pendingUser.birthDate,
      password: pendingUser.passwordHash,
      isVerified: true
    });
    await user.save();
    await PendingUser.deleteOne({ email });

    res.json({ message: 'Account verified and created successfully!' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ----- LOGIN -----
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });
    if (!user.isVerified) return res.status(400).json({ message: 'Please verify your account first' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid password' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({
  token,
  message: 'Login successful!',
  user: {
    fullName: user.fullName,
    email: user.email
  }
});

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ----- RESEND VERIFICATION CODE -----
router.post('/resend-code', async (req, res) => {
  const { email } = req.body;
  try {
    const pendingUser = await PendingUser.findOne({ email });
    if (!pendingUser) return res.status(400).json({ message: 'No pending account found' });

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    pendingUser.verifyCode = code;
    pendingUser.codeExpires = new Date(Date.now() + 15 * 60 * 1000);
    await pendingUser.save();

    console.log("Sending resend code to:", email);

    await resend.emails.send({
      from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
      to: email,
      subject: 'Your New Verification Code',
      html: `<div style="text-align:center"><h1>${code}</h1></div>`
    });

    res.json({ message: 'New verification code sent to your email.' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
