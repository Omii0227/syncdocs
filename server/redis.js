const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Two separate connections required — ioredis cannot pub and sub on same connection
const publisher = new Redis(redisUrl, { lazyConnect: true });
const subscriber = new Redis(redisUrl, { lazyConnect: true });

publisher.on('connect', () => console.log('[Redis] Publisher connected'));
subscriber.on('connect', () => console.log('[Redis] Subscriber connected'));
publisher.on('error', (err) => {
  if (!publisher._errorLogged) { console.error('[Redis] Publisher error:', err.message); publisher._errorLogged = true; }
});
subscriber.on('error', (err) => {
  if (!subscriber._errorLogged) { console.error('[Redis] Subscriber error:', err.message); subscriber._errorLogged = true; }
});

module.exports = { publisher, subscriber };
