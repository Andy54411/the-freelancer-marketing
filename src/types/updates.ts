export interface UpdateNotification {
  id: string;
  version: string;
  title: string;
  description: string;
  category: 'feature' | 'improvement' | 'bugfix' | 'security';
  releaseDate: string;
  isBreaking: boolean;
  tags: string[];
  screenshots?: string[];
  videoUrl?: string;
  documentationUrl?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UserUpdateStatus {
  userId: string;
  lastSeenVersion: string;
  seenUpdates: string[];
  dismissedUpdates?: string[]; // Verworfene Updates
  lastChecked: string;
}

export type UpdateCategory = 'feature' | 'improvement' | 'bugfix' | 'security';

export interface CreateUpdateRequest {
  version: string;
  title: string;
  description: string;
  category: UpdateCategory;
  isBreaking: boolean;
  tags: string[];
  screenshots?: string[];
  videoUrl?: string;
  documentationUrl?: string;
}
