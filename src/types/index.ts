export type ScreenMode = 'portfolio' | 'admin';

export type ProjectCategory = 'Fullstack' | 'Systems' | 'Infrastructure' | 'AI / ML' | 'Cybersecurity';

export type ProjectStatus = 'ACTIVE' | 'DEPLOYED' | 'BETA' | 'ARCHIVED';

export interface Project {
  id: string;
  title: string;
  subtitle: string;
  category: ProjectCategory;
  description: string;
  detailedOverview: string;
  tags: string[];
  metrics: {
    throughput?: string;
    latency?: string;
    uptime?: string;
    nodes?: string;
  };
  imageUrl: string;
  imageAlt?: string;
  liveUrl?: string;
  githubUrl?: string;
  featured: boolean;
  gridSpan?: 'normal' | 'wide' | 'full'; // wide = 8 cols, normal = 4 cols, full = 12 cols
  updatedAt: string;
  // GitHub integration properties
  stars?: number;
  forks?: number;
  language?: string;
  topics?: string[];
  repoName?: string;
  selected?: boolean;
  source?: 'github' | 'manual';
}

export type TopicInterest = 'All Systems' | 'AI & Architecture' | 'Kinetic UX' | 'Engineering Research';

export interface Subscriber {
  id: string;
  name: string;
  email: string;
  topic: TopicInterest;
  status: 'ACTIVE' | 'UNSUBSCRIBED';
  subscribedAt: string;
}

export type ContactStatus = 'UNREAD' | 'READ' | 'REPLIED' | 'ARCHIVED';

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  submittedAt: string;
  status: ContactStatus;
  notes?: string;
}

export interface NewsletterCampaign {
  id: string;
  subject: string;
  previewText: string;
  content: string;
  targetTopic: TopicInterest | 'All';
  recipientCount: number;
  openRate: string;
  clickRate: string;
  status: 'DRAFT' | 'SENT' | 'SCHEDULED';
  sentAt?: string;
}

export interface SystemConfig {
  ownerName: string;
  titleRoles: string[];
  documentBio: string;
  systemStatus: string;
  coreTemp: string;
  activeNodes: number;
  latencyMs: number;
  uptime: string;
  githubUrl: string;
  upworkUrl: string;
  linkedinUrl: string;
  twitterUrl: string;
}
