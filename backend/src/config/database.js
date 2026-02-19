const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 50, // Increased from 20 to 50 for better concurrency
  min: 5, // Minimum connections to keep ready
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait when connecting a new client
  acquireTimeoutMillis: 60000, // How long to wait when acquiring a connection from the pool
  createTimeoutMillis: 30000, // How long to wait when creating a new connection
  destroyTimeoutMillis: 5000, // How long to wait when destroying a connection
  reapIntervalMillis: 1000, // How often to check for idle connections to destroy
  createRetryIntervalMillis: 200, // How long to wait between connection creation retries
});

if (process.env.NODE_ENV !== 'test') {
  pool.on('connect', () => {
    console.log('Connected to PostgreSQL database');
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  pool.on('acquire', () => {
    console.log('Database connection acquired from pool');
  });

  pool.on('remove', () => {
    console.log('Database connection removed from pool');
  });
}

// Connection pool monitoring function
pool.getPoolStats = () => {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    max: pool.options.max,
    min: pool.options.min
  };
};

// Log pool statistics every 30 seconds in development
if (process.env.NODE_ENV === 'development') {
  const interval = setInterval(() => {
    const stats = pool.getPoolStats();
    console.log('🔗 Connection Pool Stats:', {
      active: stats.totalCount - stats.idleCount,
      idle: stats.idleCount,
      waiting: stats.waitingCount,
      total: stats.totalCount,
      max: stats.max
    });
  }, 30000);
  interval.unref();
}

module.exports = pool;
