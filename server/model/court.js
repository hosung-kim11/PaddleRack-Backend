const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const courtSchema = new Schema({
  location: {
    type: Schema.Types.ObjectId,
    ref: "Location",
    required: true,
  },
  admin: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  courtNumber: {
    type: Number,
    required: true,
  },
  available: {
    type: Boolean,
    default: true,
  },
  currentPlayers: [
    {
      type: Schema.Types.ObjectId,
      ref: "Player",
      required: true, // new - can remove if works
    },
  ],
});

// Virtual for court's URL
courtSchema.virtual("url").get(function () {
  // We don't use an arrow function as we'll need the this object
  return `/api/location/court/${this._id}`;
});

const Court = mongoose.model("Court", courtSchema);
module.exports = Court;
