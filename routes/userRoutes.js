
import express from "express";
import { getAllUsers, updateUserStatus, getUserById, userlist, nonAdminUserList} from "../controllers/userController.js";
import {verifyToken} from '../middleware/authMiddleware.js'

const router = express.Router();

// router.use(verifyToken)
router.get('/', getAllUsers);
router.get('/all-users', userlist)
router.get('/:id', getUserById);
router.patch('/:id/status', updateUserStatus)
router.post('/get-non-admin-users', nonAdminUserList )

export default router;