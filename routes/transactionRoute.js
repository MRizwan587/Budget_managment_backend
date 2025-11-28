import express from "express";
import {createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getMonthlySummary,
  getRecentTransactions
} from "../controllers/transactioncontroller.js"
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(verifyToken)
router.post("/",  createTransaction);
router.get("/",  getTransactions);

router.get("/summary", getMonthlySummary);
router.get("/recent", getRecentTransactions)
router.get("/:id",  getTransactionById);
router.put("/:id",  updateTransaction);
router.delete("/:id",  deleteTransaction);



export default router;
