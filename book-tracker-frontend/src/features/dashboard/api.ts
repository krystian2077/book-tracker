import { api } from '@/lib/api/client'
import type { DashboardResponse } from '@/lib/api/types'

export const dashboardKeys = {
  all: ['dashboard'] as const,
}

export async function fetchDashboard(): Promise<DashboardResponse> {
  const { data } = await api.get<DashboardResponse>('/dashboard/')
  return data
}
