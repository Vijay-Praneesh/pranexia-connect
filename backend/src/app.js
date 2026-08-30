const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const errorHandler = require("./middlewares/error.middleware");
const routes = require("./routes");
const webhookRoutes = require("./routes/webhook.routes");
const app = express();

const configuredOrigins = (process.env.FRONTEND_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// ==============================
// Global Middlewares
// ==============================

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        (process.env.NODE_ENV !== "production" &&
          configuredOrigins.length === 0)
      ) {
        return callback(null, true);
      }

      if (configuredOrigins.includes(origin)) return callback(null, true);

      const error = new Error("Origin is not allowed by CORS policy");
      error.statusCode = 403;
      return callback(error);
    },
    credentials: true,
  })
);
app.use(helmet());
app.use(compression());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(
  ["/api/v1/webhook", "/api/v1/webhooks"],
  express.json({
    verify: (req, res, buffer) => {
      req.rawBody = buffer;
    },
  }),
  webhookRoutes
);
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
