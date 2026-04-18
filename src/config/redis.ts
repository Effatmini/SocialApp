import { createClient } from "redis";

let redisClient: ReturnType<typeof createClient> | null = null;
let connectPromise: Promise<ReturnType<typeof createClient>> | null = null;

export const getRedisClient = async () => {
  if (redisClient?.isOpen) {
    return redisClient;
  }

  if (connectPromise) {
    return connectPromise;
  }

  const client = createClient({
    url: process.env.REDIS_URL || "redis://127.0.0.1:6379"
  });

  client.on("error", (error) => {
    console.error("Redis error", error);
  });

  connectPromise = client.connect().then(() => {
    redisClient = client;
    return client;
  });

  return connectPromise;
};
