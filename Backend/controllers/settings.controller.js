import { matchedData } from 'express-validator';
import { getSettings, updateSettings } from '../services/settings.service.js';

async function get(req, res) {
  res.json({ data: await getSettings(req.userId) });
}

async function update(req, res) {
  const values = matchedData(req, { locations: ['body'] });
  res.json({ data: await updateSettings(req.userId, values) });
}

export { get, update };
