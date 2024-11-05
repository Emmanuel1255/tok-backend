// middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const createUploadDirectories = () => {
  const directories = [
    'public/uploads/avatars',
    'public/uploads/posts'
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
};

// Create directories on module load
createUploadDirectories();

// Configure storage for different types of uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Check field name to determine destination
    const uploadPath = file.fieldname === 'avatar' 
      ? 'public/uploads/avatars'
      : 'public/uploads/posts';
    
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Clean the original filename
    const fileExt = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const prefix = file.fieldname === 'avatar' ? 'avatar' : 'post';
    
    // Generate filename
    const filename = `${prefix}-${uniqueSuffix}${fileExt}`;
    
    // Log filename generation
    console.log(`Generating filename: ${filename} for ${file.fieldname}`);
    
    cb(null, filename);
  }
});

// Check file type
function checkFileType(file, cb) {
  // Allowed extensions
  const filetypes = /jpeg|jpg|png|gif/;
  // Check extension
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime type
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Error: Only JPEG, JPG, PNG, and GIF images are allowed'), false);
  }
}

// Create multer instance with configuration
const upload = multer({
  storage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only allow one file per request
  },
  fileFilter: function (req, file, cb) {
    // Log incoming file
    console.log('Processing file:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype
    });
    
    checkFileType(file, cb);
  }
});

// Helper function to handle file upload errors
const handleUploadError = (err, res) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err);
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File is too large. Maximum size is 5MB'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files uploaded'
        });
      default:
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`
        });
    }
  } else if (err) {
    console.error('Upload error:', err);
    return res.status(400).json({
      success: false,
      message: err.message || 'Error uploading file'
    });
  }
};

// Create separate middleware functions for different upload types
exports.uploadAvatar = (req, res, next) => {
  console.log('Processing avatar upload request');
  
  const avatarUpload = upload.single('avatar');
  
  avatarUpload(req, res, function(err) {
    if (err) {
      return handleUploadError(err, res);
    }
    
    // Log successful upload
    if (req.file) {
      console.log('Avatar uploaded successfully:', {
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path
      });
      
      // Add file URL to request
      req.file.url = `/uploads/avatars/${req.file.filename}`;
    } else {
      console.log('No avatar file provided');
    }
    
    next();
  });
};

exports.uploadPostImage = (req, res, next) => {
  console.log('Processing post image upload request');
  
  const postImageUpload = upload.single('featuredImage');
  
  postImageUpload(req, res, function(err) {
    if (err) {
      return handleUploadError(err, res);
    }
    
    // Log successful upload
    if (req.file) {
      console.log('Post image uploaded successfully:', {
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path
      });
      
      // Add file URL to request
      req.file.url = `/uploads/posts/${req.file.filename}`;
    } else {
      console.log('No post image file provided');
    }
    
    next();
  });
};

// Export the multer instance as well in case it's needed elsewhere
exports.upload = upload;

// Export helper functions
exports.checkFileType = checkFileType;
exports.handleUploadError = handleUploadError;
exports.createUploadDirectories = createUploadDirectories;