// Re-export types from new canonical location
export type {
  ChatRoom,
  RoomMember,
  RoomInvite,
  SearchableUser,
  OnlineUser,
  Reaction,
  PeerCorrection,
  Message,
  HistoryMessage,
  MiniProfile,
  PrivateInvite,
  FontSize,
  BubbleTheme,
  MiniProfileFollowState,
} from '@/lib/types/chat'

// Re-export constants from new canonical location
export {
  LANG_FLAGS,
  LEVEL_COLORS,
  EMOJI_REACTIONS,
  TARGET_LANG_CODES,
  TARGET_LANG_FLAGS,
  BUBBLE_THEME_COLORS,
  FONT_SIZE_MAP,
  FONT_AVATAR_SIZE,
  CUSTOM_BUBBLE_PRESETS,
} from '@/lib/constants/chat'

// Keep url_env for backward compatibility
import { API_URL } from '@/lib/api/client'
export const url_env = API_URL
