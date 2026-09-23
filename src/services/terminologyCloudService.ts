import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import { TerminologyProfile } from '../types';
import { DEFAULT_TERMINOLOGY_PROFILES } from '../data/defaultTerminology';

const COLLECTION_NAME = 'terminology_profiles';

/**
 * Helper to race a promise with a timeout so network stalls never hang the UI
 */
function withTimeout<T>(promise: Promise<T>, ms: number, fallbackValue: T): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallbackValue), ms);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timer);
      return res;
    }),
    timeoutPromise,
  ]);
}

/**
 * Fetch all profiles from Firestore cloud database.
 * Returns null if the collection has not been seeded yet or on timeout/offline.
 */
export async function fetchCloudProfiles(): Promise<TerminologyProfile[] | null> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    // Wrap getDocs with a 4-second timeout to fall back gracefully if offline
    const snap = await withTimeout(getDocs(colRef), 4000, null);
    if (!snap || snap.empty) {
      return null;
    }
    const profiles: TerminologyProfile[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.id && data.name && Array.isArray(data.items)) {
        profiles.push({
          id: data.id,
          name: data.name,
          persianName: data.persianName || data.name,
          items: data.items,
        });
      }
    });

    // Keep consistent order: ict, crypto, general_tech, then custom
    const orderMap: Record<string, number> = { ict: 1, crypto: 2, general_tech: 3 };
    profiles.sort((a, b) => (orderMap[a.id] || 99) - (orderMap[b.id] || 99));

    return profiles.length > 0 ? profiles : null;
  } catch (error) {
    console.warn('Notice: Fetching profiles from cloud operating in cached/offline mode:', error);
    return null;
  }
}

/**
 * Save or update a single profile in Firestore cloud database.
 */
export async function saveProfileToCloud(profile: TerminologyProfile): Promise<boolean> {
  try {
    const docRef = doc(db, COLLECTION_NAME, profile.id);
    const savePromise = setDoc(docRef, {
      id: profile.id,
      name: profile.name,
      persianName: profile.persianName,
      items: profile.items,
      updatedAt: new Date().toISOString(),
    });
    // With offline persistence enabled, setDoc writes locally immediately and syncs in background.
    // Wrap with timeout to prevent blocking in edge network conditions.
    const result = await withTimeout(savePromise.then(() => true), 5000, true);
    return result;
  } catch (error) {
    console.warn(`Notice: Saving profile ${profile.id} to cloud (local cache preserved):`, error);
    return false;
  }
}

/**
 * Save all profiles to Firestore cloud database.
 */
export async function saveAllProfilesToCloud(profiles: TerminologyProfile[]): Promise<boolean> {
  try {
    const promises = profiles.map((p) => saveProfileToCloud(p));
    await Promise.all(promises);
    return true;
  } catch (error) {
    console.warn('Notice: Saving all profiles to cloud (local cache preserved):', error);
    return false;
  }
}

/**
 * Delete a profile from Firestore cloud database.
 */
export async function deleteProfileFromCloud(profileId: string): Promise<boolean> {
  try {
    const docRef = doc(db, COLLECTION_NAME, profileId);
    const deletePromise = deleteDoc(docRef);
    const result = await withTimeout(deletePromise.then(() => true), 5000, true);
    return result;
  } catch (error) {
    console.warn(`Notice: Deleting profile ${profileId} from cloud:`, error);
    return false;
  }
}

/**
 * Listen for real-time updates from Firestore cloud database.
 * Calls onUpdate with fresh profiles whenever changes occur in cloud.
 */
export function subscribeToCloudProfiles(
  onUpdate: (profiles: TerminologyProfile[]) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    return onSnapshot(
      colRef,
      (snapshot) => {
        if (snapshot.empty) return;
        const list: TerminologyProfile[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && data.id && data.name && Array.isArray(data.items)) {
            list.push({
              id: data.id,
              name: data.name,
              persianName: data.persianName || data.name,
              items: data.items,
            });
          }
        });
        const orderMap: Record<string, number> = { ict: 1, crypto: 2, general_tech: 3 };
        list.sort((a, b) => (orderMap[a.id] || 99) - (orderMap[b.id] || 99));
        if (list.length > 0) {
          onUpdate(list);
        }
      },
      (err) => {
        console.warn('Cloud profiles subscription notice:', err);
        if (onError) onError(err);
      }
    );
  } catch (err: any) {
    console.warn('Failed to subscribe to cloud profiles:', err);
    return () => {};
  }
}

/**
 * Initialize Cloud Profiles with initial seed if empty.
 * Ensures that deleted words are NEVER resurrected on refresh, and purges any
 * previously deleted terms from the cloud database.
 */
export async function initializeCloudProfiles(
  localProfiles: TerminologyProfile[],
  deletedTermsBlacklist: string[] = []
): Promise<TerminologyProfile[]> {
  try {
    const cloudProfiles = await fetchCloudProfiles();
    if (cloudProfiles && cloudProfiles.length > 0) {
      // Cloud database already has profiles - Cloud is the source of truth!
      const blacklistSet = new Set(
        deletedTermsBlacklist.map((k) => k.toLowerCase().trim()).filter(Boolean)
      );
      let needsCloudUpdate = false;

      let cleaned = cloudProfiles.map((cp) => {
        if (blacklistSet.size === 0) return cp;
        const remainingItems = cp.items.filter(
          (item) => !blacklistSet.has(item.english.toLowerCase().trim())
        );
        if (remainingItems.length !== cp.items.length) {
          needsCloudUpdate = true;
          return { ...cp, items: remainingItems };
        }
        return cp;
      });

      // If user created custom profiles locally that don't exist in cloud yet, add them
      const cloudProfileIds = new Set(cloudProfiles.map((p) => p.id));
      const newCustomProfiles = localProfiles.filter((lp) => !cloudProfileIds.has(lp.id));
      if (newCustomProfiles.length > 0) {
        cleaned = [...cleaned, ...newCustomProfiles];
        needsCloudUpdate = true;
      }

      if (needsCloudUpdate) {
        // Immediately persist the purged/updated profiles to cloud
        await saveAllProfilesToCloud(cleaned);
      }

      return cleaned;
    } else {
      // Cloud database is empty - seed with user's local profiles (or defaults)
      const profilesToSeed =
        localProfiles && localProfiles.length > 0 ? localProfiles : DEFAULT_TERMINOLOGY_PROFILES;
      await saveAllProfilesToCloud(profilesToSeed);
      return profilesToSeed;
    }
  } catch (e) {
    console.error('initializeCloudProfiles error:', e);
    return localProfiles;
  }
}
