import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalForMongoose = globalThis as unknown as { __mongoose?: MongooseCache };
const cache: MongooseCache = globalForMongoose.__mongoose ?? { conn: null, promise: null };
globalForMongoose.__mongoose = cache;

function getUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local and run `npm run db`.");
  return uri;
}

/** Shared connection, reused across hot reloads and serverless invocations. */
export async function connectDb(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  cache.promise ??= mongoose.connect(getUri(), { serverSelectionTimeoutMS: 5000 });
  try {
    cache.conn = await cache.promise;
  } catch (error: unknown) {
    cache.promise = null;
    throw new Error(`Could not connect to MongoDB: ${error instanceof Error ? error.message : String(error)}`);
  }
  return cache.conn;
}
