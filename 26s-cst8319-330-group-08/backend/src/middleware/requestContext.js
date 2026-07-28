const crypto = require("crypto");

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,120}$/;

const requestContext = (req, res, next) => {
  const incoming = String(req.headers["x-request-id"] || "").trim();
  req.requestId = REQUEST_ID_PATTERN.test(incoming) ? incoming : crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  return next();
};

module.exports = requestContext;
