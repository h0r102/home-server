export function getRpId(): string {
  return process.env.WEBAUTHN_RP_ID || 'localhost';
}

export function getRpName(): string {
  return process.env.WEBAUTHN_RP_NAME || 'ホームポータル';
}

export function getOrigin(): string {
  return process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000';
}
