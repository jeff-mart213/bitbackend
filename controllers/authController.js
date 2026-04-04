const User = require('../models/User');
const VerificationCode = require('../models/VerificationCode');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');

exports.register = async (req, res) => {
  try {
    const { fullName, address, phone, email, birthDate, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      address,
      phone,
      email,
      birthDate,
      password: hashedPassword
    });

    // Generate verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry

    await VerificationCode.create({ userId: user._id, code, expiresAt });

    // Send email
    await sendEmail(user.email, 'Verify your account', `Your verification code is: ${code}`);

    res.status(201).json({ message: 'User created. Verification code sent to email.' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const record = await VerificationCode.findOne({ userId: user._id, code, used: false });
    if (!record) return res.status(400).json({ message: 'Invalid code' });
    if (record.expiresAt < new Date()) return res.status(400).json({ message: 'Code expired' });

    user.isVerified = true;
    await user.save();

    record.used = true;
    await record.save();

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.isVerified) return res.status(403).json({ message: 'Email not verified' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid password' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({ token, message: 'Login successful' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Server error' });
  }
};