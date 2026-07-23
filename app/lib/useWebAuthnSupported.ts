'use client';

import { useSyncExternalStore } from 'react';
import { browserSupportsWebAuthn } from '@simplewebauthn/browser';

function subscribeNoop(): () => void {
  return () => {};
}

function getServerSnapshot(): boolean {
  return false;
}

export function useWebAuthnSupported(): boolean {
  return useSyncExternalStore(subscribeNoop, browserSupportsWebAuthn, getServerSnapshot);
}
