import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import jwt, { type SignOptions } from 'jsonwebtoken';

interface TokenPayload {
  userId: string;
}

const ACCESS_TOKEN_EXPIRES_IN = '1h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

const privateKeyPath = fileURLToPath(new URL('../keys/private.key', import.meta.url));
const publicKeyPath = fileURLToPath(new URL('../keys/public.key', import.meta.url));

const PRIVATE_KEY = fs.readFileSync(privateKeyPath, 'utf8');
const PUBLIC_KEY = fs.readFileSync(publicKeyPath, 'utf8');

export const generateAccessToken = (userId: string): string => {
  const payload: TokenPayload = {
    userId,
  };

  const options: SignOptions = {
    algorithm: 'RS256',
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  };

  return jwt.sign(payload, PRIVATE_KEY, options);
};

export const generateRefreshToken = (userId: string): string => {
  const payload: TokenPayload = {
    userId,
  };

  const options: SignOptions = {
    algorithm: 'RS256',
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  };

  return jwt.sign(payload, PRIVATE_KEY, options);
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, PUBLIC_KEY, {
    algorithms: ['RS256'],
  }) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, PUBLIC_KEY, {
    algorithms: ['RS256'],
  }) as TokenPayload;
};
