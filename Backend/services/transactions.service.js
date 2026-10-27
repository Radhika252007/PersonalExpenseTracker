import crypto from 'node:crypto';
import * as db from '../config/db.js';
import HttpError from '../errors/error.js';

async function listTransactions(userId, filters) {
  const { page = 1, limit = 20, type, categoryId, from, to } = filters;
  const data = await db.read();
  const rows = data.transactions
    .filter((transaction) => transaction.userId === userId)
    .filter((transaction) => !type || transaction.type === type)
    .filter((transaction) => !categoryId || transaction.categoryId === categoryId)
    .filter((transaction) => !from || transaction.date >= from)
    .filter((transaction) => !to || transaction.date <= to)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  return {
    transactions: rows.slice((page - 1) * limit, page * limit),
    page,
    limit,
    total: rows.length,
  };
}

async function getTransaction(userId, transactionId) {
  const data = await db.read();
  const transaction = data.transactions.find(
    (entry) => entry.id === transactionId && entry.userId === userId,
  );

  if (!transaction) throw new HttpError(404, 'Transaction not found');
  return transaction;
}

async function createTransaction(userId, values) {
  const { type, amount, date, categoryId = null, description = null } = values;

  return db.transaction((data) => {
    if (categoryId) {
      const categoryExists = data.categories.some(
        (category) => category.id === categoryId
          && (category.userId === userId || category.userId == null),
      );
      if (!categoryExists) throw new HttpError(422, 'Validation failed');
    }

    const transaction = {
      id: crypto.randomUUID(),
      userId,
      type,
      amountMinor: amount,
      categoryId,
      description,
      date,
      createdAt: new Date().toISOString(),
    };
    data.transactions.push(transaction);
    return transaction;
  });
}

export { createTransaction, getTransaction, listTransactions };
