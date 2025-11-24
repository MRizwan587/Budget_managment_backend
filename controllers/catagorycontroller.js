import Category from "../models/category.js";

// GET /api/categories
// Global categories + user-created categories
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({
      $or: [
        { user: null }, // global
        { user: req.user._id }, // user-created
      ],
      active: true,
    });

    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// POST /api/categories (user or admin)
export const addCategory = async (req, res) => {
  try {
    let payload = {
      name: req.body.name
    };

    // If admin → Global category → user: null
    if (req.user.role === "admin") {
      payload.user = null;
    } 
    // If normal user → Private category → user: req.userId
    else {
      payload.user = req.userId;
    }

    const category = await Category.create(payload);

    res.status(201).json({
      success: true,
      category
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/categories/:id
// User edits ONLY their own categories
// Admin edits ONLY global categories
export const updateCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category)
      return res.status(404).json({ message: "Category not found" });

    // USER CAN ONLY EDIT OWN CATEGORY
    if (category.user && category.user.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You cannot edit this category" });
    }

    // ADMIN CAN ONLY EDIT GLOBAL CATEGORIES
    if (!category.user && req.user.role !== "Admin") {
      return res
        .status(403)
        .json({ message: "Only admin can edit global categories" });
    }

    category.name = name || category.name;
    await category.save();

    res.json(category);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// PATCH /api/categories/:id/status
// Admin activate/deactivate ONLY global categories
export const updateCategoryStatus = async (req, res) => {
  try {
    const { active } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category)
      return res.status(404).json({ message: "Category not found" });

    if (category.user !== null) {
      return res.status(403).json({
        message: "Admin can only activate/deactivate global categories",
      });
    }

    category.active = active;
    await category.save();

    res.json({ message: "Status updated", category });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


// Delete

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;   // category ID from URL

    // Check category exists
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    // ADMIN CAN DELETE ANY CATEGORY
    if (req.user.role === "admin") {
      await Category.findByIdAndDelete(id);

      return res.status(200).json({
        success: true,
        message: "Category deleted successfully (admin)"
      });
    }

    // USER CAN DELETE ONLY THEIR OWN CATEGORY
    if (String(category.user) !== String(req.userId)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this category"
      });
    }

    // Delete user's own category
    await Category.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully"
    });

  } catch (error) {
    console.error("Delete category error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete category",
      error: error.message
    });
  }
};