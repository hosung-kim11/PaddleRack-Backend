const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const locationSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    courts: [
      {
        type: Schema.Types.ObjectId,
        ref: "Court",
      },
    ],

    numCourts: {
      type: Number,
      required: true,
    },

    waitingPlayers: [
      {
        type: Schema.Types.ObjectId,
        ref: "Player",
        default: [],
      },
    ],
    playingPlayers: [
      {
        type: Schema.Types.ObjectId,
        ref: "Player",
        default: [],
      },
    ],
    isFull: {
      type: Boolean,
      default: false,
    },
    admin: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for court's URL
locationSchema.virtual("url").get(function () {
  // We don't use an arrow function as we'll need the this object
  return `/api/location/${this._id}`;
});

const Location = mongoose.model("Location", locationSchema);
module.exports = Location;
