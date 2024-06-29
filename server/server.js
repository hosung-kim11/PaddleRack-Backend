const express = require("express");
const dotenv = require("dotenv").config();
const port = process.env.PORT || 8080;
const colors = require("colors"); // colors in terminal
const connectDB = require("./config/db");
const { errorHandler } = require("./middleware/errorMiddleware");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");

// connect to the database
connectDB();
// require routers
const locationRouter = require("./routes/locationRoutes");
const userRouter = require("./routes/userRouters");
// create an App
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Setup and Error Handling
app.use(errorHandler);
app.use(
  cors({
    orgin: "http://localhost:8080",
    credentials: true,
    methods: ["GET", "POST", "DELETE"],
  })
);
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Middleware to attach io to the request
app.use((req, res, next) => {
  req.io = io;
  next();
});

io.on("connection", (socket) => {
  socket.on("joinLocationRoom", (locationId) => {
    socket.join(locationId);
  });

  socket.on("leaveLocationRoom", (locationId) => {
    socket.leave(locationId);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// routes
app.use("/api/location", locationRouter);
app.use("/api/user", userRouter);

server.listen(port, () => console.log(`Server started on port ${port}`));
