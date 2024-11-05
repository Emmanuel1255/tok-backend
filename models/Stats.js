// models/Stats.js
const mongoose = require('mongoose');

const StatsSchema = new mongoose.Schema({
  activeUsers: {
    count: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  publishedPosts: {
    count: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  countriesReached: {
    count: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  uptime: {
    percentage: {
      type: Number,
      default: 99.9
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
}, {
  timestamps: true
});

const Stats = mongoose.models.Stats || mongoose.model('Stats', StatsSchema);
module.exports = Stats;