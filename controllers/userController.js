
import User from "../models/user.js"


export const getAllUsers = async (req, res) => {
    try {
        // 1. Get Pagination Parameters
        let { page, limit, name, role } = req.query;

        // Default pagination values
        page = parseInt(page) || 1;
        limit = parseInt(limit) || 5;

        // 2. Build Query Object for Filtering
        const query = {};

        // Filter by Role (if provided)
        if (role) {
            query.role = role; // Assuming role is an exact match (e.g., 'admin', 'user')
        }

        // Search by Name (if provided)
        if (name) {
            // Use Mongoose regex for case-insensitive partial matching
            query.name = { $regex: name, $options: 'i' }; 
        }

        // 3. Handle 'Return ALL' case (if no page/limit provided in the original request)
        if (!req.query.page && !req.query.limit) {
            const allUsers = await User.find(query).select("-password");
            return res.status(200).json({
                success: true,
                total: allUsers.length,
                data: allUsers
            });
        }
        
        // 4. Calculate Total Count
        const totalUsers = await User.countDocuments(query);
        const skip = (page - 1) * limit;

        // 5. Execute Paginated and Filtered Query
        const users = await User.find(query)
            .select("-password")
            .skip(skip)
            .limit(limit);

        // 6. Send Response
        res.status(200).json({
            success: true,
            total: totalUsers,
            data: users
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to retrieve users.", 
            error: error.message 
        });
    }
};

// GET /api/users/:id - Get single user
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password'); // remove password

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

    if (!['Active', 'active','inactive', 'Inactive'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User status updated', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
