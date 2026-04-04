// utils/sendemail.js
const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,  // your Gmail
    pass: process.env.EMAIL_PASS   // your Gmail App Password
  }
});

// Function to send email
const sendEmail = async (to, subject, text) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text
    });
    console.log('Email sent to', to);
  } catch (error) {
    console.error('Email error:', error);
  }
};

module.exports = sendEmail;