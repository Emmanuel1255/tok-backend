// middleware/statsCache.js
const NodeCache = require('node-cache');

// Cache stats for 5 minutes
const statsCache = new NodeCache({ stdTTL: 300 });

exports.cacheStats = (req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }

  const key = `stats-${req.user.id}`;
  const cachedData = statsCache.get(key);

  if (cachedData) {
    return res.status(200).json({
      success: true,
      data: cachedData,
      cached: true
    });
  }

  // Modify response to cache data before sending
  const originalJson = res.json;
  res.json = function(data) {
    if (data.success && data.data) {
      statsCache.set(key, data.data);
    }
    return originalJson.call(this, data);
  };

  next();
};

// Add cache invalidation helper
exports.invalidateStatsCache = (userId) => {
  statsCache.del(`stats-${userId}`);
};