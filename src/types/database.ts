export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  link?: string;
  type?: string;
  metadata?: any;
  data?: any;
}
