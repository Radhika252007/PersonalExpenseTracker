import { apiClient } from './api'

export async function getRecurringSchedules() {
  const { data } = await apiClient.get('/recurring')
  return data.data
}

export async function createRecurringSchedule(schedule) {
  const { data } = await apiClient.post('/recurring', schedule)
  return data.data
}

export async function updateRecurringSchedule(id, changes) {
  const { data } = await apiClient.patch(`/recurring/${id}`, changes)
  return data.data
}

export async function deleteRecurringSchedule(id) {
  await apiClient.delete(`/recurring/${id}`)
}
