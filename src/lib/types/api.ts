export interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit: number
  offset: number
}

export interface ApiError {
  error: string
  message?: string
  statusCode?: number
}
