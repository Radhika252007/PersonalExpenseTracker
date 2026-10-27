import cfg from '../config.js';

export const COOKIE_NAME = 'refreshToken';

export const cookieOptions = {
  httpOnly: true,
  secure: cfg.isProd,
  sameSite: 'strict',
  path: '/api/auth',
  maxAge: cfg.refreshTtlMs,
};

export const clearCookieOptions = (() => {
  const { maxAge, ...options } = cookieOptions;
  return options;
})();
