const Court = require("../model/court");
const asyncHandler = require("express-async-handler");
const { body, validationResult } = require("express-validator");
const Player = require("../model/player");
const Location = require("../model/location");
const courtManagement = require("./courtManagement");
const socketIo = require("socket.io");

// @desc    Create a new court location
// @route   POST /api/location/create
// @access  Public
exports.create_location = [
  asyncHandler(async (req, res, next) => {
    try {
      // Create new location
      const location = new Location({
        name: req.body.name,
        numCourts: req.body.num,
        admin: req.body.id,
      });
      await location.save();

      // Creat the court objects for the location
      const numberOfCourts = location.numCourts;
      const courts = [];
      for (let i = 1; i <= numberOfCourts; i++) {
        const court = new Court({
          location: location._id,
          courtNumber: i,
          available: true,
          currentPlayers: [],
          admin: req.body.id,
        });
        await court.save();
        courts.push(court._id);
      }
      location.courts = courts;
      await location.save();

      res.status(201).json({ id: location._id, name: location.name });
    } catch (error) {
      console.error("Error Creating Location:");
      res.status(500);
      next(error);
    }
  }),
];

// @desc    Details on a location
// @route   GET /api/location/:id
// @access  Public
exports.location_detail = asyncHandler(async (req, res, next) => {
  const location = await Location.findById(req.params.id);

  if (location === null) {
    const error = new Error("Location not found");
    error.status = 404;
    console.error("Location not found");
    return next(error);
  }

  res.status(201).json(location);
});

// @desc    Player joins the queue at a location
// @route   POST /api/location/:id/join
// @access  Public
exports.location_join = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const { numPlayers, userID, name } = req.body;
    const location = await Location.findById(id);

    // Check if user already exists
    const playerExists = await Player.findOne({ userHost: userID });

    if (playerExists) {
      res.status(400);
      throw new Error("Player already at location");
    }

    // Create the player
    const player = new Player({
      name: name + "(" + numPlayers + ") ",
      numPlayers: numPlayers,
      userHost: userID,
      locationID: id,
    });
    await player.save();

    location.waitingPlayers.push(player._id);
    await location.save();
    await courtManagement.updateCourtAndPlayerStatus(id);

    // Broadcast the new status to all users in the same location room
    req.io
      .to(id)
      .emit("statusChanged", { message: "New update - player joined queue" });

    res.status(200).send(`Player ${name} added to the queue`);
  } catch (error) {
    console.error("Error adding player to queue:");
    res.status(500);
    next(error);
  }
});

// @desc    Get the players waiting at a location
// @route   GET /api/location/:id/waiting
// @access  Public
exports.location_waiting = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const location = await Location.findById(id);

  try {
    const players = await Player.find({
      _id: { $in: location.waitingPlayers },
    });
    res.status(200).json(players);
  } catch (error) {
    console.error("Error getting waiting players:");
    res.status(500);
    next(error);
  }
});

// @desc    Get the players playing at a location
// @route   GET /api/location/:id/playing
// @access  Public
exports.location_playing = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const location = await Location.findById(id);

  try {
    const players = await Player.find({
      _id: { $in: location.playingPlayers },
    });
    res.status(200).json(players);
  } catch (error) {
    console.error("Error getting playing players:");
    res.status(500);
    next(error);
  }
});

// Handle update Playing and Waiting players on POST - /:id/update
// @desc    Update the waiting and playing players at a location
// @route   POST /api/location/:id/update
// @access  Public
exports.location_update = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  try {
    await courtManagement.updateCourtAndPlayerStatus(id);
    res.json({ message: "Status updated successfully" });
  } catch (err) {
    console.error("Error updating status:");
    res.status(500);
    next(error);
  }
});

// @desc    Get a list of courts at a location
// @route   GET /api/location/:id/courts
// @access  Public
exports.location_courts = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  try {
    const location = await Location.findById(id).populate({
      path: "courts",
      populate: { path: "currentPlayers" },
    });
    res.json(location.courts);
  } catch (err) {
    console.error("Error getting courts at location (populated):");
    res.status(500);
    next(error);
  }
});

// @desc    Manage Queue and Playing Players
// @route   POST /api/location/:id/manage-players
// @access  Public?
exports.manage_player = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  const locationId = req.params.id;

  const player = await Player.findOne({
    userHost: userId,
    locationID: locationId,
  });

  if (player) {
    if (player.currentCourt) {
      // End game and delete player
      // First, find and update the court
      const court = await Court.findById(player.currentCourt);
      if (court) {
        courtPlayers = court.currentPlayers; // find all players on court
        court.currentPlayers = []; // Set current players to an empty array
        court.available = true; // Mark the court as available
        await court.save();
      }

      // Delete all players on court
      for (let i = 0; i < courtPlayers.length; i++) {
        await Player.findByIdAndDelete(courtPlayers[i]);
      }
      res.json({
        message: "Game ended and player deleted, court cleared",
        status: "none",
      });
      // Broadcast the new status to all users in the same location room
      req.io
        .to(locationId)
        .emit("statusChanged", { message: "New update - player end game" });
    } else {
      // Remove from queue and delete player
      await Player.findByIdAndDelete(player._id);
      // Broadcast the new status to all users in the same location room
      req.io
        .to(locationId)
        .emit("statusChanged", { message: "New update - player leave queue" });

      res.json({
        message: "Removed from queue and player deleted",
        status: "none",
      });
    }
  } else {
    res.send({ message: "Player not found", status: "none" });
  }
});

// @desc    Get the status of if user is at location
// @route   POST /api/location/:locationID/playerStatus/:userID
// @access  Public
exports.playerStatus = asyncHandler(async (req, res) => {
  const userId = req.params.userID;
  const locationId = req.params.locationID;
  const player = await Player.findOne({
    userHost: userId,
    locationID: locationId,
  });

  if (player) {
    let status = "none";
    if (player.currentCourt) {
      status = "playing";
    } else {
      status = "queued";
    }
    res.json({ status: status });
  } else {
    res.send({ status: "none" });
  }
});
