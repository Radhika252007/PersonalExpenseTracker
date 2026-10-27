import { matchedData } from 'express-validator';
import {
  getUserById,
  loginUser,
  logoutUser,
  refreshUserSession,
  registerUser,
} from '../services/auth.service.js';
import HttpError from '../errors/error.js';
import { signAccessToken } from '../utils/authTokens.js';
import { COOKIE_NAME, clearCookieOptions, cookieOptions } from '../utils/authCookies.js';

const publicUser = ({ id, email, username, createdAt }) => ({ id, email, username, createdAt });

async function register(req, res, next) {
  try {
    const { email, username, password } = matchedData(req);
    const { user, refreshToken } = await registerUser({ email, username, password });
    res.cookie(COOKIE_NAME, refreshToken, cookieOptions);
    res.status(201).json({ user: publicUser(user), accessToken: signAccessToken(user.id) });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { identifier, password } = matchedData(req);
    const { user, refreshToken } = await loginUser(identifier, password);
    res.cookie(COOKIE_NAME, refreshToken, cookieOptions);
    res.json({ user: publicUser(user), accessToken: signAccessToken(user.id) });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  const reject = () => {
    res.clearCookie(COOKIE_NAME, clearCookieOptions);
    return res.status(401).json({ message: 'Session expired, please log in again' });
  };

  try {
    const result = await refreshUserSession(req.cookies[COOKIE_NAME]);
    if (!result) return reject();

    res.cookie(COOKIE_NAME, result.refreshToken, cookieOptions);
    res.json({ accessToken: signAccessToken(result.user.id) });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    await logoutUser(req.cookies[COOKIE_NAME]);
    res.clearCookie(COOKIE_NAME, clearCookieOptions);
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await getUserById(req.userId);
    if (!user) throw new HttpError(401, 'User no longer exists');
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
}

export { login, logout, me, refresh, register };
