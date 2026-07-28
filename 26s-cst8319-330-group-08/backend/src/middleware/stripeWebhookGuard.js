const requireStripeWebhookSignature = (req, res, next) => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ status: "error", message: "Payment webhook is not configured" });
  }

  if (!req.headers["stripe-signature"]) {
    return res.status(400).json({ status: "error", message: "Stripe signature is required" });
  }

  return next();
};

module.exports = requireStripeWebhookSignature;
