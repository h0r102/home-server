interface Entry {
  challenge: string;
  expiresAt: number;
}

const TTL_MS = 5 * 60 * 1000;

const registrationChallenges = new Map<string, Entry>(); // key: userId
const authenticationChallenges = new Map<string, Entry>(); // key: flowId

function cleanupExpired(map: Map<string, Entry>): void {
  const now = Date.now();
  for (const [key, entry] of map) {
    if (entry.expiresAt < now) map.delete(key);
  }
}

export function setRegistrationChallenge(userId: string, challenge: string): void {
  cleanupExpired(registrationChallenges);
  registrationChallenges.set(userId, { challenge, expiresAt: Date.now() + TTL_MS });
}

export function takeRegistrationChallenge(userId: string): string | undefined {
  const entry = registrationChallenges.get(userId);
  registrationChallenges.delete(userId);
  if (!entry || entry.expiresAt < Date.now()) return undefined;
  return entry.challenge;
}

export function setAuthenticationChallenge(flowId: string, challenge: string): void {
  cleanupExpired(authenticationChallenges);
  authenticationChallenges.set(flowId, { challenge, expiresAt: Date.now() + TTL_MS });
}

export function takeAuthenticationChallenge(flowId: string): string | undefined {
  const entry = authenticationChallenges.get(flowId);
  authenticationChallenges.delete(flowId);
  if (!entry || entry.expiresAt < Date.now()) return undefined;
  return entry.challenge;
}
