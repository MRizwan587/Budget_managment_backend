import Transaction from "../models/transaction.js";
import Category from "../models/category.js";
import mongoose from "mongoose";

// POST /api/transactions
export const createTransaction = async (req, res) => {
  try {
    const { category, type, amount, description} = req.body;

    // Validation
    if (!category || !type || !amount ) {
      return res.status(400).json({
        success: false,
        message: "Please provide category, type, amount and date",
      });
    }

    // Check if category exists
    const findCategory = await Category.findById(category);

    if (!findCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // User can only use:
    // 1. Their own category
    // 2. Global admin category (user = null)
    if (
      findCategory.user &&
      String(findCategory.user) !== String(req.userId)
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot use this category",
      });
    }

    // Create transaction
    const newTransaction = new Transaction({
      user: req.userId,
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


//GET /api/transactions?month=&category=
export const getTransactions = async (req, res) => {
  try {
    const { month, category } = req.query;

    const filter = { user: req.userId };

    // Filter by month
    if (month) {
      const start = new Date(`${month}-01`);
      const end = new Date(start);
      end.setMonth(start.getMonth() + 1);

      filter.date = { $gte: start, $lt: end };
    }

    // Filter by category
    if (category) {
      filter.category = category;
    }

    const transactions = await Transaction.find(filter)
      .populate("category", "name")
      .sort({ date: -1 });

    return res.status(200).json({
      success: true,
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

    // Only update provided fields
    const { category, type, amount, description, date } = req.body;

    if (category) {
      const cat = await Category.findById(category);
      if (!cat) {
        return res.status(404).json({ success: false, message: "Category not found" });
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
    const { month } = req.query;

    if (!month) {
      return res.status(400).json({
        success: false,
        message: "Please provide month in format YYYY-MM",
      });
    }

    // Month range
    const start = new Date(`${month}-01`);
    const end = new Date(start);
    end.setMonth(start.getMonth() + 1);

    // User ID must be ObjectId (important fix)
    const userId = new mongoose.Types.ObjectId(req.userId);

    const summary = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: "$type",        // Income / Expense
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Defaults
    let income = 0;
    let expense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    summary.forEach((item) => {
      if (item._id === "Income") {
        income = item.totalAmount;
        incomeCount = item.count;
      }
      if (item._id === "Expense") {
        expense = item.totalAmount;
        expenseCount = item.count;
      }
    });

    return res.status(200).json({
      success: true,
      month,
      stats: {
        totalIncome: income,
        totalExpense: expense,
        balance: income - expense,
        totalTransactions: incomeCount + expenseCount,
        incomeCount,
        expenseCount,
      },
      summary,
    });
  } catch (error) {
    console.error("Monthly summary error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching summary",
      error: error.message,
    });
  }
};
