export enum AuthProvider {
  Email = 'EMAIL',
}

export type AuthAccessPayload = {
  sub: number;
  sid: number;
  iat?: number;
  exp?: number;
};

export type AuthSessionToken = {
  userId: number;
  sessionId: number;
  expiresInSeconds: number;
};

export type AuthenticatedUser = {
  userId: number;
  sessionId: number;
};
