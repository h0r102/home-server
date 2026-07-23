import { execSync } from 'node:child_process';
import { existsSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dbPath = path.resolve(root, 'data/e2e.db');

if (existsSync(dbPath)) unlinkSync(dbPath);

process.env.DATABASE_URL = 'file:../data/e2e.db';

execSync('npx prisma migrate deploy', {
  cwd: root,
  env: process.env,
  stdio: 'inherit',
});

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const passwordHash = await bcrypt.hash('guestpass123', 12);
await prisma.user.upsert({
  where: { username: 'e2e-guest' },
  update: {},
  create: { username: 'e2e-guest', passwordHash, displayName: 'E2Eゲスト', role: 'GUEST' },
});
await prisma.$disconnect();

console.log('E2E database prepared with seed guest user.');
