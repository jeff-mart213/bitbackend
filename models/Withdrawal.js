const mongoose = require("mongoose");

const WithdrawalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  amount: { type: Number, required: true },
  ssn: { type: String, required: true },
  status: { type: String, default: "pending" },
  code: { type: String },
  processedAt: { type: Date }
}, { timestamps: true }); // ✅ adds createdAt and updatedAt

module.exports = mongoose.model("Withdrawal", WithdrawalSchema);
