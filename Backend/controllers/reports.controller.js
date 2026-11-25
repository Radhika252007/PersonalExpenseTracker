import { matchedData } from 'express-validator';
import {
  getByCategory,
  getExportRows,
  getMonthlyTrend,
  getSummary,
} from '../services/reports.service.js';

async function summary(req, res) {
  const filters = matchedData(req, { locations: ['query'] });
  res.json({ data: await getSummary(req.userId, filters) });
}

async function byCategory(req, res) {
  const filters = matchedData(req, { locations: ['query'] });
  const data = await getByCategory(req.userId, filters);
  res.json({ data, period: { from: filters.from || null, to: filters.to || null } });
}

async function monthlyTrend(req, res) {
  const filters = matchedData(req, { locations: ['query'] });
  res.json({ data: await getMonthlyTrend(req.userId, filters) });
}

function csvField(value) {
  let text = String(value ?? '');
  if (/^[\t\r\n ]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

async function exportTransactions(req, res) {
  const filters = matchedData(req, { locations: ['query'] });
  const rows = await getExportRows(req.userId, filters);
  const csv = [
    ['Date', 'Type', 'Category', 'Amount', 'Note'].map(csvField).join(','),
    ...rows.map((row) => [
      row.date.toISOString().slice(0, 10),
      row.type,
      row.category,
      Number(row.amount).toFixed(2),
      row.note,
    ].map(csvField).join(',')),
  ].join('\r\n');

  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="transactions.csv"',
  });
  res.send(csv);
}

export { byCategory, exportTransactions, monthlyTrend, summary };
