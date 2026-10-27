import express from 'express';
import authenticate from '../middlewares/authenticate.js';
import credentialLimiter from '../middlewares/authRateLimiter.js';
import { login, logout, me, refresh, register } from '../controllers/auth.controller.js';
import { loginRules, registerRules, validate } from '../validator/auth.validator.js';

const router = express.Router();

router.post('/register', credentialLimiter, registerRules, validate, register);
router.post('/login', credentialLimiter, loginRules, validate, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, me);

export default router;
