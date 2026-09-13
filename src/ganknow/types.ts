export interface Post {
  id: string;
  url: string;
  title?: string;
  image?: string;
  pinned?: boolean;
  authorName?: string;
  authorAvatar?: string;
  locked?: boolean;
  thumbnail?: string;
}
