// routes/posts.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { uploadPostImage } = require('../middleware/upload');
const {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  likePost,
  commentOnPost,
  deleteComment,
  getMyPosts,
  editComment
} = require('../controllers/postController');

// Public routes
router.get('/', getPosts);
router.get('/:id', getPost);

// Protected routes
router.use(protect);

// Post routes with file upload
router.post('/', uploadPostImage, createPost);
router.put('/:id', uploadPostImage, updatePost);
router.delete('/:id', deletePost);

// Like/Unlike routes
router.put('/:id/like', likePost);

// Comment routes
router.post('/:id/comments', commentOnPost);
router.delete('/:id/comments/:commentId', deleteComment);
router.put('/:id/comments/:commentId', protect, editComment);

// My posts
router.get('/me/posts', getMyPosts);

module.exports = router;