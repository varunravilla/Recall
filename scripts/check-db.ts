import { MongoClient } from "mongodb";

const url = process.env.MONGODB_URL ?? "mongodb://127.0.0.1:27017/recall";
const timeout = process.argv.includes("--wait") ? 30_000 : 3_000;
const client = new MongoClient(url, { serverSelectionTimeoutMS: timeout });

try {
  await client.connect();
  const db = client.db();
  await db.command({ ping: 1 });
  const checks = db.collection("setup_checks");
  await checks.insertOne({ at: new Date() });
  console.log(`Connected to ${db.databaseName}. It has ${await checks.countDocuments()} check(s).`);
} catch (error) {
  console.error(`Could not reach MongoDB at ${url}`);
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.close();
}
