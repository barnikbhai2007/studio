'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

// IMPORTANT: Updated to handle fallback more reliably for non-Firebase Hosting (e.g. Netlify)
export function initializeFirebase() {
  if (!getApps().length) {
    let firebaseApp;
    // Check if we are running on a standard Firebase Hosting environment
    // If not (like on Netlify), we should use the config object directly
    const isFirebaseHosting = typeof window !== 'undefined' && 
      (window.location.hostname.endsWith('.web.app') || window.location.hostname.endsWith('.firebaseapp.com'));

    if (isFirebaseHosting) {
      try {
        firebaseApp = initializeApp();
      } catch (e) {
        firebaseApp = initializeApp(firebaseConfig);
      }
    } else {
      firebaseApp = initializeApp(firebaseConfig);
    }

    return getSdks(firebaseApp);
  }

  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
