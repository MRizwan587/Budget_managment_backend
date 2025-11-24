import express from "express";
import {
  getCategories,
  addCategory,
  updateCategory,
  updateCategoryStatus,
  deleteCategory,
} from "../controllers/catagorycontroller.js";

import { verifyToken } from "../middleware/authMiddleware.js";


const router = express.Router();

router.use(verifyToken);

// GET global + user categories
router.get("/", getCategories);

// POST category (user-created or admin global)
router.post("/",verifyToken, addCategory);

// PUT (edit category)
router.put("/:id",verifyToken, updateCategory);

// PATCH category status (admin only, global only)
router.patch("/:id/status",verifyToken,  updateCategoryStatus);

//delete
router.delete("/:id", verifyToken, deleteCategory);

export default router;
