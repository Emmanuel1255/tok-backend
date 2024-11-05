// controllers/authController.js
const { validationResult } = require('express-validator');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config/config');



// Helper function for token generation and response
const sendTokenResponse = (user, statusCode, res) => {
  try {
    // Create token
    const token = jwt.sign(
      { id: user._id },
      config.jwtSecret,
      { 
        expiresIn: config.jwtExpire 
      }
    );

    // Cookie options
    const options = {
      expires: new Date(Date.now() + (config.jwtCookieExpire * 24 * 60 * 60 * 1000)),
      httpOnly: true
    };

    if (process.env.NODE_ENV === 'production') {
      options.secure = true;
    }

    // Send response
    return res
      .status(statusCode)
      .cookie('token', token, options)
      .json({
        success: true,
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          username: user.username,
          role: user.role
        }
      });
  } catch (error) {
    console.error('Token generation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error generating authentication token'
    });
  }
};

exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, username, password } = req.body;

    // Check if user exists
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with that email or username'
      });
    }

    // Create user
    user = await User.create({
      firstName,
      lastName,
      email,
      username,
      password
    });

    // Send token response
    return sendTokenResponse(user, 201, res);

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Create token
    const token = jwt.sign(
      { id: user._id },
      config.jwtSecret,
      { expiresIn: config.jwtExpire }
    );

    // Create cookie
    const options = {
      expires: new Date(
        Date.now() + config.jwtCookieExpire * 24 * 60 * 60 * 1000
      ),
      httpOnly: true
    };

    if (process.env.NODE_ENV === 'production') {
      options.secure = true;
    }

    res.status(200)
      .cookie('token', token, options)
      .json({
        success: true,
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          username: user.username,
          role: user.role
        }
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};



exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

exports.updateDetails = async (req, res, next) => {
  try {
    // Fields to allow for update
    const fieldsToUpdate = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      username: req.body.username,
      bio: req.body.bio,
      interests: req.body.interests
    };

    // Add avatar if file was uploaded
    if (req.file) {
      fieldsToUpdate.avatar = req.file.filename;
    }

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key => 
      fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    // Check if email is being updated and if it already exists
    if (fieldsToUpdate.email) {
      const emailExists = await User.findOne({ 
        email: fieldsToUpdate.email,
        _id: { $ne: req.user.id }  // Exclude current user
      });
      
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Check if username is being updated and if it already exists
    if (fieldsToUpdate.username) {
      const usernameExists = await User.findOne({ 
        username: fieldsToUpdate.username,
        _id: { $ne: req.user.id }  // Exclude current user
      });
      
      if (usernameExists) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists'
        });
      }
    }

    // Get the old user data to handle avatar deletion
    const oldUser = await User.findById(req.user.id);
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If there's a new avatar and an old one exists, delete the old one
    if (req.file && oldUser.avatar && oldUser.avatar !== 'default-avatar.jpg') {
      const fs = require('fs');
      const path = require('path');
      const oldAvatarPath = path.join(__dirname, '../public/uploads/avatars', oldUser.avatar);
      
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlink(oldAvatarPath, (err) => {
          if (err) console.error('Error deleting old avatar:', err);
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        bio: user.bio,
        interests: user.interests,
        avatar: user.avatar,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Update details error:', error);
    next(error);
  }
};

exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    if (!(await user.matchPassword(req.body.currentPassword))) {
      return res.status(401).json({
        message: 'Password is incorrect'
      });
    }

    user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

exports.updateInterests = async (req, res, next) => {
  try {
    const { interests } = req.body;

    if (!interests || !Array.isArray(interests)) {
      return res.status(400).json({
        message: 'Please provide an array of interests'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { interests },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

