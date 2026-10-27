import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import cfg from '../config.js';

const base = { algorithm: 'HS256', issuer: cfg.issuer, audience: cfg.audience };
const verifyOpts = { algorithms: ['HS256'], issuer: cfg.issuer, audience: cfg.audience };

const signAccessToken = (userId) =>
  jwt.sign({ sub: userId }, cfg.accessSecret, { ...base, expiresIn: cfg.accessTtl });

function signRefreshToken(userId, familyId) {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ sub: userId, jti, fam: familyId }, cfg.refreshSecret, {
    ...base,
    expiresIn: Math.floor(cfg.refreshTtlMs / 1000),
  });
  return { token, jti };
}

const verifyAccessToken = (t) => jwt.verify(t, cfg.accessSecret, verifyOpts);
const verifyRefreshToken = (t) => jwt.verify(t, cfg.refreshSecret, verifyOpts);

export { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };
