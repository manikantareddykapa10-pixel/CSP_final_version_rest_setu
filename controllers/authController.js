const userModel = require('../models/userModel.js')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken');

const registerController = async (req, res) => {
    try {
      const exisitingUser = await userModel.findOne({ email: req.body.email });
      //validation
      if (exisitingUser) {
        return res.status(200).send({
          success: false,
          message: "User ALready exists",
        });
      }
      //hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(req.body.password, salt);
      req.body.password = hashedPassword;
      //rest data
      const user = new userModel(req.body);
      await user.save();
      return res.status(201).send({
        success: true,
        message: "User Registerd Successfully",
        user,
      });
    } catch (error) {
      console.log(error);
      res.status(500).send({
        success: false,
        message: "Error In Register API",
        error,
      });
    }
  };

const loginController = async (req, res) => {
  try {
    const user = await userModel.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "Invalid Credentials",
      });
    }
    //check role
    if (user.role !== req.body.role) {
      return res.status(500).send({
        success: false,
        message: "role dosent match",
      });
    }
    //compare password
    const comparePassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!comparePassword) {
      return res.status(500).send({
        success: false,
        message: "Invalid Credentials",
      });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    return res.status(200).send({
      success: true,
      message: "Login Successfully",
      token,
      user,
    });

  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In Login API",
      error,
    });
  }
};

const currentUserController = async (req, res) => {
  try {
    const user = await userModel.findOne({ _id: req.body.userId });
    return res.status(200).send({
      success: true,
      message: "User Fetched Successfully",
      user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "error in getting current user",
      error,
    });
  }
};

const updateLocationController = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const userId = req.body.userId;
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat and lng required' });
    const { getDb } = require('../config/db');
    const db = getDb();
    db.prepare('UPDATE users SET location_lat = ?, location_lng = ?, updatedAt = ? WHERE _id = ?')
      .run(lat, lng, new Date().toISOString(), userId);
    return res.status(200).json({ success: true, message: 'Location updated' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error updating location', error: error.message });
  }
};

const updateProfileController = async (req, res) => {
  try {
    const { lat, lng, profilePicture } = req.body;
    const db = require('../config/db').getDb();
    const allowedFields = ['name', 'email', 'phone', 'address', 'bloodGroup', 'isAvailable'];
    const updates = [];
    const values = [];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'email' && !req.body.email.includes('@')) {
          return res.status(400).json({ success: false, message: 'Invalid email address' });
        }
        if (field === 'bloodGroup' && !['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].includes(req.body[field])) {
          return res.status(400).json({ success: false, message: 'Invalid blood group' });
        }
        updates.push(`${field} = ?`);
        values.push(field === 'isAvailable' ? (req.body[field] ? 1 : 0) : req.body[field]);
      }
    }
    if (updates.length) {
      updates.push('updatedAt = ?');
      values.push(new Date().toISOString(), req.body.userId);
      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE _id = ?`).run(...values);
    }

    if (lat !== undefined && lng !== undefined) {
      if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
        return res.status(400).json({ success: false, message: 'Invalid location coordinates' });
      }
      db.prepare('UPDATE users SET location_lat = ?, location_lng = ?, updatedAt = ? WHERE _id = ?')
        .run(Number(lat), Number(lng), new Date().toISOString(), req.body.userId);
    }

    if (profilePicture !== undefined) {
      if (typeof profilePicture !== 'string' || profilePicture.length > 3000000 ||
          (profilePicture && !profilePicture.startsWith('data:image/'))) {
        return res.status(400).json({ success: false, message: 'Invalid profile picture' });
      }
      db.prepare('UPDATE users SET profilePicture = ?, updatedAt = ? WHERE _id = ?')
        .run(profilePicture || null, new Date().toISOString(), req.body.userId);
    }

    const user = await userModel.findOne({ _id: req.body.userId });
    return res.status(200).json({ success: true, message: 'Profile updated', user });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error updating profile', error: error.message });
  }
};

module.exports = {registerController, loginController, currentUserController, updateLocationController, updateProfileController};