export type NotificationType =
  | "mention"
  | "follow"
  | "dm_invite"
  | "ai_correction"
  | "achievement"
  | "event_reminder"
  | "system"

export interface Notification {
  id: number | string
  type: NotificationType
  title: string
  body: string
  data: Record<string, unknown>
  is_read: boolean
  created_at: string
}
