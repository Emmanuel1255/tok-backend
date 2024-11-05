// controllers/statsController.js
const Stats = require('../models/Stats');
const User = require('../models/User');
const Post = require('../models/Post');

// Helper function to format numbers with K/M suffix
const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M+';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K+';
  }
  return num + '+';
};

exports.getStats = async (req, res, next) => {
  try {
    // Get real-time counts
    const userCount = await User.countDocuments();
    const postCount = await Post.countDocuments({ status: 'published' });
    
    // Get or create stats document
    let stats = await Stats.findOne();
    if (!stats) {
      stats = await Stats.create({
        activeUsers: { count: userCount },
        publishedPosts: { count: postCount },
        countriesReached: { count: 150 }, // You might want to track this based on user locations
        uptime: { percentage: 99.9 }
      });
    } else {
      // Update stats with real counts
      stats.activeUsers.count = userCount;
      stats.publishedPosts.count = postCount;
      stats.activeUsers.lastUpdated = Date.now();
      stats.publishedPosts.lastUpdated = Date.now();
      await stats.save();
    }

    // Format the response
    const formattedStats = [
      { 
        label: 'Active users', 
        value: formatNumber(stats.activeUsers.count)
      },
      { 
        label: 'Blog posts published', 
        value: formatNumber(stats.publishedPosts.count)
      },
      { 
        label: 'Countries reached', 
        value: formatNumber(stats.countriesReached.count)
      },
      { 
        label: 'Uptime', 
        value: stats.uptime.percentage.toFixed(1) + '%'
      }
    ];

    res.status(200).json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    next(error);
  }
};

// Optional: Add method to update countries reached
exports.updateCountriesReached = async (req, res, next) => {
  try {
    const { count } = req.body;
    
    const stats = await Stats.findOne();
    if (stats) {
      stats.countriesReached.count = count;
      stats.countriesReached.lastUpdated = Date.now();
      await stats.save();
    }

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};