import { matchedData } from 'express-validator';
import {
  createTransaction,
  getTransaction,
  listTransactions,
} from '../services/transactions.service.js';

const toDto = (transaction) => ({
  id: transaction.id,
  type: transaction.type,
  amount: transaction.amountMinor / 100,
  categoryId: transaction.categoryId,
  description: transaction.description,
  date: transaction.date,
  createdAt: transaction.createdAt,
});

async function list(req, res) {
  const filters = matchedData(req, { locations: ['query'] });
  const result = await listTransactions(req.userId, filters);

  res.json({
    data: result.transactions.map(toDto),
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / result.limit),
    },
  });
}

async function getOne(req, res) {
  const { id } = matchedData(req, { locations: ['params'] });
  const transaction = await getTransaction(req.userId, id);
  res.json({ data: toDto(transaction) });
}

async function create(req, res) {
  const values = matchedData(req, { locations: ['body'] });
  const transaction = await createTransaction(req.userId, values);
  res.status(201)
    .location(`/api/transactions/${transaction.id}`)
    .json({ data: toDto(transaction) });
}

export { create, getOne, list };
