import { body } from 'express-validator';
import { validate } from './validate.js';

const registerRules = [
  body('email')
    .isString().withMessage('Email is required').bail()
    .trim()
    .isLength({ max: 254 }).withMessage('Email is too long').bail()
    .isEmail().withMessage('Enter a valid email address')
    .customSanitizer((v) => v.toLowerCase()),

  body('username')
    .isString().withMessage('Username is required').bail()
    .trim()
    .matches(/^[a-zA-Z0-9_]{3,30}$/)
    .withMessage('Username must be 3-30 characters: letters, numbers and underscores only')
    .customSanitizer((v) => v.toLowerCase()),

  body('password')
    .isString().withMessage('Password is required').bail()
    .isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 characters').bail()
    .custom((v) => Buffer.byteLength(v, 'utf8') <= 72) // bcrypt silently truncates past 72 bytes
    .withMessage('Password is too long (max 72 bytes)').bail()
    .isStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 0 })
    .withMessage('Password needs at least one lowercase letter, one uppercase letter and one number'),
];

const loginRules = [
  body('identifier')
    .isString().withMessage('Username or email is required').bail()
    .trim()
    .notEmpty().withMessage('Username or email is required')
    .isLength({ max: 254 }).withMessage('Invalid username or email')
    .customSanitizer((v) => v.toLowerCase()),

  body('password')
    .isString().withMessage('Password is required').bail()
    .notEmpty().withMessage('Password is required')
    .isLength({ max: 128 }).withMessage('Invalid password'), // cap length so bcrypt can't be used for DoS
];

export { registerRules, loginRules, validate };
