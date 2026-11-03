// Local development only: runs a real PostgreSQL server from node_modules, no install needed.
// `npm run db:local` keeps it running in the foreground; Ctrl+C stops it. Data persists in .local-db/.
import { existsSync, rmSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';

const databaseDir = fileURLToPath(new URL('../.local-db/', import.meta.url));
const port = Number(process.env.LOCAL_DB_PORT ?? 5433);
const database = 'mail_queue';

const pg = new EmbeddedPostgres({ databaseDir, port, user: 'postgres', password: 'postgres', persistent: true });

function isPortOpen() {
  return new Promise((resolve) => {
    const socket = net.connect(port, '127.0.0.1');
    socket.once('connect', () => {
      socket.end();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

if (await isPortOpen()) {
  console.log(`Something is already listening on port ${port} (PostgreSQL already running?). Nothing to do.`);
  process.exit(0);
}

// A hard kill leaves postmaster.pid behind and PostgreSQL then refuses to start.
// Nothing is listening on our port, so the lock file is stale.
const lockFile = path.join(databaseDir, 'postmaster.pid');
if (existsSync(lockFile)) {
  rmSync(lockFile);
  console.log('Removed stale postmaster.pid from a previous unclean shutdown');
}

if (!existsSync(databaseDir)) await pg.initialise();
await pg.start();
await pg.createDatabase(database).catch(() => {}); // already exists

console.log(`PostgreSQL ready: postgres://postgres:postgres@localhost:${port}/${database}`);

async function stop() {
  await pg.stop();
  process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
setInterval(() => {}, 1 << 30);
