const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Two separate connections required — ioredis cannot pub and sub on same connection
const publisher = new Redis(redisUrl, { lazyConnect: true });
const subscriber = new Redis(redisUrl, { lazyConnect: true });

publisher.on('connect', () => console.log('[Redis] Publisher connected'));
subscriber.on('connect', () => console.log('[Redis] Subscriber connected'));
publisher.on('error', (err) => console.error('[Redis] Publisher error:', err.message));
subscriber.on('error', (err) => console.error('[Redis] Subscriber error:', err.message));

module.exports = { publisher, subscriber };
