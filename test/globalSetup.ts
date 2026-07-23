import { execSync } from 'node:child_process';
import { existsSync, unlinkSync } from 'node:fs';
import path from 'node:path';

const dbPath = path.resolve(__dirname, '../data/test.db');

export async function setup(): Promise<void> {
  if (existsSync(dbPath)) unlinkSync(dbPath);

  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: 'file:../data/test.db' },
    stdio: 'inherit',
  });
}

export async function teardown(): Promise<void> {
  if (existsSync(dbPath)) unlinkSync(dbPath);
}
