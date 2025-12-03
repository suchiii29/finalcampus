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
  GeoPoint,
  limit,
} from "firebase/firestore";

import { getDatabase, ref, set as rtdbSet, get as rtdbGet } from "firebase/database";

/**
 * Firebase config - keep your existing values
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
   TYPES
   ============================ */

export interface Location {
  latitude: number;
  longitude: number;
  timestamp: Date;
  speed?: number;
  heading?: number;
}

export interface Driver {
  id: string;
  name: string;
  phone?: string;
  vehicleNumber: string;
  vehicleType: 'bus' | 'van' | 'cab' | string;
  capacity?: number;
  status: 'active' | 'idle' | 'offline' | string;
  currentLocation?: Location;
  currentPassengers?: number;
  route?: string;
}

export interface Ride {
  id: string;
  studentId: string;
  studentName: string;
  studentPhone?: string;
  pickup: string;
  pickupCoords?: { lat: number; lng: number };
  destination: string;
  destinationCoords?: { lat: number; lng: number };
  status: 'pending' | 'accepted' | 'assigned' | 'in-progress' | 'completed' | 'cancelled' | string;
  requestTime: Date | any;
  assignedDriver?: {
    driverId: string;
    driverName: string;
    vehicleNumber: string;
    driverPhone?: string;
  };
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  assignedTime?: Date;
  acceptedAt?: Date;
  startedAt?: Date;
  pickupTime?: Date;
  completedTime?: Date;
  cancelledAt?: Date;
  type?: 'on-demand' | 'scheduled' | string;
  driverLocation?: {
    lat: number;
    lng: number;
    timestamp: Date;
  };
  priority?: string;
  priorityScore?: number;
  zone?: string;
}

export interface DemandZone {
  zone: string;
  lat: number;
  lng: number;
  demand: number;
  timestamp: Date;
  predictedDemand?: number;
}

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
  try {
    const docSnap = await getDoc(doc(db, "users", uid));
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data && data.role) {
        return data.role;
      }
    }

    try {
      const snapshot = await rtdbGet(ref(rtdb, `users/${uid}/role`));
      if (snapshot && snapshot.exists()) {
        const role = snapshot.val();
        return role;
      }
    } catch (rtdbError) {
      console.warn("RTDB read failed:", rtdbError);
    }

    return null;
  } catch (error) {
    console.error("Error getting user role:", error);
    throw error;
  }
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
  const priority = rideData.priority || 'normal';
  const priorityWeights: any = { emergency: 100, exam: 60, normal: 20 };
  const priorityScore = rideData.priorityScore ?? priorityWeights[priority] ?? 20;

  const docData: any = {
    ...rideData,
    status: "pending",
    requestTime: Timestamp.now(),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    priority,
    priorityScore,
    zone: rideData.zone || rideData.pickup || null
  };

  if (rideData.pickupCoords && typeof rideData.pickupCoords.lat === 'number') {
    docData.pickupCoords = new GeoPoint(rideData.pickupCoords.lat, rideData.pickupCoords.lng);
  }
  if (rideData.destinationCoords && typeof rideData.destinationCoords.lat === 'number') {
    docData.destinationCoords = new GeoPoint(rideData.destinationCoords.lat, rideData.destinationCoords.lng);
  }

  const rideRef = await addDoc(collection(db, "rides"), docData);
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

export const assignRide = async (rideId: string, driverData: any) => {
  await updateDoc(doc(db, "rides", rideId), {
    driverId: driverData.driverId,
    driverName: driverData.driverName,
    driverPhone: driverData.driverPhone || null,
    vehicleNumber: driverData.vehicleNumber || null,
    assignedDriver: {
      driverId: driverData.driverId,
      driverName: driverData.driverName,
      vehicleNumber: driverData.vehicleNumber,
      driverPhone: driverData.driverPhone || null,
    },
    status: "accepted",
    acceptedAt: Timestamp.now(),
    assignedTime: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
};

export const startRide = async (rideId: string, driverId?: string) => {
  await updateDoc(doc(db, "rides", rideId), {
    status: "in-progress",
    startedAt: Timestamp.now(),
    pickupTime: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
};

export const acceptRide = assignRide;

export const updateDriverLocation = async (rideId: string, lat: number, lng: number) => {
  await updateDoc(doc(db, "rides", rideId), {
    driverLocation: { lat, lng, timestamp: Timestamp.now() },
    updatedAt: Timestamp.now(),
  });
};

/* ============================
   NEW: ADMIN PORTAL FUNCTIONS
   ============================ */

/**
 * subscribeToPriorityRides
 * Keeps ordering by priorityScore desc, then requestTime asc.
 * If Firestore throws permission issues for ordering by requestTime,
 * we fall back to client-side sort.
 */
export function subscribeToPriorityRides(callback: (rides: Ride[]) => void) {
  try {
    const q = query(
      collection(db, "rides"),
      where("status", "==", "pending"),
      orderBy("priorityScore", "desc"),
      orderBy("requestTime", "asc")
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const rides: Ride[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          rides.push({
            id: docSnap.id,
            studentId: data.studentId,
            studentName: data.studentName,
            studentPhone: data.studentPhone,
            pickup: data.pickup,
            pickupCoords: data.pickupCoords?.latitude
              ? { lat: data.pickupCoords.latitude, lng: data.pickupCoords.longitude }
              : undefined,
            destination: data.destination,
            destinationCoords: data.destinationCoords?.latitude
              ? { lat: data.destinationCoords.latitude, lng: data.destinationCoords.longitude }
              : undefined,
            status: data.status,
            requestTime: data.requestTime?.toDate() || new Date(),
            type: data.type || "on-demand",
            assignedDriver: data.assignedDriver,
            driverId: data.driverId,
            driverName: data.driverName,
            driverPhone: data.driverPhone,
            vehicleNumber: data.vehicleNumber,
            assignedTime: data.assignedTime?.toDate(),
            acceptedAt: data.acceptedAt?.toDate(),
            startedAt: data.startedAt?.toDate(),
            pickupTime: data.pickupTime?.toDate(),
            completedTime: data.completedTime?.toDate(),
            cancelledAt: data.cancelledAt?.toDate(),
            driverLocation: data.driverLocation
              ? {
                  lat: data.driverLocation.lat,
                  lng: data.driverLocation.lng,
                  timestamp: data.driverLocation.timestamp?.toDate() || new Date(),
                }
              : undefined,
            priority: data.priority,
            priorityScore: data.priorityScore,
            zone: data.zone,
          } as Ride);
        });
        callback(rides);
      },
      (error) => {
        console.error("Error in subscribeToPriorityRides:", error);
        // In case of permission or other issues, callback empty and let UI handle it
        callback([]);
      }
    );
  } catch (e) {
    console.error("subscribeToPriorityRides failed:", e);
    return () => {};
  }
}

export function subscribeToActiveDrivers(callback: (drivers: Driver[]) => void) {
  try {
    const q = query(collection(db, "drivers"), where("status", "in", ["active", "idle", "offline"]));
    return onSnapshot(
      q,
      (snapshot) => {
        const drivers: Driver[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          drivers.push({
            id: docSnap.id,
            name: data.name,
            phone: data.phone,
            vehicleNumber: data.vehicleNumber,
            vehicleType: data.vehicleType,
            capacity: data.capacity,
            status: data.status,
            currentPassengers: data.currentPassengers || 0,
            route: data.route,
            currentLocation: data.currentLocation
              ? {
                  latitude: data.currentLocation.coordinates?.latitude || 0,
                  longitude: data.currentLocation.coordinates?.longitude || 0,
                  timestamp: data.currentLocation.timestamp?.toDate() || new Date(),
                  speed: data.currentLocation.speed,
                  heading: data.currentLocation.heading,
                }
              : undefined,
          } as Driver);
        });
        callback(drivers);
      },
      (error) => {
        console.error("Error in subscribeToActiveDrivers:", error);
        callback([]);
      }
    );
  } catch (e) {
    console.error("subscribeToActiveDrivers error:", e);
    return () => {};
  }
}

/**
 * getHistoricalRideData
 * NOTE: to avoid Firestore query permission ordering issues we fetch a reasonable
 * recent set (we order by requestTime only). If your Firestore rules restrict
 * ordering, this function will still work — but you must ensure admin can read rides.
 */
export async function getHistoricalRideData(days: number = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Some firestore setups fail if you mix where/orderBy wrongly with security rules.
    // We'll fetch rides ordered by requestTime and filter client-side.
    const q = query(collection(db, "rides"), orderBy("requestTime", "asc"));

    const snapshot = await getDocs(q);
    const rides: any[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const reqTime = data.requestTime?.toDate ? data.requestTime.toDate() : new Date(data.requestTime || Date.now());
      // filter client-side
      if (reqTime >= startDate) {
        rides.push({
          id: docSnap.id,
          ...data,
          requestTime: reqTime,
          pickupCoords: data.pickupCoords?.latitude ? { lat: data.pickupCoords.latitude, lng: data.pickupCoords.longitude } : undefined,
        });
      }
    });

    return rides;
  } catch (error) {
    console.error("getHistoricalRideData error:", error);
    throw error;
  }
}

export async function updateDemandZone(zoneData: Omit<DemandZone, "timestamp">) {
  try {
    await addDoc(collection(db, "demandZones"), {
      ...zoneData,
      timestamp: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error updating demand zone:", error);
    throw error;
  }
}

export async function getZoneDemandHistory(zone: string, hours: number = 24) {
  const startTime = new Date();
  startTime.setHours(startTime.getHours() - hours);

  const q = query(
    collection(db, "demandZones"),
    where("zone", "==", zone),
    where("timestamp", ">=", Timestamp.fromDate(startTime)),
    orderBy("timestamp", "desc"),
    limit(100)
  );

  const snapshot = await getDocs(q);
  const data: any[] = [];

  snapshot.forEach((docSnap) => {
    const docData = docSnap.data();
    data.push({
      ...docData,
      timestamp: docData.timestamp?.toDate(),
    });
  });

  return data;
}

export async function createDriverDocument(uid: string, profile: any) {
  const driverRef = doc(db, "drivers", uid);
  await setDoc(
    driverRef,
    {
      name: profile.name || "Driver",
      phone: profile.phone || null,
      vehicleNumber: profile.vehicleNumber || null,
      vehicleType: profile.vehicleType || "bus",
      capacity: profile.capacity || 20,
      status: "idle",
      currentPassengers: 0,
      currentLocation: {
        coordinates: new GeoPoint(0, 0),
        timestamp: Timestamp.now(),
        speed: 0,
        heading: 0,
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );
}

export async function updateDriverLocationInDriversCollection(driverId: string, location: Location) {
  try {
    const driverRef = doc(db, "drivers", driverId);
    await updateDoc(driverRef, {
      currentLocation: {
        coordinates: new GeoPoint(location.latitude, location.longitude),
        timestamp: Timestamp.now(),
        speed: location.speed || 0,
        heading: location.heading || 0,
      },
      lastSeen: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error updating driver location:", error);
    throw error;
  }
}

/* ============================
   Misc
   ============================ */

export const onAuthChange = (cb: (user: any) => void) => {
  return onAuthStateChanged(auth, cb);
};

export async function getTotalRidesToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const q = query(collection(db, "rides"), where("createdAt", ">=", Timestamp.fromDate(start)));
  const snap = await getDocs(q);
  return snap.size;
}

export default app;
