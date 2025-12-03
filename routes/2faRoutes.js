import express from 'express';
import { setup2Fa, verify2Fa, adminReset2Fa, resendOtp } from '../controllers/2faController.js';
import { verifyToken } from '../middleware/authMiddleware.js'; 
const router = express.Router();

router.post('/setup', setup2Fa);     
router.post('/verify', verify2Fa);   
router.post('/resend', resendOtp);     
router.patch('/reset/:userId',verifyToken, adminReset2Fa); 

export default router;