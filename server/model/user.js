const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name"],
    },
    email: {
      type: String,
      required: [true, "Please add an email"],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Please add a password"],
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for court's URL
userSchema.virtual("url").get(function () {
  // We don't use an arrow function as we'll need the this object
  return `/api/user/${this._id}`;
});

const User = mongoose.model("User", userSchema);

module.exports = User;
