import { body, param, query } from 'express-validator';

const TYPES = ['income', 'expense'];
const DATE_OPTS = { format: 'YYYY-MM-DD', strictMode: true, delimiters: ['-'] };
const AMOUNT_RE = /^\d{1,9}(\.\d{1,2})?$/; 

const createTransactionRules = [
  body('type')
    .isString().withMessage('Type is required').bail()
    .isIn(TYPES).withMessage(`Type must be one of: ${TYPES.join(', ')}`),

  body('amount')
    .custom((v) => (typeof v === 'number' || typeof v === 'string') && AMOUNT_RE.test(String(v)) && Number(v) > 0)
    .withMessage('Amount must be a positive number with at most 2 decimal places').bail()
    .customSanitizer((v) => Math.round(Number(v) * 100)),

  body('date')
    .isString().withMessage('Date is required (YYYY-MM-DD)').bail()
    .isDate(DATE_OPTS).withMessage('Date must be a valid date in YYYY-MM-DD format'),

  body('categoryId')
    .optional({ values: 'null' })
    .isUUID().withMessage('categoryId must be a valid id'),

  body('description')
    .optional({ values: 'null' })
    .isString().withMessage('Description must be text').bail()
    .trim()
    .isLength({ max: 200 }).withMessage('Description must be 200 characters or fewer')
    .customSanitizer((v) => v.replace(/[\u0000-\u001F\u007F]/g, '')),
];

const transactionIdRules = [param('id').isUUID().withMessage('Invalid transaction id')];

const listTransactionRules = [
  query('page').optional().isString().bail().isInt({ min: 1, max: 100000 }).withMessage('page must be a positive integer').toInt(),
  query('limit').optional().isString().bail().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100').toInt(),
  query('type').optional().isString().bail().isIn(TYPES).withMessage(`type must be one of: ${TYPES.join(', ')}`),
  query('categoryId').optional().isString().bail().isUUID().withMessage('categoryId must be a valid id'),
  query('from').optional().isString().bail().isDate(DATE_OPTS).withMessage('from must be YYYY-MM-DD'),
  query('to')
    .optional().isString().bail()
    .isDate(DATE_OPTS).withMessage('to must be YYYY-MM-DD').bail()
    .custom((to, { req }) => !req.query.from || to >= req.query.from) // YYYY-MM-DD compares correctly as a string
    .withMessage('to must not be earlier than from'),
];

export { createTransactionRules, listTransactionRules, transactionIdRules };
