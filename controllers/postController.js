// controllers/postController.js
const Post = require('../models/Post');
const User = require('../models/User');
const path = require('path');
const fs = require('fs').promises;
const activityHelpers = require('../utils/activityHelpers');

exports.getPosts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, category, tag, search, status } = req.query;

    const query = {};

    // Filter by category if provided
    if (category) {
      // Use slug for category matching if it's stored as an object
      query['category.slug'] = category;
    }

    // Filter by tag if provided
    if (tag) {
      query.tags = tag;
    }

    // Full-text search on title and content
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by status if provided (e.g., "published", "draft")
    if (status) {
      query.status = status;
    }

    // Fetch posts based on the constructed query
    const posts = await Post.find(query)
      .populate('author', 'firstName lastName username avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .exec();

    // Get total count of posts for pagination
    const count = await Post.countDocuments(query);

    // Return the results
    res.status(200).json({
      success: true,
      data: posts,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    next(error);
  }
};

exports.getPost = async (req, res, next) => {
  try {
    // First find post without incrementing views
    const post = await Post.findById(req.params.id)
      .populate('author', 'firstName lastName username avatar')
      .populate('comments.user', 'firstName lastName username avatar');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Increment views using findOneAndUpdate to avoid race conditions
    // The {new: true} option returns the updated document
    const updatedPost = await Post.findOneAndUpdate(
      { _id: post._id },
      { $inc: { views: 1 } },
      { new: true }
    ).populate('author', 'firstName lastName username avatar')
      .populate('comments.user', 'firstName lastName username avatar');

    res.status(200).json({
      success: true,
      data: updatedPost
    });
  } catch (error) {
    next(error);
  }
};


exports.createPost = async (req, res, next) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);

    // Validate required fields
    if (!req.body.title || !req.body.content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    let categoryData;
    try {
      categoryData = req.body.category ? JSON.parse(req.body.category) : null;
    } catch (error) {
      console.error('Category parsing error:', error);
      return res.status(400).json({
        success: false,
        message: 'Invalid category format'
      });
    }

    if (!categoryData || !categoryData.name) {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }

    // Handle tags
    let tagsArray = [];
    if (req.body.tags) {
      // If tags is sent as 'tags[]'
      if (Array.isArray(req.body['tags[]'])) {
        tagsArray = req.body['tags[]'];
      }
      // If tags is sent as a single tag
      else if (req.body['tags[]']) {
        tagsArray = [req.body['tags[]']];
      }
      // If tags is sent as JSON string
      else if (typeof req.body.tags === 'string') {
        try {
          tagsArray = JSON.parse(req.body.tags);
        } catch (e) {
          tagsArray = [req.body.tags];
        }
      }
    }

    // Create post data object
    const postData = {
      title: req.body.title.trim(),
      content: req.body.content,
      excerpt: req.body.excerpt 
        ? req.body.excerpt.trim() 
        : req.body.content.substring(0, 150).trim() + '...',
      category: {
        name: categoryData.name,
        slug: categoryData.name.toLowerCase().replace(/\s+/g, '-')
      },
      tags: tagsArray,
      status: req.body.status || 'draft',
      author: req.user._id, // Make sure you're using the correct user ID field
      views: 0,
      likes: [],
      comments: []
    };

    // Add featured image if uploaded
    if (req.file) {
      postData.featuredImage = `/uploads/posts/${req.file.filename}`;
    }

    // Create the post
    const post = await Post.create(postData);

    // Populate author details
    await post.populate({
      path: 'author',
      select: 'firstName lastName username avatar'
    });

    // Log the created post
    console.log('Created post:', post);

    // Track post creation activity
    await activityHelpers.postCreated(req.user._id, post);

    res.status(201).json({
      success: true,
      data: post,
      message: 'Post created successfully'
    });

  } catch (error) {
    console.error('Create post error:', error);

    // Clean up uploaded file if post creation fails
    if (req.file) {
      const filePath = path.join(__dirname, '..', 'public', 'uploads', 'posts', req.file.filename);
      await fs.unlink(filePath).catch(err => 
        console.error('Error deleting file:', err)
      );
    }

    // Send appropriate error response
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A post with this title already exists'
      });
    }

    next(error);
  }
};

exports.updatePost = async (req, res, next) => {
  try {
    let post = await Post.findById(req.params.id);

    if (!post) {
      if (req.file) {
        await fs.unlink(req.file.path).catch(console.error);
      }
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
      if (req.file) {
        await fs.unlink(req.file.path).catch(console.error);
      }
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this post'
      });
    }

    const updateData = {};

    if (req.body.title) updateData.title = req.body.title;
    if (req.body.content) updateData.content = req.body.content;
    if (req.body.excerpt) updateData.excerpt = req.body.excerpt;
    if (req.body.status) updateData.status = req.body.status;

    // Properly handle category without JSON.parse if it's already an object
    if (req.body.category) {
      const categoryData = typeof req.body.category === 'string' 
        ? JSON.parse(req.body.category) 
        : req.body.category;

      updateData.category = {
        name: categoryData.name,
        slug: categoryData.name.toLowerCase().replace(/\s+/g, '-')
      };
    }

    if (req.body.tags) {
      updateData.tags = Array.isArray(req.body.tags) ? req.body.tags : [req.body.tags];
    }

    if (req.file) {
      if (post.featuredImage) {
        const oldImagePath = path.join('public', post.featuredImage);
        await fs.unlink(oldImagePath).catch(console.error);
      }
      updateData.featuredImage = `/uploads/posts/${req.file.filename}`;
    }

    post = await Post.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
      .populate('author', 'firstName lastName username avatar');

      await activityHelpers.postUpdated(req.user._id, post);

    res.status(200).json({
      success: true,
      data: post
    });
  } catch (error) {
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }
    next(error);
  }
};





exports.deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete this post'
      });
    }

    // Delete featured image if it exists
    if (post.featuredImage) {
      const imagePath = path.join('public', post.featuredImage);
      await fs.unlink(imagePath).catch(console.error);
    }

    // Use findByIdAndDelete instead of remove()
    await Post.findByIdAndDelete(req.params.id);

    // Store post title before deletion for activity tracking
    const postTitle = post.title;

    // Track post deletion activity
    await activityHelpers.postDeleted(req.user._id, postTitle);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

exports.likePost = async (req, res, next) => {
    try {
      const post = await Post.findById(req.params.id);
  
      if (!post) {
        return res.status(404).json({
          message: 'Post not found'
        });
      }
  
      // Check if post has already been liked
      if (post.likes.includes(req.user.id)) {
        // Unlike the post
        const index = post.likes.indexOf(req.user.id);
        post.likes.splice(index, 1);
      } else {
        // Like the post
        post.likes.push(req.user.id);
        // Only track activity when liking, not unliking
      await activityHelpers.likeGiven(req.user._id, post);
      }
  
      await post.save();
  
      res.status(200).json({
        success: true,
        data: post
      });
    } catch (error) {
      next(error);
    }
  };
  
  exports.commentOnPost = async (req, res, next) => {
    try {
      // Validate request
      const { content } = req.body;
      if (!content || content.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Comment content is required'
        });
      }
  
      if (content.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Comment is too long. Maximum 1000 characters allowed.'
        });
      }
  
      // Debug log
      console.log('Comment request:', {
        postId: req.params.id,
        userId: req.user?.id,
        content
      });
  
      // Find post
      const post = await Post.findById(req.params.id);
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }
  
      // Create new comment
      const newComment = {
        user: req.user.id,
        content: content.trim(),
        createdAt: Date.now()
      };
  
      // Add comment to post
      post.comments.unshift(newComment);
      await post.save();
  
      // Populate user information for the new comment
      const populatedPost = await Post.findById(post._id)
        .populate({
          path: 'comments.user',
          select: 'firstName lastName username avatar'
        });
  
      const addedComment = populatedPost.comments[0];

      // Track comment activity
    await activityHelpers.commentAdded(req.user._id, post, newComment);
  
      res.status(201).json({
        success: true,
        data: addedComment,
        message: 'Comment added successfully'
      });
  
    } catch (error) {
      console.error('Comment error:', error);
      next(error);
    }
  };
  
  // Add comment validation middleware
  const validateComment = (req, res, next) => {
    const { content } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required'
      });
    }
  
    if (content.length > 1000) { // Add any length restriction you want
      return res.status(400).json({
        success: false,
        message: 'Comment is too long. Maximum 1000 characters allowed.'
      });
    }
  
    next();
  };
  
  // Add debug logging middleware
  const commentDebug = (req, res, next) => {
    console.log('Comment request:', {
      postId: req.params.id,
      userId: req.user?.id,
      content: req.body.content
    });
    next();
  };
  
  exports.deleteComment = async (req, res, next) => {
    try {
      const post = await Post.findById(req.params.id);
  
      if (!post) {
        return res.status(404).json({
          message: 'Post not found'
        });
      }
  
      const comment = post.comments.find(
        comment => comment._id.toString() === req.params.commentId
      );
  
      if (!comment) {
        return res.status(404).json({
          message: 'Comment not found'
        });
      }
  
      // Make sure user is comment author or post author
      if (
        comment.user.toString() !== req.user.id &&
        post.author.toString() !== req.user.id &&
        req.user.role !== 'admin'
      ) {
        return res.status(401).json({
          message: 'Not authorized to delete this comment'
        });
      }
  
      // Get remove index
      const removeIndex = post.comments
        .map(comment => comment._id.toString())
        .indexOf(req.params.commentId);
  
      post.comments.splice(removeIndex, 1);
      await post.save();
  
      res.status(200).json({
        success: true,
        data: post.comments
      });
    } catch (error) {
      next(error);
    }
  };
  
  exports.getMyPosts = async (req, res, next) => {
    try {
      const { page = 1, limit = 10, status } = req.query;
  
      const query = { author: req.user.id };
  
      if (status) {
        query.status = status;
      }
  
      const posts = await Post.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .exec();
  
      const count = await Post.countDocuments(query);
  
      res.status(200).json({
        success: true,
        data: posts,
        totalPages: Math.ceil(count / limit),
        currentPage: page
      });
    } catch (error) {
      next(error);
    }
  };

  exports.editComment = async (req, res, next) => {
    try {
      const post = await Post.findById(req.params.id);
  
      if (!post) {
        return res.status(404).json({
          success: false,
          message: 'Post not found'
        });
      }
  
      const comment = post.comments.id(req.params.commentId);
  
      if (!comment) {
        return res.status(404).json({
          success: false,
          message: 'Comment not found'
        });
      }
  
      // Check if user is comment author
      if (comment.user.toString() !== req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized to edit this comment'
        });
      }
  
      comment.content = req.body.content;
      await post.save();
  
      const updatedPost = await Post.findById(post._id)
        .populate('comments.user', 'firstName lastName username avatar');
  
      const updatedComment = updatedPost.comments.id(comment._id);
  
      res.status(200).json({
        success: true,
        data: updatedComment
      });
    } catch (error) {
      next(error);
    }
  };