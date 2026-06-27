const crypto = require("crypto");

const isProduction = process.env.NODE_ENV === "production";

const logError = (error, req, errorId) => {
  const payload = {
    level: "error",
    errorId,
    message: error.message,
    method: req.method,
    path: req.originalUrl,
    userId: req.user?.id || null,
    timestamp: new Date().toISOString(),
  };

  if (!isProduction) {
    payload.stack = error.stack;
  }

  console.error(JSON.stringify(payload));
};

const errorHandler = (error, req, res, next) => {
  const errorId = crypto.randomBytes(8).toString("hex");
  const statusCode = error.statusCode || error.status || 500;

  logError(error, req, errorId);

  res.status(statusCode).json({
    status: "error",
    message: isProduction ? "Internal server error" : error.message,
    errorId,
  });
};

module.exports = errorHandler;
