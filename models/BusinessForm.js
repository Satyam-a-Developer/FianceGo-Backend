// models/BusinessForm.js
const mongoose = require('mongoose');

const businessFormSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  businessName: {
    type: String,
    required: true
  },
  period: {
    type: String,
    required: true
  },
  expectedIncome: {
    type: String,
    required: true
  },
  actualIncome: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('BusinessForm', businessFormSchema);