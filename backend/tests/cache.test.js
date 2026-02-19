const request = require('supertest');
const express = require('express');
const cacheMiddleware = require('../src/middleware/cache');

const app = express();
app.use(express.json());

let callCount = 0;
app.get('/test', cacheMiddleware, (req, res) => {
  callCount++;
  res.json({ count: callCount });
});

describe('Cache Middleware', () => {
  beforeEach(() => {
    callCount = 0;
  });

  it('should cache responses', async () => {
    const response1 = await request(app).get('/test');
    expect(response1.status).toBe(200);
    expect(response1.body.count).toBe(1);

    const response2 = await request(app).get('/test');
    expect(response2.status).toBe(200);
    expect(response2.body.count).toBe(1); // Should be cached
  });
});