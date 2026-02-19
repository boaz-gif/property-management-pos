const cache = new Map();

function cacheMiddleware(req, res, next) {
  const key = req.originalUrl;
  if (cache.has(key)) {
    return res.json(cache.get(key));
  }
  res.sendJson = res.json;
  res.json = (data) => {
    cache.set(key, data);
    res.sendJson(data);
  };
  next();
}

module.exports = cacheMiddleware;