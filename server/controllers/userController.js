const User = require("../model/user");
const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Location = require("../model/location.js");
const Court = require("../model/court.js");
const Player = require("../model/player.js");
const socketIo = require("socket.io");

// @desc    Register a new user
// @route   POST /api/user
// @access  Public
exports.register_user = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please fill in all fields bruh");
  }

  // Check if user already exists
  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

// @desc    Authenticate a user
// @route   POST /api/user/login
// @access  Public
exports.login_user = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  // Check for use email
  const user = await User.findOne({ email });

  if (user && (await bcrypt.compare(password, user.password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error("Invalid credentials");
  }
});

// @desc    Get user data
// @route   GET /api/user/dashboard
// @access  Private
exports.dashboard = asyncHandler(async (req, res) => {
  try {
    const locations = await Location.find({ admin: req.user._id });
    res.json(locations);
  } catch (error) {
    res
      .status(500)
      .send({ message: "Error fetching locations", error: error.message });
  }
});

// @desc    Delete a location and all associated queues
// @route   DELETE /api/user/location/:locationId
// @access  Private
exports.deleteLocation = asyncHandler(async (req, res) => {
  const { locationId } = req.params;
  try {
    const location = await Location.find({
      id: locationId,
      admin: req.user._id,
    });

    await Court.deleteMany({ location: locationId });
    await Player.deleteMany({ locationID: locationId });
    await Location.deleteOne({ _id: locationId });

    res.send({
      message: "Location and all related courts and players deleted",
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Failed to delete location", error: error.message });
  }
});

// Generate a JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// @desc    End game on a court
// @route   POST /api/user/:courtId/finish
// @access  Private
exports.finish = asyncHandler(async (req, res, next) => {
  const { courtId } = req.params;
  try {
    // End game and delete player
    // First, find and update the court
    const court = await Court.findById(courtId);
    if (court) {
      const locationId = court.location.toString();
      const courtPlayers = court.currentPlayers; // find all players on court
      court.currentPlayers = []; // Set current players to an empty array
      court.available = true; // Mark the court as available

      // Delete all players on court
      for (let i = 0; i < courtPlayers.length; i++) {
        await Player.findByIdAndDelete(courtPlayers[i]);
      }

      await court.save();

      res.json({
        message: "Game ended and player deleted, court cleared",
        status: "none",
      });
      // Broadcast the new status to all users in the same location room
      req.io
        .to(locationId)
        .emit("statusChanged", { message: "New update - player end game" });
    } else {
      res.status(404);
      throw new Error("Court not found");
    }
  } catch (err) {
    console.error(`Error ending game on court ${courtId}: ${err}`);
    res.status(500);
    next(err);
  }
});
