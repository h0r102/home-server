import jwt from 'jsonwebtoken';

export interface SessionJwtPayload {
  sub: string;
  sid: string;
  iat: number;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return secret;
}

export function signSessionToken(userId: string, sessionId: string, expiresAt: Date): string {
  const expiresInSeconds = Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  return jwt.sign({ sub: userId, sid: sessionId }, getSecret(), { expiresIn: expiresInSeconds });
}

export function verifySessionToken(token: string): SessionJwtPayload {
  return jwt.verify(token, getSecret()) as SessionJwtPayload;
}
