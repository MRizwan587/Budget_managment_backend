// backend/routes/2faRoutes.js (ES Module syntax)

import express from 'express';
import { setup2Fa, verify2Fa, adminReset2Fa, resendOtp } from '../controllers/2faController.js';
// import { authenticateToken, isAdmin } from '../middleware/authMiddleware.js'; 
const router = express.Router();

// Public routes for 2FA flow
router.post('/setup', setup2Fa);      // POST /api/2fa/setup
router.post('/verify', verify2Fa);    // POST /api/2fa/verify
router.post('/resend', resendOtp);    // POST /api/2fa/resend 


router.patch('/reset/:userId', adminReset2Fa); // patch: /api/2fa/reset/:userId

export default router;