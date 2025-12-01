// src/firebase.ts
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  fetchSignInMethodsForEmail,
} from "firebase/auth";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  deleteDoc,
} from "firebase/firestore";

import { getDatabase, ref, set as rtdbSet, get as rtdbGet } from "firebase/database";

/**
 * Your firebase config (keep as you had it)
 */
const firebaseConfig = {
  apiKey: "AIzaSyC9EXClZus1Zi7221Vx7ZnxO-72Jwh31jw",
  authDomain: "winter-afa2d.firebaseapp.com",
  projectId: "winter-afa2d",
  storageBucket: "winter-afa2d.firebasestorage.app",
  messagingSenderId: "566307644850",
  appId: "1:566307644850:web:897dab1e6b3139903ab0ab",
  databaseURL: "https://winter-afa2d-default-rtdb.firebaseio.com",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

/* ============================
   AUTH
   ============================ */

export const loginEmail = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const signUpEmail = async (email: string, password: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const loginGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  return userCredential.user;
};

export const logout = async () => {
  await signOut(auth);
};

export const getProviderMethods = async (email: string) => {
  return await fetchSignInMethodsForEmail(auth, email);
};

/* ============================
   ROLES & PROFILES
   ============================ */

export const setUserRole = async (uid: string, role: string) => {
  await setDoc(doc(db, "users", uid), { role }, { merge: true });
  try {
    await rtdbSet(ref(rtdb, `users/${uid}/role`), role);
  } catch (e) {
    console.warn("RTDB role set failed:", e);
  }
};

export const getUserRole = async (uid: string) => {
  const docSnap = await getDoc(doc(db, "users", uid));
  if (docSnap.exists() && (docSnap.data() as any).role) {
    return (docSnap.data() as any).role;
  }
  try {
    const snapshot: any = await rtdbGet(ref(rtdb, `users/${uid}/role`));
    if (snapshot && snapshot.exists && snapshot.val) {
      return snapshot.val();
    }
  } catch (e) {}
  return null;
};

export const createUserProfile = async (uid: string, profileData: any) => {
  await setDoc(
    doc(db, "users", uid),
    {
      ...profileData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );
};

export const getUserProfile = async (uid: string) => {
  const docSnap = await getDoc(doc(db, "users", uid));
  if (docSnap.exists()) {
    return docSnap.data();
  }
  return null;
};

export const updateUserProfile = async (uid: string, updates: any) => {
  await updateDoc(doc(db, "users", uid), {
    ...updates,
    updatedAt: Timestamp.now(),
  });
};

/* ============================
   RIDES (create / realtime / updates)
   ============================ */

export const createRideRequest = async (rideData: any) => {
  const rideRef = await addDoc(collection(db, "rides"), {
    ...rideData,
    status: "pending",
    requestTime: Timestamp.now(),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return rideRef.id;
};

export const getStudentRides = async (studentId: string) => {
  const q = query(collection(db, "rides"), where("studentId", "==", studentId), orderBy("createdAt", "desc"));
  const qSnap = await getDocs(q);
  return qSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getRideById = async (rideId: string) => {
  const snap = await getDoc(doc(db, "rides", rideId));
  if (!snap.exists()) throw new Error("Ride not found");
  return { id: snap.id, ...snap.data() };
};

export const subscribeToStudentRides = (studentId: string, callback: (rides: any[]) => void) => {
  const q = query(collection(db, "rides"), where("studentId", "==", studentId), orderBy("createdAt", "desc"));
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const rides = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(rides);
    },
    (error) => {
      console.error("Error listening rides:", error);
      callback([]);
    }
  );
  return unsubscribe;
};

export const subscribeToRide = (rideId: string, callback: (ride: any) => void) => {
  const docRef = doc(db, "rides", rideId);
  const unsubscribe = onSnapshot(
    docRef,
    (snap) => {
      callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    },
    (error) => {
      console.error("Error listening to ride:", error);
      callback(null);
    }
  );
  return unsubscribe;
};

export const updateRideStatus = async (rideId: string, status: string, updates?: any) => {
  await updateDoc(doc(db, "rides", rideId), {
    status,
    ...updates,
    updatedAt: Timestamp.now(),
  });
};

export const cancelRide = async (rideId: string) => {
  await updateDoc(doc(db, "rides", rideId), {
    status: "cancelled",
    cancelledAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
};

/* ============================
   DRIVER / ADMIN helpers
   ============================ */

export const getPendingRides = async () => {
  const q = query(collection(db, "rides"), where("status", "==", "pending"), orderBy("createdAt", "desc"));
  const qSnap = await getDocs(q);
  return qSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getAvailableRides = getPendingRides;

export const getDriverRides = async (driverId: string) => {
  const q = query(collection(db, "rides"), where("driverId", "==", driverId), orderBy("createdAt", "desc"));
  const qSnap = await getDocs(q);
  return qSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * assignRide
 * Admin uses this to assign a pending ride to a driver.
 * driverData should include driverId, driverName, vehicleNumber, driverPhone (optional)
 */
export const assignRide = async (rideId: string, driverData: any) => {
  // set ride driver fields + set status to 'accepted' and acceptedAt
  await updateDoc(doc(db, "rides", rideId), {
    driverId: driverData.driverId,
    driverName: driverData.driverName,
    driverPhone: driverData.driverPhone || null,
    vehicleNumber: driverData.vehicleNumber || null,
    status: "accepted",
    acceptedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
};

/**
 * startRide
 * Called by the driver when they start the ride (from Driver Dashboard).
 * Also sets status 'in-progress'
 */
export const startRide = async (rideId: string, driverId?: string) => {
  await updateDoc(doc(db, "rides", rideId), {
    status: "in-progress",
    startedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
};

/**
 * acceptRide (alias/backwards-compatible)
 */
export const acceptRide = assignRide;

/**
 * updateDriverLocation
 * Writes a driverLocation object inside the ride doc so subscribers see it live.
 */
export const updateDriverLocation = async (rideId: string, lat: number, lng: number) => {
  await updateDoc(doc(db, "rides", rideId), {
    driverLocation: { lat, lng, timestamp: Timestamp.now() },
    updatedAt: Timestamp.now(),
  });
};

/* ============================
   Misc
   ============================ */

export const onAuthChange = (cb: (user: any) => void) => {
  return onAuthStateChanged(auth, cb);
};

export default app;
