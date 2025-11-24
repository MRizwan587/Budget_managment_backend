
import express from "express";
import { getAllUsers, updateUserStatus} from "../controllers/userController.js";
import {verifyToken} from '../middleware/authMiddleware.js'

const router = express.Router();
router.use(verifyToken)
router.get('/', getAllUsers);
router.patch('/:id/status', updateUserStatus)

export default router;