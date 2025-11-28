import Category from "../models/category.js";

// GET /api/categories
// Get global + user-created categories
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({
      $or: [
        { user: null },        // global category
        { user: req.userId },  // user-created categories
      ],
      active: true,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: categories,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// POST /api/categories
export const addCategory = async (req, res) => {
  try {
    const payload = {
      name: req.body.name,
      user: req.user.role === "admin" ? null : req.userId,
    };

    const category = await Category.create(payload);

    res.status(201).json({
      success: true,
      category,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/categories/:id
export const updateCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category)
      return res.status(404).json({ message: "Category not found" });

    // Normal user can edit only own categories
    if (category.user && category.user.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: "You cannot edit this category" });
    }

    // Admin can edit only global categories
    if (!category.user && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Only admin can edit global categories" });
    }

    category.name = name || category.name;
    await category.save();

    res.json({ success: true, category });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// PATCH /api/categories/:id/status
export const updateCategoryStatus = async (req, res) => {
  try {
    const { active } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category)
      return res.status(404).json({ message: "Category not found" });

    // Only admin can update global categories
    if (category.user !== null || req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admin can activate/deactivate global categories",
      });
    }

    category.active = active;
    await category.save();

    res.json({ message: "Status updated", category });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// DELETE /api/categories/:id
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category)
      return res.status(404).json({ success: false, message: "Category not found" });

    // Admin: delete any category
    if (req.user.role === "admin") {
      await Category.findByIdAndDelete(id);
      return res.json({
        success: true,
        message: "Category deleted successfully (admin)",
      });
    }

    // User: delete own category only
    if (String(category.user) !== String(req.userId)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this category",
      });
    }

    await Category.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete category",
      error: error.message,
    });
  }
};
