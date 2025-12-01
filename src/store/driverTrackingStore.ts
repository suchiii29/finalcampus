// src/store/driverTrackingStore.ts
import { create } from "zustand";

interface DriverTrackingState {
  isTracking: boolean;
  watcherId: number | null;
  setTracking: (status: boolean) => void;
  setWatcherId: (id: number | null) => void;
}

export const useDriverTrackingStore = create<DriverTrackingState>((set) => ({
  isTracking: false,
  watcherId: null,

  setTracking: (status) => set({ isTracking: status }),
  setWatcherId: (id) => set({ watcherId: id }),
}));
