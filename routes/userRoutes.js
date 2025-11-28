
import express from "express";
import { getAllUsers, updateUserStatus, getUserById} from "../controllers/userController.js";
import {verifyToken} from '../middleware/authMiddleware.js'

const router = express.Router();
// router.use(verifyToken)
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.patch('/:id/status', updateUserStatus)

export default router;