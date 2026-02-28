// Firebase configuration and Firestore helper functions (modular SDK).
// IMPORTANT: Replace the firebaseConfig object below with your actual config
// from the Firebase console (Project Settings > General > Your apps > Web app).

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Replace these placeholder values with your real Firebase project config.
// Example shape:
// const firebaseConfig = {
//   apiKey: "YOUR_API_KEY",
//   authDomain: "your-project-id.firebaseapp.com",
//   projectId: "your-project-id",
//   storageBucket: "your-project-id.appspot.com",
//   messagingSenderId: "SENDER_ID",
//   appId: "APP_ID",
// };
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// Initialize Firebase and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Collection reference for job applications
const jobApplicationsCol = collection(db, "jobApplications");

/**
 * Adds a new job application document to Firestore.
 * createdAt is stored as a Firestore server timestamp for consistent ordering.
 */
export async function addJobApplication(job) {
  const payload = {
    companyName: job.companyName,
    jobRole: job.jobRole,
    applicationDate: job.applicationDate, // ISO date string (YYYY-MM-DD)
    status: job.status,
    notes: job.notes ?? "",
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(jobApplicationsCol, payload);
  return docRef.id;
}

/**
 * Subscribes to real-time changes in the jobApplications collection.
 *
 * The callback receives an array of applications ordered by applicationDate
 * (and by createdAt as a secondary, implicit order when dates tie).
 *
 * Returns an unsubscribe function to stop listening.
 */
export function listenToJobApplications(onJobsChange, onError) {
  const q = query(jobApplicationsCol, orderBy("applicationDate", "desc"));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const jobs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      onJobsChange(jobs);
    },
    (error) => {
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Updates an existing job application by document id.
 */
export async function updateJobApplication(id, updates) {
  const docRef = doc(db, "jobApplications", id);
  await updateDoc(docRef, {
    companyName: updates.companyName,
    jobRole: updates.jobRole,
    applicationDate: updates.applicationDate,
    status: updates.status,
    notes: updates.notes ?? "",
  });
}

/**
 * Deletes a job application document by id.
 */
export async function deleteJobApplication(id) {
  const docRef = doc(db, "jobApplications", id);
  await deleteDoc(docRef);
}

