// SwipeSkills Firebase Service
// Placez ce fichier dans : services/firebaseService.ts

import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

// ============================================
// TYPES
// ============================================

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'formateur' | 'apprenant';
  bio?: string;
  profileEmoji?: string;
  photoProfile?: string;
  coverImage?: string;
  createdAt: string;
  stats: {
    videosWatched: number;
    streak: number;
    totalMinutes: number;
  };
  badges?: string[];
  favorites?: string[];
  watchHistory?: string[];
  interests?: string[];
}

// ============================================
// AUTHENTICATION
// ============================================

/**
 * Connexion avec email et mot de passe
 */
export async function signInWithEmail(email: string, password: string): Promise<User> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    console.error('Erreur connexion:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
}

/**
 * Inscription avec email, mot de passe et informations de profil
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  name: string,
  role: 'formateur' | 'apprenant'
): Promise<User> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Mettre à jour le displayName de Firebase Auth
    await updateProfile(user, { displayName: name });

    // Créer le profil dans Firestore
    await setDoc(doc(db, 'users', user.uid), {
      name,
      email,
      role,
      profileEmoji: role === 'formateur' ? '🎓' : '👩‍🎓',
      createdAt: new Date().toISOString(),
      stats: {
        videosWatched: 0,
        streak: 0,
        totalMinutes: 0,
      },
      badges: [],
      favorites: [],
      watchHistory: [],
      interests: [],
    });

    return user;
  } catch (error: any) {
    console.error('Erreur inscription:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
}

/**
 * Déconnexion
 */
export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Erreur déconnexion:', error);
    throw error;
  }
}

/**
 * Réinitialisation du mot de passe
 */
export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error('Erreur reset password:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
}

// ============================================
// USER PROFILE
// ============================================

/**
 * Récupérer le profil utilisateur
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: uid, ...docSnap.data() } as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Erreur récupération profil:', error);
    return null;
  }
}

/**
 * Mettre à jour le profil utilisateur
 */
export async function updateUserProfile(
  uid: string,
  updates: Partial<UserProfile>
): Promise<void> {
  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    throw error;
  }
}

/**
 * Sauvegarder les informations de profil
 */
export async function saveUserProfile(profileData: Partial<UserProfile>): Promise<void> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Utilisateur non connecté');
    }

    await updateUserProfile(currentUser.uid, profileData);
  } catch (error) {
    console.error('Erreur sauvegarde profil:', error);
    throw error;
  }
}

// ============================================
// FAVORITES & HISTORY
// ============================================

/**
 * Ajouter une vidéo aux favoris
 */
export async function addToFavorites(videoId: string): Promise<void> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Utilisateur non connecté');

    const profile = await getUserProfile(currentUser.uid);
    if (!profile) throw new Error('Profil introuvable');

    const favorites = profile.favorites || [];
    if (!favorites.includes(videoId)) {
      favorites.push(videoId);
      await updateUserProfile(currentUser.uid, { favorites });
    }
  } catch (error) {
    console.error('Erreur ajout favoris:', error);
    throw error;
  }
}

/**
 * Retirer une vidéo des favoris
 */
export async function removeFromFavorites(videoId: string): Promise<void> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Utilisateur non connecté');

    const profile = await getUserProfile(currentUser.uid);
    if (!profile) throw new Error('Profil introuvable');

    const favorites = (profile.favorites || []).filter(id => id !== videoId);
    await updateUserProfile(currentUser.uid, { favorites });
  } catch (error) {
    console.error('Erreur suppression favoris:', error);
    throw error;
  }
}

/**
 * Ajouter une vidéo à l'historique
 */
export async function addToWatchHistory(videoId: string): Promise<void> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Utilisateur non connecté');

    const profile = await getUserProfile(currentUser.uid);
    if (!profile) throw new Error('Profil introuvable');

    const watchHistory = profile.watchHistory || [];
    
    // Retirer si déjà présent pour le remettre en premier
    const filteredHistory = watchHistory.filter(id => id !== videoId);
    filteredHistory.unshift(videoId);

    // Garder seulement les 100 dernières vidéos
    const limitedHistory = filteredHistory.slice(0, 100);

    await updateUserProfile(currentUser.uid, { watchHistory: limitedHistory });
  } catch (error) {
    console.error('Erreur ajout historique:', error);
    throw error;
  }
}

// ============================================
// STATS & PROGRESS
// ============================================

/**
 * Mettre à jour les statistiques utilisateur
 */
export async function updateUserStats(
  videoDuration: number,
  earnedBadge?: string
): Promise<void> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Utilisateur non connecté');

    const profile = await getUserProfile(currentUser.uid);
    if (!profile) throw new Error('Profil introuvable');

    const updates: any = {
      stats: {
        ...profile.stats,
        videosWatched: profile.stats.videosWatched + 1,
        totalMinutes: profile.stats.totalMinutes + Math.ceil(videoDuration / 60),
      },
    };

    if (earnedBadge && !profile.badges?.includes(earnedBadge)) {
      updates.badges = [...(profile.badges || []), earnedBadge];
    }

    await updateUserProfile(currentUser.uid, updates);
  } catch (error) {
    console.error('Erreur mise à jour stats:', error);
    throw error;
  }
}

/**
 * Incrémenter le streak
 */
export async function incrementStreak(): Promise<void> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Utilisateur non connecté');

    const profile = await getUserProfile(currentUser.uid);
    if (!profile) throw new Error('Profil introuvable');

    await updateUserProfile(currentUser.uid, {
      stats: {
        ...profile.stats,
        streak: profile.stats.streak + 1,
      },
    });
  } catch (error) {
    console.error('Erreur increment streak:', error);
    throw error;
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Obtenir un message d'erreur lisible
 */
function getAuthErrorMessage(errorCode: string): string {
  const errorMessages: { [key: string]: string } = {
    'auth/email-already-in-use': 'Cette adresse email est déjà utilisée',
    'auth/invalid-email': 'Adresse email invalide',
    'auth/operation-not-allowed': 'Opération non autorisée',
    'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères',
    'auth/user-disabled': 'Ce compte a été désactivé',
    'auth/user-not-found': 'Aucun compte trouvé avec cet email',
    'auth/wrong-password': 'Mot de passe incorrect',
    'auth/invalid-credential': 'Identifiants invalides',
    'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard',
    'auth/network-request-failed': 'Erreur réseau. Vérifiez votre connexion',
  };

  return errorMessages[errorCode] || 'Une erreur est survenue';
}

/**
 * Vérifier si l'utilisateur est connecté
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Attendre que l'authentification soit initialisée
 */
export function waitForAuth(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });
}