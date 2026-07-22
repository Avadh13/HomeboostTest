const sanitizeErrorResponse = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (payload) => {
    if (
      process.env.NODE_ENV === "production" &&
      res.statusCode >= 500 &&
      payload &&
      typeof payload === "object" &&
      !Array.isArray(payload)
    ) {
      const sanitized = {
        ...payload,
        status: "error",
        message: "Internal server error",
      };

      delete sanitized.error;
      delete sanitized.stack;
      delete sanitized.sql;
      delete sanitized.sqlMessage;
      delete sanitized.code;

      return originalJson(sanitized);
    }

    return originalJson(payload);
  };

  next();
};

module.exports = sanitizeErrorResponse;
