import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { Project, Subscriber, ContactMessage } from '../types';
import { INITIAL_PROJECTS, INITIAL_SUBSCRIBERS, INITIAL_CONTACTS } from '../data/seedData';

const COLLECTIONS = {
  PROJECTS: 'projects',
  SUBSCRIBERS: 'newsletter_subscribers',
  CONTACTS: 'contact_inquiries'
} as const;

// Ensure document IDs are clean and conform to Firestore constraints
function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
}

/**
 * Remove any undefined properties recursively to ensure Firestore document compliance
 */
function cleanForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = cleanForFirestore(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

/**
 * Real-time listener for Centralized Projects
 */
export function listenToProjects(
  onUpdate: (projects: Project[]) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const colRef = collection(db, COLLECTIONS.PROJECTS);
    const q = query(colRef);

    let isInitialCheckDone = false;

    return onSnapshot(
      q,
      async snapshot => {
        if (snapshot.empty && !isInitialCheckDone) {
          isInitialCheckDone = true;
          // Centralized DB is fresh: seed with initial protected architecture projects
          try {
            const batch = writeBatch(db);
            INITIAL_PROJECTS.forEach(proj => {
              const docRef = doc(db, COLLECTIONS.PROJECTS, sanitizeId(proj.id));
              batch.set(docRef, cleanForFirestore(proj));
            });
            await batch.commit();
            onUpdate(INITIAL_PROJECTS);
          } catch (seedErr) {
            console.warn('Projects seeding notice:', seedErr);
            onUpdate(INITIAL_PROJECTS);
          }
          return;
        }

        if (!snapshot.empty) {
          isInitialCheckDone = true;
          const items: Project[] = [];
          snapshot.forEach(docSnap => {
            items.push(docSnap.data() as Project);
          });
          onUpdate(items);
        }
      },
      err => {
        console.warn('Firestore projects listener fallback to local cache:', err);
        if (onError) onError(err);
      }
    );
  } catch (e) {
    console.warn('Firestore projects unavailable:', e);
    return () => {};
  }
}

/**
 * Real-time listener for Centralized Newsletter Subscribers
 */
export function listenToSubscribers(
  onUpdate: (subscribers: Subscriber[]) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const colRef = collection(db, COLLECTIONS.SUBSCRIBERS);
    const q = query(colRef);

    let isInitialCheckDone = false;

    return onSnapshot(
      q,
      async snapshot => {
        if (snapshot.empty && !isInitialCheckDone) {
          isInitialCheckDone = true;
          try {
            const batch = writeBatch(db);
            INITIAL_SUBSCRIBERS.forEach(sub => {
              const docRef = doc(db, COLLECTIONS.SUBSCRIBERS, sanitizeId(sub.id));
              batch.set(docRef, cleanForFirestore(sub));
            });
            await batch.commit();
            onUpdate(INITIAL_SUBSCRIBERS);
          } catch (seedErr) {
            console.warn('Subscribers seeding notice:', seedErr);
            onUpdate(INITIAL_SUBSCRIBERS);
          }
          return;
        }

        if (!snapshot.empty) {
          isInitialCheckDone = true;
          const items: Subscriber[] = [];
          snapshot.forEach(docSnap => {
            items.push(docSnap.data() as Subscriber);
          });
          onUpdate(items);
        }
      },
      err => {
        console.warn('Firestore subscribers listener fallback to local cache:', err);
        if (onError) onError(err);
      }
    );
  } catch (e) {
    console.warn('Firestore subscribers unavailable:', e);
    return () => {};
  }
}

/**
 * Real-time listener for Centralized Contact Inquiries
 */
export function listenToContacts(
  onUpdate: (contacts: ContactMessage[]) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const colRef = collection(db, COLLECTIONS.CONTACTS);
    const q = query(colRef);

    let isInitialCheckDone = false;

    return onSnapshot(
      q,
      async snapshot => {
        if (snapshot.empty && !isInitialCheckDone) {
          isInitialCheckDone = true;
          try {
            const batch = writeBatch(db);
            INITIAL_CONTACTS.forEach(contact => {
              const docRef = doc(db, COLLECTIONS.CONTACTS, sanitizeId(contact.id));
              batch.set(docRef, cleanForFirestore(contact));
            });
            await batch.commit();
            onUpdate(INITIAL_CONTACTS);
          } catch (seedErr) {
            console.warn('Contacts seeding notice:', seedErr);
            onUpdate(INITIAL_CONTACTS);
          }
          return;
        }

        if (!snapshot.empty) {
          isInitialCheckDone = true;
          const items: ContactMessage[] = [];
          snapshot.forEach(docSnap => {
            items.push(docSnap.data() as ContactMessage);
          });
          onUpdate(items);
        }
      },
      err => {
        console.warn('Firestore contacts listener fallback to local cache:', err);
        if (onError) onError(err);
      }
    );
  } catch (e) {
    console.warn('Firestore contacts unavailable:', e);
    return () => {};
  }
}

// ==========================================
// CENTRALIZED DB MUTATIONS
// ==========================================

export async function syncProjectToCloud(project: Project): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.PROJECTS, sanitizeId(project.id));
    await setDoc(docRef, cleanForFirestore(project), { merge: true });
  } catch (err) {
    console.warn('Cloud sync project error:', err);
  }
}

export async function deleteProjectFromCloud(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.PROJECTS, sanitizeId(id));
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Cloud delete project error:', err);
  }
}

export async function syncSubscriberToCloud(subscriber: Subscriber): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.SUBSCRIBERS, sanitizeId(subscriber.id));
    await setDoc(docRef, cleanForFirestore(subscriber), { merge: true });
  } catch (err) {
    console.warn('Cloud sync subscriber error:', err);
  }
}

export async function deleteSubscriberFromCloud(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.SUBSCRIBERS, sanitizeId(id));
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Cloud delete subscriber error:', err);
  }
}

export async function syncContactToCloud(contact: ContactMessage): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.CONTACTS, sanitizeId(contact.id));
    await setDoc(docRef, cleanForFirestore(contact), { merge: true });
  } catch (err) {
    console.warn('Cloud sync contact inquiry error:', err);
  }
}

export async function deleteContactFromCloud(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.CONTACTS, sanitizeId(id));
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Cloud delete contact error:', err);
  }
}
