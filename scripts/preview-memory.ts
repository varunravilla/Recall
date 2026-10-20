import { MongoMemoryServer } from "mongodb-memory-server";
// Disposable preview: never uses or resets the configured application database.
const mongo = await MongoMemoryServer.create();
process.env.MONGODB_URL = mongo.getUri("recall-preview");
process.env.PORT = process.env.PORT ?? "3000";
process.on("SIGINT", async () => { await mongo.stop(); process.exit(); });
process.on("SIGTERM", async () => { await mongo.stop(); process.exit(); });
try { await import("../src/main.ts"); }
catch (error) { await mongo.stop(); throw error; }
