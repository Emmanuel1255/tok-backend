// controllers/userController.js
const User = require('../models/User');
const Post = require('../models/Post');

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).select('-password');

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    await user.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('-password')
      .populate({
        path: 'posts',
        select: 'title content category tags status createdAt views likes comments',
        options: { sort: { createdAt: -1 } }
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const stats = {
      totalPosts: user.posts ? user.posts.length : 0,
      totalLikes: user.posts ? user.posts.reduce((acc, post) => acc + post.likes.length, 0) : 0,
      totalComments: user.posts ? user.posts.reduce((acc, post) => acc + post.comments.length, 0) : 0
    };

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          email: user.email,
          bio: user.bio,
          avatar: user.avatar,
          interests: user.interests,
          role: user.role,
          createdAt: user.createdAt
        },
        posts: user.posts,
        stats
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    next(error);
  }
};

// New function to save user interests


exports.saveInterests = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please log in.',
      });
    }

    const { interests } = req.body;

    if (!Array.isArray(interests) || interests.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least 3 interests',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { interests },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
      message: 'Interests saved successfully',
    });
  } catch (error) {
    console.error('Error saving interests:', error);
    next(error);
  }
};


exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id; // Make sure `req.user.id` is set from authentication middleware
    const updateData = req.body;
    console.log(updateData);

    // If there's a new avatar, include it in the update data
    if (req.file) {
      updateData.avatar = req.file.filename; // Assuming you're using multer for file uploads
    }

    // Use the static method to update
    const updatedUser = await User.updateUserById(userId, updateData);

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    next(error);
  }
};


exports.getUserStats = async (req, res, next) => {
  try {
    // Get total posts count
    const totalPosts = await Post.countDocuments({
      author: req.user.id
    });

    // Get total views across all posts
    const postsWithViews = await Post.aggregate([
      {
        $match: {
          author: req.user._id
        }
      },
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: { $size: '$likes' } },
          totalComments: { $sum: { $size: '$comments' } }
        }
      }
    ]);

    // Get posts by status
    const postsByStatus = await Post.aggregate([
      {
        $match: {
          author: req.user._id
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get post statistics by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const postsByMonth = await Post.aggregate([
      {
        $match: {
          author: req.user._id,
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          views: { $sum: '$views' },
          likes: { $sum: { $size: '$likes' } },
          comments: { $sum: { $size: '$comments' } }
        }
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1
        }
      }
    ]);

    // Get recent engagement stats (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentEngagement = await Post.aggregate([
      {
        $match: {
          author: req.user._id,
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          views: { $sum: '$views' },
          likes: { $sum: { $size: '$likes' } },
          comments: { $sum: { $size: '$comments' } }
        }
      }
    ]);

    // Format the response
    const stats = {
      overview: {
        totalPosts,
        totalViews: postsWithViews[0]?.totalViews || 0,
        totalLikes: postsWithViews[0]?.totalLikes || 0,
        totalComments: postsWithViews[0]?.totalComments || 0
      },
      postsByStatus: Object.fromEntries(
        postsByStatus.map(item => [item._id, item.count])
      ),
      monthlyStats: postsByMonth.map(month => ({
        year: month._id.year,
        month: month._id.month,
        posts: month.count,
        views: month.views,
        likes: month.likes,
        comments: month.comments
      })),
      recentEngagement: {
        last30Days: {
          views: recentEngagement[0]?.views || 0,
          likes: recentEngagement[0]?.likes || 0,
          comments: recentEngagement[0]?.comments || 0
        }
      }
    };

    // Get engagement rate (likes + comments / views * 100)
    if (stats.overview.totalViews > 0) {
      stats.overview.engagementRate = (
        ((stats.overview.totalLikes + stats.overview.totalComments) / 
        stats.overview.totalViews) * 100
      ).toFixed(2);
    } else {
      stats.overview.engagementRate = 0;
    }

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    next(error);
  }
};