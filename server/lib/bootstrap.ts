import { userRepository } from '@/server/repositories/userRepository';
import { hashPassword } from './password';
import { logger } from './logger';

export async function ensureInitialAdmin(): Promise<void> {
  const adminCount = await userRepository.countByRole('ADMIN');
  if (adminCount > 0) return;

  const username = process.env.INITIAL_ADMIN_USERNAME;
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!username || !password) {
    logger.warn(
      'No ADMIN user exists and INITIAL_ADMIN_USERNAME/INITIAL_ADMIN_PASSWORD are not set; skipping initial admin creation'
    );
    return;
  }

  const passwordHash = await hashPassword(password);
  await userRepository.create({
    username,
    passwordHash,
    displayName: username,
    role: 'ADMIN',
  });
  logger.info({ username }, 'bootstrap_admin_created');
}
