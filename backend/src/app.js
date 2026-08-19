const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const errorHandler = require("./middlewares/error.middleware");
const routes = require("./routes");
const app = express();

// ==============================
// Global Middlewares
// ==============================

app.use(cors());
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/api/v1", routes);
// ==============================
// API Routes
// ==============================


// ==============================
// 404 Route
// ==============================

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API Route Not Found",
  });
});

app.use(errorHandler);

module.exports = app;