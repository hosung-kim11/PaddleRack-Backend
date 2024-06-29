const express = require("express");
const router = express.Router();

// Import Controllers
const location_controller = require("../controllers/locationController");

// Import Middleware => need to use for finish game
const { protect } = require("../middleware/authMiddleware");

// Location Routes
router.post("/create", location_controller.create_location);
router.get("/:id", location_controller.location_detail);
router.post("/:id/join", location_controller.location_join);
router.get("/:id/waiting", location_controller.location_waiting);
router.get("/:id/playing", location_controller.location_playing);
router.post("/:id/update", location_controller.location_update);
router.get("/:id/courts", location_controller.location_courts);
router.post("/:id/managePlayer", location_controller.manage_player);
router.get(
  "/:locationID/playerStatus/:userID",
  location_controller.playerStatus
);

module.exports = router;
