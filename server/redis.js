const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const retryStrategy = (times) => {
  if (times > 5) {
    console.log('[Redis] Cannot connect after 5 tries — running without Redis');
    return null;
  }
  return Math.min(times * 300, 2000);
};

const publisher = new Redis(redisUrl, {
  retryStrategy,
  enableOfflineQueue: true,  // allow queuing until connected
  tls: redisUrl.startsWith('rediss://') ? {} : undefined,
});

const subscriber = new Redis(redisUrl, {
  retryStrategy,
  enableOfflineQueue: true,  // allow queuing until connected
  tls: redisUrl.startsWith('rediss://') ? {} : undefined,
});

publisher.on('connect', () => console.log('[Redis] Publisher connected ✅'));
subscriber.on('connect', () => console.log('[Redis] Subscriber connected ✅'));
publisher.on('error', (err) => console.error('[Redis] Publisher error:', err.message));
subscriber.on('error', (err) => console.error('[Redis] Subscriber error:', err.message));

function safePublish(channel, message) {
  if (publisher.status === 'ready') {
    publisher.publish(channel, message).catch(() => {});
  }
}

module.exports = { publisher, subscriber, safePublish };
