const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const playerSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    numPlayers: {
      type: Number,
      default: 1,
      required: true,
    },
    currentCourt: {
      type: Schema.Types.ObjectId,
      ref: "Court",
    },
    userHost: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    locationID: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for court's URL
playerSchema.virtual("url").get(function () {
  // We don't use an arrow function as we'll need the this object
  return `/api/player/${this._id}`;
});

const Player = mongoose.model("Player", playerSchema);

module.exports = Player;
