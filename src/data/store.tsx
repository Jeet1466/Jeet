import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project, Subscriber, NewsletterCampaign, SystemConfig, ScreenMode, TopicInterest } from '../types';
import { INITIAL_PROJECTS, INITIAL_SUBSCRIBERS, INITIAL_CAMPAIGNS, INITIAL_SYSTEM_CONFIG } from './seedData';

interface AppContextType {
  screen: ScreenMode;
  setScreen: (screen: ScreenMode) => void;
  projects: Project[];
  subscribers: Subscriber[];
  campaigns: NewsletterCampaign[];
  config: SystemConfig;
  
  // Project actions
  addProject: (project: Omit<Project, 'id' | 'updatedAt'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  toggleFeatured: (id: string) => void;
  
  // Newsletter actions
  subscribe: (name: string, email: string, topic: TopicInterest) => { success: boolean; message: string };
  deleteSubscriber: (id: string) => void;
  sendCampaign: (data: { subject: string; previewText: string; content: string; targetTopic: TopicInterest | 'All' }) => void;
  deleteCampaign: (id: string) => void;
  
  // Config
  updateConfig: (updates: Partial<SystemConfig>) => void;
  resetToDefaults: () => void;
  
  // Modals & 3D view states
  selectedProject: Project | null;
  setSelectedProject: (p: Project | null) => void;
  isContactOpen: boolean;
  setIsContactOpen: (open: boolean) => void;
  isTelemetryOpen: boolean;
  setIsTelemetryOpen: (open: boolean) => void;
  is3DFullscreen: boolean;
  setIs3DFullscreen: (full: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEYS = {
  PROJECTS: 'kinetic_projects_v5',
  SUBSCRIBERS: 'kinetic_subscribers_v5',
  CAMPAIGNS: 'kinetic_campaigns_v5',
  CONFIG: 'kinetic_config_v6'
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [screen, setScreen] = useState<ScreenMode>('portfolio');

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      return saved ? JSON.parse(saved) : INITIAL_PROJECTS;
    } catch {
      return INITIAL_PROJECTS;
    }
  });

  const [subscribers, setSubscribers] = useState<Subscriber[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SUBSCRIBERS);
      return saved ? JSON.parse(saved) : INITIAL_SUBSCRIBERS;
    } catch {
      return INITIAL_SUBSCRIBERS;
    }
  });

  const [campaigns, setCampaigns] = useState<NewsletterCampaign[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CAMPAIGNS);
      return saved ? JSON.parse(saved) : INITIAL_CAMPAIGNS;
    } catch {
      return INITIAL_CAMPAIGNS;
    }
  });

  const [config, setConfig] = useState<SystemConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.ownerName === 'NEHAL PATEL' || !parsed.ownerName) {
          return { ...parsed, ownerName: 'Jeet Patel', titleRoles: INITIAL_SYSTEM_CONFIG.titleRoles };
        }
        return parsed;
      }
      return INITIAL_SYSTEM_CONFIG;
    } catch {
      return INITIAL_SYSTEM_CONFIG;
    }
  });

  // Modals
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [is3DFullscreen, setIs3DFullscreen] = useState(false);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    } catch (e) {
      console.warn('Storage failed', e);
    }
  }, [projects]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SUBSCRIBERS, JSON.stringify(subscribers));
    } catch (e) {
      console.warn('Storage failed', e);
    }
  }, [subscribers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CAMPAIGNS, JSON.stringify(campaigns));
    } catch (e) {
      console.warn('Storage failed', e);
    }
  }, [campaigns]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
    } catch (e) {
      console.warn('Storage failed', e);
    }
  }, [config]);

  // Project CRUD
  const addProject = (projectData: Omit<Project, 'id' | 'updatedAt'>) => {
    const newProject: Project = {
      ...projectData,
      id: `proj-${Date.now()}`,
      updatedAt: new Date().toISOString().split('T')[0]
    };
    setProjects(prev => [newProject, ...prev]);
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev =>
      prev.map(p => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString().split('T')[0] } : p))
    );
    if (selectedProject?.id === id) {
      setSelectedProject(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    if (selectedProject?.id === id) {
      setSelectedProject(null);
    }
  };

  const toggleFeatured = (id: string) => {
    setProjects(prev =>
      prev.map(p => (p.id === id ? { ...p, featured: !p.featured } : p))
    );
  };

  // Newsletter
  const subscribe = (name: string, email: string, topic: TopicInterest) => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return { success: false, message: 'ERR_INVALID_DISPATCH_ADDRESS: Valid email required' };
    }
    const exists = subscribers.some(s => s.email.toLowerCase() === trimmedEmail && s.status === 'ACTIVE');
    if (exists) {
      return { success: false, message: 'DISPATCH_PROTOCOL: Node already registered in telemetry roster' };
    }

    const newSub: Subscriber = {
      id: `sub-${Date.now()}`,
      name: name.trim() || 'Anonymous Engineer',
      email: trimmedEmail,
      topic,
      status: 'ACTIVE',
      subscribedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    setSubscribers(prev => [newSub, ...prev]);
    return { success: true, message: 'NODE_INITIALIZED: Connected to Kinetic Dispatch protocol' };
  };

  const deleteSubscriber = (id: string) => {
    setSubscribers(prev => prev.filter(s => s.id !== id));
  };

  const sendCampaign = (data: { subject: string; previewText: string; content: string; targetTopic: TopicInterest | 'All' }) => {
    const targetCount = data.targetTopic === 'All'
      ? subscribers.filter(s => s.status === 'ACTIVE').length
      : subscribers.filter(s => s.status === 'ACTIVE' && s.topic === data.targetTopic).length;

    const newCampaign: NewsletterCampaign = {
      id: `camp-${Date.now()}`,
      subject: data.subject,
      previewText: data.previewText,
      content: data.content,
      targetTopic: data.targetTopic,
      recipientCount: Math.max(targetCount, 1),
      openRate: '0.0%',
      clickRate: '0.0%',
      status: 'SENT',
      sentAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    setCampaigns(prev => [newCampaign, ...prev]);
  };

  const deleteCampaign = (id: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
  };

  // Config
  const updateConfig = (updates: Partial<SystemConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const resetToDefaults = () => {
    setProjects(INITIAL_PROJECTS);
    setSubscribers(INITIAL_SUBSCRIBERS);
    setCampaigns(INITIAL_CAMPAIGNS);
    setConfig(INITIAL_SYSTEM_CONFIG);
    localStorage.removeItem(STORAGE_KEYS.PROJECTS);
    localStorage.removeItem(STORAGE_KEYS.SUBSCRIBERS);
    localStorage.removeItem(STORAGE_KEYS.CAMPAIGNS);
    localStorage.removeItem(STORAGE_KEYS.CONFIG);
  };

  return (
    <AppContext.Provider
      value={{
        screen,
        setScreen,
        projects,
        subscribers,
        campaigns,
        config,
        addProject,
        updateProject,
        deleteProject,
        toggleFeatured,
        subscribe,
        deleteSubscriber,
        sendCampaign,
        deleteCampaign,
        updateConfig,
        resetToDefaults,
        selectedProject,
        setSelectedProject,
        isContactOpen,
        setIsContactOpen,
        isTelemetryOpen,
        setIsTelemetryOpen,
        is3DFullscreen,
        setIs3DFullscreen
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
