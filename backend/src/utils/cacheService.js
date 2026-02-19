const { createClient } = require('redis');

let client = null;
let isConnected = false;

const init = async () => {
  if (process.env.REDIS_URL && !client) {
    console.log('[Cache] Initializing Redis client...');
    try {
      client = createClient({ url: process.env.REDIS_URL });

      client.on('error', (err) => {
        console.error('[Cache] Redis Client Error', err);
        isConnected = false; // Mark down on error
      });

      client.on('connect', () => {
        isConnected = true;
        console.log('[Cache] Redis Connected');
      });

      client.on('reconnecting', () => {
        console.log('[Cache] Redis Reconnecting...');
      });

      await client.connect();
    } catch (err) {
      console.error('[Cache] Redis Init Failed', err);
      // Don't crash, just proceed without caching
    }
  } else {
    console.log('[Cache] usage skipped (REDIS_URL not set)');
  }
};

const get = async (key) => {
  if (!isConnected || !client) return null;
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error(`[Cache] Get Error (${key})`, err);
    return null;
  }
};

const set = async (key, value, ttlSec = 60) => {
  if (!isConnected || !client) return;
  try {
    await client.set(key, JSON.stringify(value), { EX: ttlSec });
  } catch (err) {
    console.error(`[Cache] Set Error (${key})`, err);
  }
};

const del = async (key) => {
  if (!isConnected || !client) return;
  try {
    await client.del(key);
  } catch (err) {
    console.error(`[Cache] Del Error (${key})`, err);
  }
};

const delPattern = async (pattern) => {
  if (!isConnected || !client) return;
  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (err) {
    console.error(`[Cache] DelPattern Error (${pattern})`, err);
  }
};

module.exports = { init, get, set, del, delPattern };
