// models/Post.js
const mongoose = require('mongoose');
const slugify = require('slugify');

const PostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true
    // maxlength: [200, 'Title cannot be more than 200 characters']
  },
  slug: String,
  content: {
    type: String,
    required: [true, 'Please add content']
  },
  excerpt: {
    type: String
    // maxlength: [500, 'Excerpt cannot be more than 500 characters']
  },
  featuredImage: {
    type: String
  },
  category: {
    name: {
      type: String,
      required: [true, 'Please add a category name']
    },
    slug: String
  },
  tags: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  likes: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  views: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create post slug from the title
PostSchema.pre('save', function(next) {
  if (this.title) {
    this.slug = slugify(this.title, { lower: true });
  }
  if (this.category && this.category.name) {
    this.category.slug = slugify(this.category.name, { lower: true });
  }
  next();
});

// Add indexes
PostSchema.index({ title: 'text', content: 'text' });
PostSchema.index({ slug: 1 });
PostSchema.index({ 'category.slug': 1 });
PostSchema.index({ tags: 1 });
PostSchema.index({ author: 1 });

const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);
module.exports = Post;