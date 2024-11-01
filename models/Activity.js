// models/Activity.js
const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'post_created',
      'post_updated',
      'post_deleted',
      'comment_added',
      'comment_received',
      'like_given',
      'like_received',
      'profile_updated'
    ],
    required: true
  },
  post: {
    type: mongoose.Schema.ObjectId,
    ref: 'Post'
  },
  comment: {
    type: mongoose.Schema.ObjectId,
    ref: 'Post.comments'
  },
  metadata: {
    title: String,
    content: String,
    postTitle: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for better query performance
ActivitySchema.index({ user: 1, createdAt: -1 });

const Activity = mongoose.models.Activity || mongoose.model('Activity', ActivitySchema);
module.exports = Activity;