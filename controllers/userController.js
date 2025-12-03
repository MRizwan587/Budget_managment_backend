import User from "../models/user.js";

export const getAllUsers = async (req, res) => {
  try {
    let { page, limit, name, role, status } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 5;

    const query = {};
    if (role) {
      query.role = role;
    }

    if (name) {
      query.name = { $regex: name, $options: "i" };
    }
    if (status) {
      query.status = status;
    }

    if (!req.query.page && !req.query.limit) {
      const allUsers = await User.find(query).select("-password");
      return res.status(200).json({
        success: true,
        total: allUsers.length,
        data: allUsers,
      });
    }
    
    const totalUsers = await User.countDocuments(query);
    const skip = (page - 1) * limit;
    const users = await User.find(query)
      .select("-password")
      .skip(skip)
      .limit(limit);
    res.status(200).json({
      success: true,
      total: totalUsers,
      data: users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve users.",
      error: error.message,
    });
  }
};

// GET /api/users/:id - Get single user
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// PATCH /api/users/:id/status - Admin: activate/deactivate user
export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Active", "active", "inactive", "Inactive"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User status updated", user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const userlist = async (req, res) => {
  const users = await User.find();
  return res.status(200).json({
    users: users,
  });
};

export const nonAdminUserList = async (req, res) => {
  let role = req.body.role;
  const nonAdminUsers = await User.find({ role: { $eq: role } });
  return res.status(200).json({
    data: nonAdminUsers,
  });
};
