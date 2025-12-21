import { Json } from "../lib/database.types";

export type NotificationType =
  | "friend_request"
  | "new_follower"
  | "info"
  | "news_comment"
  | "thread_comment"
  | "comment_reply";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Json | null;
  read: boolean;
  created_at: string;
  updated_at: string;
}
