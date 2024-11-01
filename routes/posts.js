// routes/posts.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  likePost,
  commentOnPost,
  deleteComment,
  getMyPosts
} = require('../controllers/postController');

// Public routes
router.get('/', getPosts);
router.get('/:id', getPost);

// Protected routes
router.use(protect);

// Post routes with file upload
router.post('/', upload, createPost);
router.put('/:id', upload, updatePost);
router.delete('/:id', deletePost);

// Like/Unlike routes
router.put('/:id/like', likePost);

// Comment routes
router.post('/:id/comments', commentOnPost);
router.delete('/:id/comments/:commentId', deleteComment);

// My posts
router.get('/me/posts', getMyPosts);

module.exports = router;