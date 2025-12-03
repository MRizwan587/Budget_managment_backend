import speakeasy from "speakeasy";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import qrcode from "qrcode";
import TwoFA from "../models/twoFA.js";
import User from "../models/user.js";
import { sendOtpEmail } from "../config/email.js";
import { generateSessionToken } from "./authController.js";

const JWT_SECRET = process.env.JWT_SECRET || "YOUR_SUPER_SECURE_JWT_SECRET";

export const generateOtpAndHash = async () => {
  const otp = crypto.randomInt(100000, 999999).toString();
  const hashedOtp = await bcrypt.hash(otp, 10);
  return { otp, hashedOtp };
};

export const setup2Fa = async (req, res) => {
  const { userId, method } = req.body;
  if (!["Email", "AuthenticatorApp"].includes(method)) {
    return res.status(400).json({ message: "Invalid 2FA method." });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    let secretData = {};
    let responsePayload = { message: `2FA setup initiated for ${method}.` };

    if (method === "Email") {
      const { otp, hashedOtp } = await generateOtpAndHash();
      console.log("otp generated for mail", user.email, otp);
      await sendOtpEmail(user.email, otp);
      secretData = { secretKey: hashedOtp };
    } else {
      const secret = speakeasy.generateSecret({ length: 20 });
      secretData = { secretKey: secret.base32 };

      const otpauthUrl = speakeasy.otpauthURL({
        secret: secret.ascii,
        label: `budget_managment:${user.email}`,
        issuer: "Budget_manager_app",
      });
      const qrImage = await qrcode.toDataURL(otpauthUrl);

      responsePayload = {
        message: "Scan the QR code to complete setup.",
        secret: secret.base32,
        otpauthUrl: otpauthUrl,
        QrCode_Image: qrImage,
      };
    }

    // Create or update the 2FA record (upsert based on user ID)
    await TwoFA.updateOne(
      { user: userId },
      {
        $set: {
          method,
          ...secretData,
          verified: false,
          firstLogin: true, 
        },
      },
      { upsert: true }
    );

    res.status(200).json(responsePayload);
  } catch (error) {
    console.error("2FA Setup Error:", error);
    res.status(500).json({ message: "Failed to initiate 2FA setup." });
  }
};

/*POST /api/2fa/verify - Verifies the OTP/TOTP code entered by the user. */
export const verify2Fa = async (req, res) => {
  const { userId, code } = req.body;

  try {
    const record = await TwoFA.findOne({ user: userId });
    if (!record) {
      return res.status(400).json({ message: "2FA not set up for this user." });
    }

    let isVerified = false;

    if (record.method === "Email") {
      isVerified = await bcrypt.compare(code, record.secretKey);
    } else {
      // AuthenticatorApp (TOTP)
      isVerified = speakeasy.totp.verify({
        secret: record.secretKey,
        encoding: "base32",
        token: code,
      });
    }

    if (isVerified) {
      const updateFields = { lastUsed: Date.now() };

      if (!record.verified) {
        updateFields.verified = true;
      }
      if (record.firstLogin) {
        updateFields.firstLogin = false;
      }

      await TwoFA.updateOne({ user: userId }, { $set: updateFields });

      const user = await User.findById(userId);

      const token = generateSessionToken(userId, user.role);

      return res
        .status(200)
        .json({ message: "2FA verification successful.", user, token });
    } else {
      return res.status(401).json({ message: "Invalid 2FA code." });
    }
  } catch (error) {
    console.error("2FA Verification Error:", error);
    res.status(500).json({ message: "2FA verification failed." });
  }
};

/* POST /api/2fa/resend - Resends OTP for Email method. */
export const resendOtp = async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await User.findById(userId);
    const record = await TwoFA.findOne({ user: userId });

    if (!user || !record || record.method !== "Email") {
      return res
        .status(400)
        .json({ message: "Resend not applicable or method mismatch." });
    }

    const { otp, hashedOtp } = await generateOtpAndHash();
    await sendOtpEmail(user.email, otp);
    await TwoFA.updateOne(
      { user: userId },
      { $set: { secretKey: hashedOtp, verified: false, lastUsed: Date.now() } }
    );

    res.status(200).json({ message: "New OTP sent successfully." });
  } catch (error) {
    console.error("Resend OTP Error:", error);
    res.status(500).json({ message: "Failed to resend OTP." });
  }
};

/** * PATCH /api/2fa/reset/:userId - Admin feature: Deletes the user's 2FA record. */
export const adminReset2Fa = async (req, res) => {
  const { userId } = req.params;
    const userName=await User.findOne({_id:userId}).select('name');
  if (!req.user || req.user.role.toLowerCase() !== "admin") {
    return res.status(403).json({ message: "Access denied." });
  }

  try {
    const result = await TwoFA.deleteOne({ user: userId });
    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ message: "2FA record not found for user .", user: userId });
    }

    res
      .status(200)
      .json({ message: `2FA successfully reset for user ${userName.name} and ID: ${userId}.` });
  } catch (error) {
    console.error("Admin Reset Error:", error);
    res.status(500).json({ message: "Failed to reset 2FA." });
  }
};
