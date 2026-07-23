export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: 'ADMIN' | 'FAMILY' | 'GUEST';
}
