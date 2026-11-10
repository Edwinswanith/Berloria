/**
 * Local MongoDB with no install: an embedded mongod that keeps data in .data/mongo.
 * Run: npm run db   (leave it running; Ctrl+C to stop)
 * Production uses MongoDB Atlas via MONGODB_URI instead.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { MongoMemoryServer } from "mongodb-memory-server";

const PORT = Number(process.env.LOCAL_MONGO_PORT ?? 27017);
const dbPath = path.resolve(process.cwd(), ".data/mongo");

async function main(): Promise<void> {
  mkdirSync(dbPath, { recursive: true });
  const server = await MongoMemoryServer.create({ instance: { port: PORT, dbPath, storageEngine: "wiredTiger" } });
  process.stdout.write(`MongoDB running at ${server.getUri()}  (data: ${dbPath})\n`);

  const stop = async () => {
    await server.stop({ doCleanup: false });
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((error: unknown) => {
  process.stderr.write(`Could not start MongoDB: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
