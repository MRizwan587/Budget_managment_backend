import Transaction from "../models/transaction.js";
import Category from "../models/category.js";
import { log } from "console";

// POST /api/transactions
export const createTransaction = async (req, res) => {
  try {
    const { category, type, amount, description } = req.body;
    if (!category || !type || !amount) {
      return res.status(400).json({
        success: false,
        message: "Please provide category, type, amount and date",
      });
    }

    const findCategory = await Category.findById(category);

    if (!findCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (findCategory.user && String(findCategory.user) !== String(req.userId)) {
      return res.status(403).json({
        success: false,
        message: "You cannot use this category",
      });
    }

    // Create transaction
    const newTransaction = new Transaction({
      user: req.user.id,
      category,
      type,
      amount,
      description,
    });

    await newTransaction.save();

    return res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      data: newTransaction,
    });
  } catch (error) {
    console.error("Create transaction error:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating transaction",
      error: error.message,
    });
  }
};

// GET /api/transactions?page=1&limit=10&type=Income&category=Food&minAmount=100&maxAmount=500&startDate=2025-11-01&endDate=2025-11-30
export const getTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      category,
      minAmount,
      maxAmount,
      startDate,
      endDate,
    } = req.query;

    const filter = {};

    if (req.role !== "admin") {
      filter.user = req.userId;
    }
    if (type) {
      filter.type = type;
    }

    if (category) {
      filter.category = category;
    }

    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) filter.amount.$gte = Number(minAmount);
      if (maxAmount) filter.amount.$lte = Number(maxAmount);
    }

    if (startDate || endDate) {
      filter.date = {};

      if (startDate) {
        filter.date.$gte = new Date(startDate);
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    const transactions = await Transaction.find(filter)
      .populate("category", "name")
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Transaction.countDocuments(filter);

    return res.status(200).json({
      success: true,
      currentPage: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      totalRecords: total,
      pageSize: Number(limit),
      data: transactions,
    });
  } catch (error) {
    console.error("Get transaction error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch transactions",
      error: error.message,
    });
  }
};


//GET /api/transactions/:id
export const getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.userId,
    }).populate("category", "name");

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error("Get transaction error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch transaction",
      error: error.message,
    });
  }
};

//PUT /api/transactions/:id
export const updateTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.userId,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    const { category, type, amount, description, date } = req.body;

    if (category) {
      const cat = await Category.findById(category);
      if (!cat) {
        return res
          .status(404)
          .json({ success: false, message: "Category not found" });
      }
      if (cat.user && String(cat.user) !== String(req.userId)) {
        return res.status(403).json({
          success: false,
          message: "You cannot use this category",
        });
      }
      transaction.category = category;
    }

    if (type) transaction.type = type;
    if (amount) transaction.amount = amount;
    if (description) transaction.description = description;
    if (date) transaction.date = date;

    await transaction.save();

    return res.status(200).json({
      success: true,
      message: "Transaction updated successfully",
      data: transaction,
    });
  } catch (error) {
    console.error("Update transaction error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update transaction",
      error: error.message,
    });
  }
};

// Delete
export const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    console.error("Delete transaction error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete transaction",
      error: error.message,
    });
  }
};

//GET /api/transactions/summary?month=2025-11

export const getMonthlySummary = async (req, res) => {
  try {
    const { month, category } = req.query;

    const filter = {};

    if (req.role !== "admin") {
      filter.user = req.userId;
    }

    // MONTH FILTER
    if (month && month !== "ALL") {
      const start = new Date(`${month}-01`);
      const end = new Date(start);
      end.setMonth(start.getMonth() + 1);

      filter.date = { $gte: start, $lt: end };
    }

    // CATEGORY FILTER
    if (category) {
      filter.category = category;
    }
    const recentFilter = {};

    if (req.role !== "admin") {
      recentFilter.user = req.userId;
    }

    const transactionRecent = await Transaction.find(recentFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("category", "name");

    const transactions = await Transaction.find(filter)
      .populate("category", "name")
      .sort({ date: -1 });

    // CALCULATE SUMMARY
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((t) => {
      const type = t.type?.toLowerCase() === "income" ? "Income" : "Expense";

      if (type === "Income") totalIncome += t.amount;
      else totalExpense += t.amount;
    });

    const stats = {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    };

    return res.status(200).json({
      success: true,
      stats,
      transactionRecent,
    });
  } catch (error) {
    console.error("Transaction summary error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch summary",
      error: error.message,
    });
  }
};
