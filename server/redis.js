const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const publisher = new Redis(redisUrl, {
  retryStrategy(times) {
    if (times > 3) {
      console.log('[Redis] Could not connect after 3 tries — running without Redis');
      return null; // stop retrying
    }
    return Math.min(times * 200, 1000);
  },
  lazyConnect: false,
  enableOfflineQueue: false,
});

const subscriber = new Redis(redisUrl, {
  retryStrategy(times) {
    if (times > 3) {
      return null;
    }
    return Math.min(times * 200, 1000);
  },
  lazyConnect: false,
  enableOfflineQueue: false,
});

publisher.on('connect', () => console.log('[Redis] Publisher connected ✅'));
subscriber.on('connect', () => console.log('[Redis] Subscriber connected ✅'));
publisher.on('error', (err) => console.error('[Redis] Publisher error:', err.message));
subscriber.on('error', (err) => console.error('[Redis] Subscriber error:', err.message));

// Safe publish — silently skips if Redis is not connected
function safePublish(channel, message) {
  if (publisher.status === 'ready') {
    publisher.publish(channel, message).catch(() => {});
  }
}

module.exports = { publisher, subscriber, safePublish };
