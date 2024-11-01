// utils/activityHelpers.js
const Activity = require('../models/Activity');

// Helper functions to create activities
const activityHelpers = {
  async postCreated(userId, post) {
    await Activity.create({
      user: userId,
      type: 'post_created',
      post: post._id,
      metadata: {
        title: post.title
      }
    });
  },

  async postUpdated(userId, post) {
    await Activity.create({
      user: userId,
      type: 'post_updated',
      post: post._id,
      metadata: {
        title: post.title
      }
    });
  },

  async postDeleted(userId, postTitle) {
    await Activity.create({
      user: userId,
      type: 'post_deleted',
      metadata: {
        title: postTitle
      }
    });
  },

  async commentAdded(userId, post, comment) {
    // Activity for commenter
    await Activity.create({
      user: userId,
      type: 'comment_added',
      post: post._id,
      comment: comment._id,
      metadata: {
        postTitle: post.title
      }
    });

    // Activity for post author
    if (post.author.toString() !== userId.toString()) {
      await Activity.create({
        user: post.author,
        type: 'comment_received',
        post: post._id,
        comment: comment._id,
        metadata: {
          postTitle: post.title,
          targetUser: post.author
        }
      });
    }
  },

  async likeGiven(userId, post) {
    // Activity for liker
    await Activity.create({
      user: userId,
      type: 'like_given',
      post: post._id,
      metadata: {
        postTitle: post.title
      }
    });

    // Activity for post author
    if (post.author.toString() !== userId.toString()) {
      await Activity.create({
        user: post.author,
        type: 'like_received',
        post: post._id,
        metadata: {
          postTitle: post.title,
          targetUser: post.author
        }
      });
    }
  },

  async profileUpdated(userId) {
    await Activity.create({
      user: userId,
      type: 'profile_updated'
    });
  }
};

module.exports = activityHelpers;