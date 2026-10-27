import express from 'express';
import authenticate from '../middlewares/authenticate.js';
import { create, getOne, list } from '../controllers/transactions.controller.js';
import {
  createTransactionRules,
  listTransactionRules,
  transactionIdRules,
} from '../validators/transaction.validator.js';
import { validate } from '../validator/validate.js';

const router = express.Router();

router.use(authenticate);

router.get('/', listTransactionRules, validate, list);
router.get('/:id', transactionIdRules, validate, getOne);
router.post('/', createTransactionRules, validate, create);

export default router;
