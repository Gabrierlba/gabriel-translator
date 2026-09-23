import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { TerminologyProfile, TerminologyItem } from '../types';
import { DEFAULT_TERMINOLOGY_PROFILES } from '../data/defaultTerminology';

const PROFILES_COLLECTION = 'terminology_profiles';

/**
 * Fetch all saved profiles from Firestore.
 * If empty in Firestore, falls back to default profiles and populates Firestore.
 */
export async function loadProfilesFromFirestore(): Promise<TerminologyProfile[]> {
  try {
    const colRef = collection(db, PROFILES_COLLECTION);
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
      // Seed default profiles into Firestore
      await seedDefaultProfiles(DEFAULT_TERMINOLOGY_PROFILES);
      return DEFAULT_TERMINOLOGY_PROFILES;
    }

    const loadedProfiles: TerminologyProfile[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      loadedProfiles.push({
        id: docSnap.id,
        name: data.name || docSnap.id,
        persianName: data.persianName || data.name || docSnap.id,
        items: Array.isArray(data.items) ? data.items : [],
      });
    });

    // Ensure all default profiles exist in loaded list
    for (const def of DEFAULT_TERMINOLOGY_PROFILES) {
      if (!loadedProfiles.some((p) => p.id === def.id)) {
        await saveProfileToFirestore(def);
        loadedProfiles.push(def);
      }
    }

    return loadedProfiles;
  } catch (error) {
    console.error('Error loading profiles from Firestore:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time changes in terminology profiles
 */
export function subscribeToProfiles(
  onUpdate: (profiles: TerminologyProfile[]) => void,
  onError?: (error: unknown) => void
) {
  const colRef = collection(db, PROFILES_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate(DEFAULT_TERMINOLOGY_PROFILES);
        return;
      }

      const profiles: TerminologyProfile[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        profiles.push({
          id: docSnap.id,
          name: data.name || docSnap.id,
          persianName: data.persianName || data.name || docSnap.id,
          items: Array.isArray(data.items) ? data.items : [],
        });
      });

      onUpdate(profiles);
    },
    (err) => {
      console.warn('Firestore subscription error, falling back to local state:', err);
      onError?.(err);
    }
  );
}

/**
 * Save or update an entire profile in Firestore
 */
export async function saveProfileToFirestore(profile: TerminologyProfile): Promise<void> {
  try {
    const docRef = doc(db, PROFILES_COLLECTION, profile.id);
    await setDoc(
      docRef,
      {
        id: profile.id,
        name: profile.name,
        persianName: profile.persianName,
        items: profile.items,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error(`Error saving profile ${profile.id} to Firestore:`, error);
    throw error;
  }
}

/**
 * Add a single term to a profile in Firestore
 */
export async function addTermToFirestore(
  profileId: string,
  newTerm: TerminologyItem,
  currentItems: TerminologyItem[]
): Promise<void> {
  const updatedItems = [...currentItems, newTerm];
  const docRef = doc(db, PROFILES_COLLECTION, profileId);
  await setDoc(
    docRef,
    {
      items: updatedItems,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Update an existing term in Firestore
 */
export async function updateTermInFirestore(
  profileId: string,
  termId: string,
  english: string,
  persian: string,
  currentItems: TerminologyItem[]
): Promise<void> {
  const updatedItems = currentItems.map((item) =>
    item.id === termId ? { ...item, english, persian } : item
  );
  const docRef = doc(db, PROFILES_COLLECTION, profileId);
  await setDoc(
    docRef,
    {
      items: updatedItems,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Delete a term from a profile in Firestore
 */
export async function deleteTermFromFirestore(
  profileId: string,
  termId: string,
  currentItems: TerminologyItem[]
): Promise<void> {
  const updatedItems = currentItems.filter((item) => item.id !== termId);
  const docRef = doc(db, PROFILES_COLLECTION, profileId);
  await setDoc(
    docRef,
    {
      items: updatedItems,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Reset profile back to defaults in Firestore
 */
export async function resetProfileInFirestore(profileId: string): Promise<TerminologyProfile | null> {
  const def = DEFAULT_TERMINOLOGY_PROFILES.find((p) => p.id === profileId);
  if (!def) return null;

  const docRef = doc(db, PROFILES_COLLECTION, profileId);
  await setDoc(
    docRef,
    {
      id: def.id,
      name: def.name,
      persianName: def.persianName,
      items: def.items,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  return def;
}

/**
 * Seed all default profiles into Firestore
 */
async function seedDefaultProfiles(profiles: TerminologyProfile[]): Promise<void> {
  for (const prof of profiles) {
    try {
      const docRef = doc(db, PROFILES_COLLECTION, prof.id);
      await setDoc(docRef, {
        id: prof.id,
        name: prof.name,
        persianName: prof.persianName,
        items: prof.items,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn(`Failed to seed profile ${prof.id}:`, e);
    }
  }
}
