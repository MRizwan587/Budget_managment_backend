import express from "express";
import {createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getMonthlySummary,
} from "../controllers/transactioncontroller.js"
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", verifyToken, createTransaction);
router.get("/", verifyToken, getTransactions);

router.get("/summary", verifyToken, getMonthlySummary);
router.get("/:id", verifyToken, getTransactionById);
router.put("/:id", verifyToken, updateTransaction);
router.delete("/:id", verifyToken, deleteTransaction);


export default router;
