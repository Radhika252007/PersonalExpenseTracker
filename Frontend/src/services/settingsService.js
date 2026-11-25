import { apiClient } from './api'

export async function getSettings() {
  const { data } = await apiClient.get('/settings')
  return data.data
}

export async function updateSettings(changes) {
  const { data } = await apiClient.patch('/settings', changes)
  return data.data
}
