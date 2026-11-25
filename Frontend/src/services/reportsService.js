import { apiClient } from './api'

export async function getSummary(params) {
  const { data } = await apiClient.get('/reports/summary', { params })
  return data.data
}

export async function getCategoryReport(params) {
  const { data } = await apiClient.get('/reports/by-category', { params })
  return data.data
}

export async function getMonthlyTrend(params) {
  const { data } = await apiClient.get('/reports/monthly-trend', { params })
  return data.data
}

export async function downloadReport(params) {
  const { data } = await apiClient.get('/reports/export', {
    params,
    responseType: 'blob',
  })
  return data
}
