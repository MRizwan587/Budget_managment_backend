// models/TwoFA.js
import mongoose from 'mongoose';

const twoFASchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  method: {
    type: String,
    enum: ['Email', 'AuthenticatorApp'],
    required: true
  },
  secretKey: {
    type: String, // OTP secret or Authenticator key
    required: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  firstLogin: {
    type: Boolean,
    default: true // track first login for onboarding
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUsed: {
    type: Date // last time OTP or code was used
  }
});

export default mongoose.model('TwoFA', twoFASchema);
