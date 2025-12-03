import express from "express";
import {
  getCategories,
  getCategory,
  addCategory,
  updateCategory,
  updateCategoryStatus,
  deleteCategory,
} from "../controllers/catagorycontroller.js";

import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyToken);
router.get("/", getCategories);
router.post("/", addCategory);
router.put("/:id", updateCategory);
router.patch("/:id/status",  updateCategoryStatus);
router.delete("/:id", deleteCategory);
router.get("/:id", getCategory);

export default router;
