// src/components/RideTimelineModal.tsx
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type Ride } from '@/firebase';

export default function RideTimelineModal({ ride, onClose }: { ride: Ride, onClose: () => void }) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ride Timeline — {ride.id?.slice?.(0,8)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 p-2">
          <div>
            <div className="text-xs text-muted-foreground">Requested</div>
            <div className="font-medium">{new Date(ride.requestTime).toLocaleString()}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Assigned</div>
            <div className="font-medium">{ride.assignedTime ? new Date(ride.assignedTime).toLocaleString() : '-'}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Pickup</div>
            <div className="font-medium">{ride.pickupTime ? new Date(ride.pickupTime).toLocaleString() : '-'}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Completed</div>
            <div className="font-medium">{ride.completedTime ? new Date(ride.completedTime).toLocaleString() : '-'}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Driver</div>
            <div className="font-medium">{ride.driverName || ride.assignedDriver?.driverName || '-'}</div>
            <div className="text-xs text-muted-foreground">{ride.vehicleNumber || ride.assignedDriver?.vehicleNumber || ''}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
