export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureInitialAdmin } = await import('@/server/lib/bootstrap');
    await ensureInitialAdmin();
  }
}
