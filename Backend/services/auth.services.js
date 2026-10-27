import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import cfg from '../config.js';
import * as db from '../config/db.js';
import HttpError from '../errors/error.js';
import { signRefreshToken, verifyRefreshToken } from '../utils/authTokens.js';

const DUMMY_HASH = bcrypt.hashSync('timing-equalizer', cfg.bcryptRounds);

function issueRefreshToken(data, userId, familyId = crypto.randomUUID()) {
  const { token, jti } = signRefreshToken(userId, familyId);
  data.refreshTokens.push({
    jti,
    familyId,
    userId,
    revoked: false,
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + cfg.refreshTtlMs,
  });
  return token;
}

async function registerUser({ email, username, password }) {
  const passwordHash = await bcrypt.hash(password, cfg.bcryptRounds);
  return db.transaction((data) => {
    if (data.users.some((user) => user.email === email)) {
      throw new HttpError(409, 'Email is already registered');
    }
    if (data.users.some((user) => user.username === username)) {
      throw new HttpError(409, 'Username is already taken');
    }

    const user = {
      id: crypto.randomUUID(),
      email,
      username,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    data.users.push(user);
    return { user, refreshToken: issueRefreshToken(data, user.id) };
  });
}

async function loginUser(identifier, password) {
  const data = await db.read();
  const user = data.users.find((entry) => entry.email === identifier || entry.username === identifier);

  const valid = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !valid) throw new HttpError(401, 'Invalid credentials');

  const refreshToken = await db.transaction((currentData) => issueRefreshToken(currentData, user.id));
  return { user, refreshToken };
}

async function refreshUserSession(token) {
  if (!token) return null;

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    return null;
  }

  return db.transaction((data) => {
    data.refreshTokens = data.refreshTokens.filter((record) => record.expiresAt > Date.now());

    const record = data.refreshTokens.find((entry) => entry.jti === payload.jti);
    if (!record) return null;

    if (record.revoked) {
      data.refreshTokens.forEach((entry) => {
        if (entry.familyId === record.familyId) entry.revoked = true;
      });
      return null;
    }

    const user = data.users.find((entry) => entry.id === payload.sub);
    if (!user) return null;

    record.revoked = true;
    return {
      user,
      refreshToken: issueRefreshToken(data, user.id, record.familyId),
    };
  });
}

async function logoutUser(token) {
  if (!token) return;

  let familyId;
  try {
    familyId = verifyRefreshToken(token).fam;
  } catch {
    return;
  }
  if (!familyId) return;

  await db.transaction((data) => {
    data.refreshTokens.forEach((record) => {
      if (record.familyId === familyId) record.revoked = true;
    });
  });
}

async function getUserById(userId) {
  const data = await db.read();
  return data.users.find((user) => user.id === userId);
}

export {
  getUserById,
  loginUser,
  logoutUser,
  refreshUserSession,
  registerUser,
};
