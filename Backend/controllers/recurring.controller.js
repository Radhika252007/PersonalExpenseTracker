import { matchedData } from 'express-validator';
import {
  asDateString,
  createRecurringSchedule,
  deleteRecurringSchedule,
  listRecurringSchedules,
  updateRecurringSchedule,
} from '../services/recurring.service.js';

function toDto(schedule) {
  const category = schedule.categoryId && typeof schedule.categoryId === 'object'
    ? schedule.categoryId
    : null;
  return {
    id: schedule._id.toString(),
    type: schedule.type,
    amount: schedule.amount,
    categoryId: category?._id?.toString() ?? schedule.categoryId?.toString() ?? null,
    categoryName: category?.name ?? null,
    description: schedule.description,
    frequency: schedule.frequency,
    startDate: asDateString(schedule.startDate),
    nextDueDate: asDateString(schedule.nextDueDate),
    endDate: schedule.endDate ? asDateString(schedule.endDate) : null,
    isActive: schedule.isActive,
    createdAt: schedule.createdAt,
  };
}

async function list(req, res) {
  const schedules = await listRecurringSchedules(req.userId);
  res.json({ data: schedules.map(toDto) });
}

async function create(req, res) {
  const values = matchedData(req, { locations: ['body'] });
  for (const field of ['categoryId', 'description', 'endDate']) {
    if (Object.hasOwn(req.body, field) && req.body[field] === null) values[field] = null;
  }
  const schedule = await createRecurringSchedule(req.userId, values);
  res.status(201).json({ data: toDto(schedule) });
}

async function update(req, res) {
  const { id } = matchedData(req, { locations: ['params'] });
  const values = matchedData(req, { locations: ['body'] });
  for (const field of ['categoryId', 'description', 'endDate']) {
    if (Object.hasOwn(req.body, field) && req.body[field] === null) values[field] = null;
  }
  const schedule = await updateRecurringSchedule(req.userId, id, values);
  res.json({ data: toDto(schedule) });
}

async function remove(req, res) {
  const { id } = matchedData(req, { locations: ['params'] });
  await deleteRecurringSchedule(req.userId, id);
  res.sendStatus(204);
}

export { create, list, remove, update };
