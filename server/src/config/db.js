import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import env from './env.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let memoryServer = null;

export async function connectDb() {
  let uri = env.mongoUri;

  if (env.useMemoryDb) {
    // Embedded MongoDB with persistent storage - no local install required.
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const dbPath = path.join(__dirname, '..', '..', '.mongo-data');
    fs.mkdirSync(dbPath, { recursive: true });
    memoryServer = await MongoMemoryServer.create({
      instance: { dbPath, storageEngine: 'wiredTiger' },
    });
    uri = `${memoryServer.getUri()}hr-system`;
  }

  await mongoose.connect(uri);
  console.log(`MongoDB connected (${env.useMemoryDb ? 'embedded' : 'external'})`);
}

export async function disconnectDb() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}