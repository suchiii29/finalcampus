// src/utils/notificationService.ts

import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/firebase';

export interface Notification {
  id?: string;
  userId: string;
  userRole: 'STUDENT' | 'DRIVER' | 'ADMIN' | 'TEACHER';
  type: 'route_assigned' | 'ride_request' | 'ride_accepted' | 'ride_started' | 'ride_completed' | 'ride_cancelled' | 'system';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

/**
 * Send notification to user
 */
export async function sendNotification(
  userId: string,
  userRole: 'STUDENT' | 'DRIVER' | 'ADMIN' | 'TEACHER',
  type: Notification['type'],
  title: string,
  message: string,
  data?: any,
  priority: Notification['priority'] = 'medium'
): Promise<void> {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      userRole,
      type,
      title,
      message,
      data: data || {},
      read: false,
      createdAt: serverTimestamp(),
      priority
    });
    
    console.log(`✅ Notification sent to ${userId}: ${title}`);
  } catch (error) {
    console.error('Failed to send notification:', error);
    throw error;
  }
}

/**
 * Send route assignment notification to driver
 */
export async function notifyDriverRouteAssignment(
  driverId: string,
  routeName: string,
  startPoint: string,
  endPoint: string,
  stops: string[]
): Promise<void> {
  const stopsText = stops.length > 0 ? ` with ${stops.length} stops` : '';
  
  await sendNotification(
    driverId,
    'DRIVER',
    'route_assigned',
    '🚌 New Route Assigned!',
    `You have been assigned to route "${routeName}" from ${startPoint} to ${endPoint}${stopsText}. Please check your dashboard for details.`,
    {
      routeName,
      startPoint,
      endPoint,
      stops
    },
    'urgent'
  );
}

/**
 * Notify driver of ride request
 */
export async function notifyDriverRideRequest(
  driverId: string,
  studentName: string,
  pickup: string,
  destination: string,
  rideId: string
): Promise<void> {
  await sendNotification(
    driverId,
    'DRIVER',
    'ride_request',
    '📍 New Ride Request',
    `${studentName} requested a ride from ${pickup} to ${destination}`,
    {
      studentName,
      pickup,
      destination,
      rideId
    },
    'high'
  );
}

/**
 * Notify student of ride acceptance
 */
export async function notifyStudentRideAccepted(
  studentId: string,
  driverName: string,
  vehicleNumber: string,
  estimatedArrival: number
): Promise<void> {
  await sendNotification(
    studentId,
    'STUDENT',
    'ride_accepted',
    '✅ Ride Accepted!',
    `${driverName} (${vehicleNumber}) has accepted your request. Estimated arrival: ${estimatedArrival} minutes.`,
    {
      driverName,
      vehicleNumber,
      estimatedArrival
    },
    'high'
  );
}

/**
 * Notify student when ride starts
 */
export async function notifyStudentRideStarted(
  studentId: string,
  driverName: string
): Promise<void> {
  await sendNotification(
    studentId,
    'STUDENT',
    'ride_started',
    '🚗 Ride Started',
    `${driverName} has started your ride. Track your location in real-time.`,
    { driverName },
    'medium'
  );
}

/**
 * Subscribe to user notifications in real-time
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void
): () => void {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  
  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Notification[];
    
    callback(notifications);
  });
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
  try {
    const { doc, updateDoc } = await import('firebase/firestore');
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true
    });
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
  }
}

/**
 * Clear all notifications for user
 */
export async function clearAllNotifications(userId: string): Promise<void> {
  try {
    const { getDocs, writeBatch } = await import('firebase/firestore');
    const q = query(collection(db, 'notifications'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Failed to clear notifications:', error);
  }
}

/**
 * Show browser notification (if permission granted)
 */
export async function showBrowserNotification(title: string, message: string): Promise<void> {
  if (!('Notification' in window)) return;
  
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body: message,
      icon: '/bus-icon.png',
      badge: '/bus-icon.png'
    });
  } else if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/bus-icon.png'
      });
    }
  }
}