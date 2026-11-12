import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Project, Subscriber, NewsletterCampaign, SystemConfig, ScreenMode, TopicInterest, ContactMessage, ContactStatus } from '../types';
import { INITIAL_PROJECTS, INITIAL_SUBSCRIBERS, INITIAL_CAMPAIGNS, INITIAL_SYSTEM_CONFIG, INITIAL_CONTACTS } from './seedData';
import {
  listenToProjects,
  listenToSubscribers,
  listenToContacts,
  syncProjectToCloud,
  deleteProjectFromCloud,
  syncSubscriberToCloud,
  deleteSubscriberFromCloud,
  syncContactToCloud,
  deleteContactFromCloud
} from '../lib/firestoreService';
import { isFirebaseConfigured } from '../lib/firebase';

interface AppContextType {
  screen: ScreenMode;
  setScreen: (screen: ScreenMode) => void;
  projects: Project[];
  subscribers: Subscriber[];
  campaigns: NewsletterCampaign[];
  contacts: ContactMessage[];
  config: SystemConfig;
  
  // Database status
  dbStatus: 'connected' | 'syncing' | 'offline';
  lastSyncedAt: string;
  isCloudConnected: boolean;

  // Project actions
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  addProject: (project: Omit<Project, 'id' | 'updatedAt'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  toggleFeatured: (id: string) => void;
  toggleProjectSelection: (id: string) => void;
  selectAllProjects: (selected: boolean) => void;
  
  // Newsletter actions
  subscribe: (name: string, email: string, topic: TopicInterest) => { success: boolean; message: string };
  addSubscriber: (subscriber: { name: string; email: string; topic: TopicInterest; status?: 'ACTIVE' | 'UNSUBSCRIBED' }) => { success: boolean; message: string };
  updateSubscriberStatus: (id: string, status: 'ACTIVE' | 'UNSUBSCRIBED') => void;
  deleteSubscriber: (id: string) => void;
  sendCampaign: (data: { subject: string; previewText: string; content: string; targetTopic: TopicInterest | 'All' }) => void;
  deleteCampaign: (id: string) => void;

  // Contact actions
  addContact: (data: { name: string; email: string; message: string; notes?: string }) => { id: string; success: boolean; message: string };
  updateContactStatus: (id: string, status: ContactStatus, notes?: string) => void;
  deleteContact: (id: string) => void;
  
  // Config
  updateConfig: (updates: Partial<SystemConfig>) => void;
  resetToDefaults: () => void;
  
  // Modals & 3D view states
  isAdminOpen: boolean;
  setIsAdminOpen: (open: boolean) => void;
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
  PROJECTS: 'kinetic_projects_v7',
  SUBSCRIBERS: 'kinetic_subscribers_v5',
  CAMPAIGNS: 'kinetic_campaigns_v5',
  CONTACTS: 'kinetic_contacts_v2',
  CONFIG: 'kinetic_config_v6'
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [screen, setScreen] = useState<ScreenMode>('portfolio');
  const [dbStatus, setDbStatus] = useState<'connected' | 'syncing' | 'offline'>(
    isFirebaseConfigured ? 'syncing' : 'offline'
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(new Date().toLocaleTimeString());

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

  const [contacts, setContacts] = useState<ContactMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONTACTS);
      return saved ? JSON.parse(saved) : INITIAL_CONTACTS;
    } catch {
      return INITIAL_CONTACTS;
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
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [is3DFullscreen, setIs3DFullscreen] = useState(false);

  // ==========================================
  // REAL-TIME FIRESTORE CENTRALIZED DB LISTENERS
  // ==========================================
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setDbStatus('offline');
      return;
    }

    setDbStatus('syncing');

    const unsubscribeProjects = listenToProjects(
      cloudProjects => {
        if (cloudProjects.length > 0) {
          setProjects(cloudProjects);
          setDbStatus('connected');
          setLastSyncedAt(new Date().toLocaleTimeString());
        }
      },
      () => setDbStatus('offline')
    );

    const unsubscribeSubscribers = listenToSubscribers(
      cloudSubscribers => {
        if (cloudSubscribers.length > 0) {
          setSubscribers(cloudSubscribers);
          setDbStatus('connected');
          setLastSyncedAt(new Date().toLocaleTimeString());
        }
      },
      () => setDbStatus('offline')
    );

    const unsubscribeContacts = listenToContacts(
      cloudContacts => {
        if (cloudContacts.length > 0) {
          setContacts(cloudContacts);
          setDbStatus('connected');
          setLastSyncedAt(new Date().toLocaleTimeString());
        }
      },
      () => setDbStatus('offline')
    );

    return () => {
      unsubscribeProjects();
      unsubscribeSubscribers();
      unsubscribeContacts();
    };
  }, []);

  // Sync to local storage for instant offline cache and resilience
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
      localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(contacts));
    } catch (e) {
      console.warn('Storage failed', e);
    }
  }, [contacts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
    } catch (e) {
      console.warn('Storage failed', e);
    }
  }, [config]);

  // Project CRUD & Selection
  const toggleProjectSelection = (id: string) => {
    setProjects(prev =>
      prev.map(p => {
        if (p.id === id) {
          const updated = { ...p, selected: p.selected === false ? true : false };
          syncProjectToCloud(updated);
          return updated;
        }
        return p;
      })
    );
  };

  const selectAllProjects = (selected: boolean) => {
    setProjects(prev => {
      const updated = prev.map(p => ({ ...p, selected }));
      updated.forEach(p => syncProjectToCloud(p));
      return updated;
    });
  };

  // Project CRUD
  const addProject = (projectData: Omit<Project, 'id' | 'updatedAt'>) => {
    const newProject: Project = {
      ...projectData,
      id: `proj-${Date.now()}`,
      updatedAt: new Date().toISOString().split('T')[0],
      source: projectData.source || 'manual'
    };
    setProjects(prev => [newProject, ...prev]);
    syncProjectToCloud(newProject);
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev =>
      prev.map(p => {
        if (p.id === id) {
          const updated = { ...p, ...updates, updatedAt: new Date().toISOString().split('T')[0] };
          syncProjectToCloud(updated);
          return updated;
        }
        return p;
      })
    );
    if (selectedProject?.id === id) {
      setSelectedProject(prev => (prev ? { ...prev, ...updates } : null));
    }
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    deleteProjectFromCloud(id);
    if (selectedProject?.id === id) {
      setSelectedProject(null);
    }
  };

  const toggleFeatured = (id: string) => {
    setProjects(prev =>
      prev.map(p => {
        if (p.id === id) {
          const updated = { ...p, featured: !p.featured };
          syncProjectToCloud(updated);
          return updated;
        }
        return p;
      })
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
    syncSubscriberToCloud(newSub);
    return { success: true, message: 'NODE_INITIALIZED: Connected to Kinetic Dispatch protocol' };
  };

  const addSubscriber = (data: { name: string; email: string; topic: TopicInterest; status?: 'ACTIVE' | 'UNSUBSCRIBED' }) => {
    const trimmedEmail = data.email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return { success: false, message: 'Valid email required' };
    }
    const exists = subscribers.some(s => s.email.toLowerCase() === trimmedEmail);
    if (exists) {
      return { success: false, message: 'Subscriber with this email address already exists' };
    }

    const newSub: Subscriber = {
      id: `sub-${Date.now()}`,
      name: data.name.trim() || 'Anonymous Engineer',
      email: trimmedEmail,
      topic: data.topic,
      status: data.status || 'ACTIVE',
      subscribedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    setSubscribers(prev => [newSub, ...prev]);
    syncSubscriberToCloud(newSub);
    return { success: true, message: 'Subscriber added successfully' };
  };

  const updateSubscriberStatus = (id: string, status: 'ACTIVE' | 'UNSUBSCRIBED') => {
    setSubscribers(prev =>
      prev.map(s => {
        if (s.id === id) {
          const updated = { ...s, status };
          syncSubscriberToCloud(updated);
          return updated;
        }
        return s;
      })
    );
  };

  const deleteSubscriber = (id: string) => {
    setSubscribers(prev => prev.filter(s => s.id !== id));
    deleteSubscriberFromCloud(id);
  };

  // Contact actions
  const addContact = (data: { name: string; email: string; message: string; notes?: string }) => {
    const trimmedEmail = data.email.trim().toLowerCase();
    const trimmedName = data.name.trim();
    const trimmedMessage = data.message.trim();

    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedMessage) {
      return { id: '', success: false, message: 'Valid email and message required' };
    }

    const newContact: ContactMessage = {
      id: `cnt-${Date.now()}`,
      name: trimmedName || 'Anonymous Inquirer',
      email: trimmedEmail,
      message: trimmedMessage,
      submittedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'UNREAD',
      notes: data.notes || ''
    };

    setContacts(prev => [newContact, ...prev]);
    syncContactToCloud(newContact);
    return { id: newContact.id, success: true, message: 'Inquiry received and logged to database.' };
  };

  const updateContactStatus = (id: string, status: ContactStatus, notes?: string) => {
    setContacts(prev =>
      prev.map(c => {
        if (c.id === id) {
          const updated = { ...c, status, notes: notes !== undefined ? notes : c.notes };
          syncContactToCloud(updated);
          return updated;
        }
        return c;
      })
    );
  };

  const deleteContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
    deleteContactFromCloud(id);
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
    setContacts(INITIAL_CONTACTS);
    setConfig(INITIAL_SYSTEM_CONFIG);
    localStorage.removeItem(STORAGE_KEYS.PROJECTS);
    localStorage.removeItem(STORAGE_KEYS.SUBSCRIBERS);
    localStorage.removeItem(STORAGE_KEYS.CAMPAIGNS);
    localStorage.removeItem(STORAGE_KEYS.CONTACTS);
    localStorage.removeItem(STORAGE_KEYS.CONFIG);
  };

  return (
    <AppContext.Provider
      value={{
        screen,
        setScreen,
        projects,
        setProjects,
        subscribers,
        campaigns,
        contacts,
        config,
        dbStatus,
        lastSyncedAt,
        isCloudConnected: isFirebaseConfigured,
        addProject,
        updateProject,
        deleteProject,
        toggleFeatured,
        toggleProjectSelection,
        selectAllProjects,
        subscribe,
        addSubscriber,
        updateSubscriberStatus,
        deleteSubscriber,
        sendCampaign,
        deleteCampaign,
        addContact,
        updateContactStatus,
        deleteContact,
        updateConfig,
        resetToDefaults,
        isAdminOpen,
        setIsAdminOpen,
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
