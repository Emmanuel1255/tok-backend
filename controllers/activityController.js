// controllers/activityController.js
const Activity = require('../models/Activity');
const Post = require('../models/Post');

// Helper function to create activity
exports.createActivity = async (data) => {
  try {
    await Activity.create(data);
  } catch (error) {
    console.error('Activity creation error:', error);
  }
};

// Get user activities
exports.getUserActivities = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Get activities
    const activities = await Activity.find({
      $or: [
        { user: req.user.id },  // Activities by the user
        { 'metadata.targetUser': req.user.id }  // Activities targeting the user
      ]
    })
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit)
    .populate('post', 'title slug')
    .lean();

    // Get total count for pagination
    const total = await Activity.countDocuments({
      $or: [
        { user: req.user.id },
        { 'metadata.targetUser': req.user.id }
      ]
    });

    // Format activities for display
    const formattedActivities = activities.map(activity => {
      let content = '';
      
      switch (activity.type) {
        case 'post_created':
          content = `You created a new post "${activity.metadata.title}"`;
          break;
        case 'post_updated':
          content = `You updated your post "${activity.metadata.title}"`;
          break;
        case 'post_deleted':
          content = `You deleted post "${activity.metadata.title}"`;
          break;
        case 'comment_added':
          content = `You commented on "${activity.metadata.postTitle}"`;
          break;
        case 'comment_received':
          content = `Someone commented on your post "${activity.metadata.postTitle}"`;
          break;
        case 'like_given':
          content = `You liked "${activity.metadata.postTitle}"`;
          break;
        case 'like_received':
          content = `Someone liked your post "${activity.metadata.postTitle}"`;
          break;
        case 'profile_updated':
          content = 'You updated your profile';
          break;
        default:
          content = 'Unknown activity';
      }

      return {
        id: activity._id,
        content,
        type: activity.type,
        createdAt: activity.createdAt,
        post: activity.post,
        metadata: activity.metadata
      };
    });

    res.status(200).json({
      success: true,
      data: formattedActivities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get activities error:', error);
    next(error);
  }
};

// Clear all activities
exports.clearActivities = async (req, res, next) => {
  try {
    await Activity.deleteMany({ user: req.user.id });
    
    res.status(200).json({
      success: true,
      message: 'All activities cleared'
    });
  } catch (error) {
    next(error);
  }
};