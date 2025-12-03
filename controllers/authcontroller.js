import jwt from "jsonwebtoken";
import User from "../models/user.js";
import TwoFA from "../models/twoFA.js"; 
import { generateOtpAndHash } from "./2faController.js"; 
import { sendOtpEmail } from "../config/email.js"; 

export const generateSessionToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: "7d", 
  });
};


export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body; 

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password",
      });
    } 

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    } 

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
      role: role || "user", 
    });

    await user.save(); 

    res.status(201).json({
      success: true,
      message: "User registered. Proceed to 2FA setup.",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        }, 
        nextStep: "SETUP_2FA",
        setupToken: jwt.sign(
          { id: user._id, setup: true },
          process.env.JWT_SECRET,
          { expiresIn: "5m" }
        ),
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


export const login = async (req, res) => {
  try {
    const { email, password } = req.body; 

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    } 

    const user = await User.findOne({ email });
    if (
      !user ||
      user.status === "Inactive" ||
      !(await user.comparePassword(password))
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password, or account is inactive",
      });
    }

    const userId = user._id; 

    const twoFaRecord = await TwoFA.findOne({ user: userId }); 
    if (!twoFaRecord) {
      const setupToken = jwt.sign(
        { id: userId, setup: true },
        process.env.JWT_SECRET,
        { expiresIn: "5m" }
      );

      return res.status(202).json({
        success: true,
        twofa: false,
        message: "2FA required. Please choose a setup method.",
        nextStep: "SETUP_2FA",
        data: { id: userId, setupToken },
      });
    } 

    if (twoFaRecord.method === "Email" || !twoFaRecord.verified) {
     
      if (twoFaRecord.method === "Email") {
    
        const { otp, hashedOtp } = await generateOtpAndHash();
        await sendOtpEmail(user.email, otp); 
        await TwoFA.updateOne(
          { user: userId },
          { $set: { secretKey: hashedOtp, verified: false } }
        );
      }

      return res.status(202).json({
        success: true,
        message: `2FA required. Please verify the code using ${twoFaRecord.method}.`,
        nextStep: "VERIFY_2FA",
        data: { userId, method: twoFaRecord.method },
      });
    } 
    return res.status(202).json({
      success: true,
      message: "Please enter your Authenticator App code to complete login.",
      nextStep: "VERIFY_2FA",
      data: { userId, method: "AuthenticatorApp" },
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
