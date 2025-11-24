import jwt from "jsonwebtoken";
import User from "../models/user.js";



// Middleware to verify JWT token
export const verifyToken = async (req, res, next) => {
  try {
    
    // Here we Get token from Authorization header Format: "Bearer"
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "No authorization header provided",
      });
    }

    // Extract token from "Bearer"
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    // Verify token decode kar ky user ki info nikalna with secrete key 
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // decode user sy ID nikal kar DB sy same user Fetch user fetch karna
    const user = await User.findById(decoded.id).select("-password");
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "user not found",
      });
    }

    // store inside the request 
    req.userId = decoded.userId;
    req.user = user;

    // Continue to next
    next();
  } catch (error) {
    // Handle different JWT errors
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    // Other errors
    console.error("Token verification error:", error);
    return res.status(401).json({
      success: false,
      message: "Token verification failed",
    });
  }
};
