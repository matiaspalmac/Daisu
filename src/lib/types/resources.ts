export interface Resource {
  id: number
  title: string
  description: string
  url: string
  type: 'textbook' | 'video' | 'article' | 'link'
  language: string
  level: string
  thumbnail_url?: string
  author?: string
  is_featured: boolean
  is_premium: boolean
  view_count: number
}

export interface ResourcesResponse {
  resources: Resource[]
  total: number
  limit: number
  offset: number
}
