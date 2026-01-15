

export interface Notification {
  id: string;
  type: 'COPYRIGHT_STRIKE_NEW' | 'COPYRIGHT_STRIKE_UPDATE' | 'NEW_FOLLOWER' | 'POST_LIKE';
  message: string;
  link?: string;
  timestamp: number;
  isRead: boolean;
  relatedUserId?: string; // The user who initiated the action (e.g., liked, followed)
  relatedPostId?: string;
  relatedPostContent?: string;
}

export interface Withdrawal {
  username: string;
  amount: number;
  fee: number;
  totalDeducted: number;
  redeemCode: string;
  timestamp: number;
  status: 'pending' | 'cleared';
  userId: string;
  withdrawalId: string;
}

export interface CopyrightStrike {
    strikeId: string;
    claimantId: string;
    claimantName: string;
    receivedAt: number;
    expiresAt: number;
    status: 'active' | 'expired' | 'retracted';
    postId: string;
    postContent: string;
    imageUrl?: string;
    videoUrl?: string;
}

export interface CopyrightMessage {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: number;
}

export interface CopyrightClaim {
    id: string;
    claimantId: string;
    claimantName: string;
    claimantSignature: string;
    accusedUserId: string;
    accusedUsername: string;
    postId: string;
    action: 'delete_only' | 'strike_only' | 'delete_and_strike';
    originalContentUrl: string;
    date: number;
    status: 'pending' | 'approved' | 'rejected' | 'retracted';
    messages?: { [key: string]: CopyrightMessage };
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  readBy?: { [userId: string]: boolean };
  deletedFor?: { [userId: string]: boolean };
}

export interface Chat {
    [chatId: string]: {
        messages: { [messageId: string]: Message };
        lastMessage: Message;
    }
}


export interface User {
  id: string;
  name: string;
  avatar: string;
  mainAccountUsername: string;
  theme?: 'light' | 'dark';
  isMonetized?: boolean;
  totalViews?: number;
  totalLikes?: number;
  withdrawals?: { [key: string]: Withdrawal };
  dailyPostCount?: {
      count: number;
      date: string;
  };
  copyrightStrikes?: { [key: string]: CopyrightStrike };
  submittedClaims?: { [key: string]: CopyrightClaim };
  isLocked?: boolean;
  accountStatus?: 'active' | 'terminated';
  terminationReason?: string;
  followers?: { [key: string]: boolean };
  following?: { [key: string]: boolean };
  notifications?: { [key: string]: Notification };
}
export interface Comment {
    id: string;
    user: User;
    text: string;
    createdAt: number;
}

export interface Post {
  id: string;
  user: User;
  content: string;
  image?: string;
  video?: string;
  videoThumbnail?: string;
  imageHint?: string;
  likes: { [key: string]: boolean };
  comments: { [key: string]: Comment };
  views: number;
  createdAt: number;
  viewStage?: 'A' | 'B' | 'C' | 'D' | 'E';
  targetViews?: number;
  stageAssignedAt?: number;
  targetCompletedIn?: number; // hours
  finalViewBoostApplied?: boolean;
  isCopyrighted?: boolean;
}
