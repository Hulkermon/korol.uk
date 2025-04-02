export interface Reply {
  id: string;
  text: string;
  author: 'Anonymous' | 'User'; // AI or the actual user
  timestamp: number;
}

export interface Comment {
  id: string;
  text: string;
  author: 'Anonymous'; // AI generated comments are always Anonymous
  timestamp: number;
  replies: Reply[];
}
