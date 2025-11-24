// backend/controllers/authController.js

import jwt from "jsonwebtoken";
import User from "../models/user.js";
import TwoFA from "../models/twoFA.js"; // <-- NEW IMPORT: Mongoose 2FA Model
import { generateOtpAndHash } from "./2faController.js"; // <-- NEW IMPORT: Helper for OTP
import { sendOtpEmail } from "../config/email.js"; // <-- NEW IMPORT: Email Sender

// Generate JWT Token (Long-lived session token, only given after full 2FA verification)
export const generateSessionToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: "7d", // 7 days expiration for the session token
  });
};


// Register Controller (No changes needed here for the 2FA flow)
export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Validate role if provided
    if (role && !["user", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be either 'user' or 'admin'",
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role: role || "user", // Default to "user" if not provided
    });

    await user.save();

    // NOTE: We don't generate a full session token here.
    // The user must pass through 2FA setup first.

    // Return success message and next step for 2FA onboarding
    res.status(201).json({
      success: true,
      message: "User registered. Proceed to 2FA setup.",
      data: {
        user: { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status },
        // Return a setup token (short-lived) to be used for the /api/2fa/setup call
        nextStep: "SETUP_2FA", 
        setupToken: jwt.sign({ id: user._id, setup: true }, process.env.JWT_SECRET, { expiresIn: '5m' }),
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "Error registering user",
      error: error.message,
    });
  }
};


// Signin Controller (UPDATED for 2FA)
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Basic Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // 2. Find User and Check Credentials
    const user = await User.findOne({ email });
    if (!user || user.status === 'Inactive' || !await user.comparePassword(password)) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password, or account is inactive",
      });
    }

    const userId = user._id;

    // 3. Check 2FA Status
    const twoFaRecord = await TwoFA.findOne({ user: userId });
    
    // Case B: No 2FA setup exists (First login or Admin reset)
    if (!twoFaRecord) {
        const setupToken = jwt.sign({ id: userId, setup: true }, process.env.JWT_SECRET, { expiresIn: '5m' });

        return res.status(202).json({ 
            success: true,
            message: '2FA required. Please choose a setup method.', 
            nextStep: 'SETUP_2FA', 
            data: { userId, setupToken }
        });
    }

    // Case A: 2FA Setup exists (Verified or Unverified)
    if (twoFaRecord.method === 'Email' || !twoFaRecord.verified) {
        // If Email: Generate new OTP and send it. 
        // If App but not verified: user must complete verification.
        
        if (twoFaRecord.method === 'Email') {
            // Generate new OTP for this login
            const { otp, hashedOtp } = await generateOtpAndHash();
            await sendOtpEmail(user.email, otp);
            
            // Update the secret key and reset 'verified' status to force verification
            await TwoFA.updateOne({ user: userId }, { $set: { secretKey: hashedOtp, verified: false } });
        }

        // Direct to the verification step using 202 Accepted
        return res.status(202).json({ 
            success: true,
            message: `2FA required. Please verify the code using ${twoFaRecord.method}.`, 
            nextStep: 'VERIFY_2FA', 
            data: { userId, method: twoFaRecord.method }
        });
    }
    
    // Case A-Verified: Authenticator App is set up and verified (needs code input only)
    // No server action is needed here, frontend prompts for code and calls /api/2fa/verify
    return res.status(202).json({ 
        success: true,
        message: 'Please enter your Authenticator App code to complete login.', 
        nextStep: 'VERIFY_2FA', 
        data: { userId, method: 'AuthenticatorApp' }
    });


  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({
      success: false,
      message: "Error signing in",
      error: error.message,
    });
  }
};