// src/components/RideTable.tsx
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { type Ride } from '@/firebase';

export default function RideTable({ rides, loading, onView }: { rides: Ride[], loading: boolean, onView: (r: Ride) => void }) {
  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground">Loading ride data...</div>
    );
  }

  if (!rides || rides.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">No rides found for the selected filters</div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Student</TableHead>
          <TableHead>Route</TableHead>
          <TableHead>Driver</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Request Time</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Duration</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rides.map((ride) => {
          let duration = '';
          if (ride.completedTime && ride.pickupTime) {
            const mins = Math.round((new Date(ride.completedTime).getTime() - new Date(ride.pickupTime).getTime()) / (1000 * 60));
            duration = `${mins} min`;
          }
          return (
            <TableRow key={ride.id} className="cursor-pointer" onClick={() => onView(ride)}>
              <TableCell className="font-mono text-xs">{ride.id?.slice?.(0,8)}</TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{ride.studentName}</p>
                  <p className="text-xs text-muted-foreground">{ride.studentId}</p>
                </div>
              </TableCell>
              <TableCell>
                <div className="max-w-[200px]">
                  <p className="text-sm truncate">{ride.pickup}</p>
                  <p className="text-xs text-muted-foreground truncate">→ {ride.destination}</p>
                </div>
              </TableCell>
              <TableCell>
                {(ride.driverName || ride.assignedDriver?.driverName) ? (
                  <div>
                    <p className="text-sm">{ride.driverName || ride.assignedDriver?.driverName}</p>
                    <p className="text-xs text-muted-foreground">{ride.vehicleNumber || ride.assignedDriver?.vehicleNumber}</p>
                  </div>
                ) : <span className="text-muted-foreground">-</span>}
              </TableCell>
              <TableCell><span className="px-2 py-1 bg-muted rounded text-xs font-medium">{ride.type}</span></TableCell>
              <TableCell>
                <div className="text-sm">
                  <p>{new Date(ride.requestTime).toLocaleDateString()}</p>
                  <p className="text-xs text-muted-foreground">{new Date(ride.requestTime).toLocaleTimeString()}</p>
                </div>
              </TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${ride.status === 'completed' ? 'bg-success/10 text-success' : ride.status === 'in-progress' ? 'bg-primary/10 text-primary' : ride.status === 'pending' ? 'bg-warning/10 text-warning' : 'bg-secondary/10 text-secondary'}`}>{ride.status}</span>
              </TableCell>
              <TableCell>{duration || <span className="text-muted-foreground">-</span>}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
