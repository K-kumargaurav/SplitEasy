const store = new Map();
const WINDOW_MS = 60 * 1000;

const idempotency = (req, res, next) => {
  const key = req.headers["x-idempotency-key"];
  if (!key) return next();

  const storeKey = `${req.user._id}:${key}`;
  const now = Date.now();

  if (Math.random() < 0.05) {
    for (const [k, v] of store) {
      if (v < now) store.delete(k);
    }
  }

  if (store.has(storeKey)) {
    return res.status(409).json({ message: "Duplicate request — please try again" });
  }

  store.set(storeKey, now + WINDOW_MS);
  next();
};

module.exports = idempotency;
