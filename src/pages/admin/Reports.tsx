// src/pages/admin/Reports.tsx
import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Filter, Calendar } from 'lucide-react';
import { getHistoricalRideData, type Ride } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import RideTable from '@/components/RideTable';
import RideTimelineModal from '@/components/RideTimelineModal';

export default function AdminReports() {
  const { toast } = useToast();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7');
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);

  useEffect(() => {
    loadRides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const loadRides = async () => {
    setLoading(true);
    try {
      const days = parseInt(dateRange);
      const ridesData = await getHistoricalRideData(days);
      // normalize requestTime -> Date
      const normalized: Ride[] = ridesData.map((r: any) => ({
        ...r,
        requestTime: r.requestTime instanceof Date ? r.requestTime : new Date(r.requestTime),
      }));
      setRides(normalized);
    } catch (error) {
      console.error('Error loading rides:', error);
      toast({
        title: 'Error',
        description: 'Failed to load ride data',
        variant: 'destructive'
      });
      setRides([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredRides = useMemo(() => {
    return rides.filter(r => {
      if (statusFilter === 'all') return true;
      return r.status === statusFilter;
    });
  }, [rides, statusFilter]);

  const stats = useMemo(() => {
    const total = filteredRides.length;
    const completed = filteredRides.filter(r => r.status === 'completed').length;
    const pending = filteredRides.filter(r => r.status === 'pending').length;
    const inProgress = filteredRides.filter(r => r.status === 'in-progress').length;
    return { total, completed, pending, inProgress };
  }, [filteredRides]);

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const handleExport = () => {
    try {
      const headers = [
        'Ride ID','Student Name','Student ID','Pickup','Destination','Driver Name','Vehicle Number','Type','Priority','Status','Request Time','Assigned Time','Pickup Time','Completed Time'
      ];
      const csvRows = [
        headers.join(','),
        ...filteredRides.map(ride => [
          ride.id,
          `"${ride.studentName || ''}"`,
          ride.studentId || '',
          `"${ride.pickup || ''}"`,
          `"${ride.destination || ''}"`,
          `"${ride.driverName || ride.assignedDriver?.driverName || ''}"`,
          ride.vehicleNumber || ride.assignedDriver?.vehicleNumber || '',
          ride.type || '',
          ride.priority || '',
          ride.status || '',
          new Date(ride.requestTime).toISOString(),
          ride.assignedTime ? new Date(ride.assignedTime).toISOString() : '',
          ride.pickupTime ? new Date(ride.pickupTime).toISOString() : '',
          ride.completedTime ? new Date(ride.completedTime).toISOString() : ''
        ].join(','))
      ];
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ride-reports-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast({ title: 'Export Successful', description: `Exported ${filteredRides.length} rides to CSV` });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: 'Export Failed', description: 'Failed to export data', variant: 'destructive' });
    }
  };

  return (
    <Layout role="admin">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold mb-2">Ride Reports</h2>
            <p className="text-muted-foreground">View, analyze, and export ride data</p>
          </div>
          <Button onClick={handleExport} className="gap-2" disabled={loading || filteredRides.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>

        <div className="grid md:grid-cols-5 gap-4">
          <Card className="p-4"><p className="text-sm text-muted-foreground">Total Rides</p><p className="text-2xl font-bold">{stats.total}</p></Card>
          <Card className="p-4"><p className="text-sm text-muted-foreground">Completed</p><p className="text-2xl font-bold text-success">{stats.completed}</p></Card>
          <Card className="p-4"><p className="text-sm text-muted-foreground">In Progress</p><p className="text-2xl font-bold text-primary">{stats.inProgress}</p></Card>
          <Card className="p-4"><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold text-warning">{stats.pending}</p></Card>
          <Card className="p-4"><p className="text-sm text-muted-foreground">Completion Rate</p><p className="text-2xl font-bold">{completionRate}%</p></Card>
        </div>

        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">Filters:</span></div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <select value={dateRange} onChange={(e)=>setDateRange(e.target.value)} className="border rounded px-3 py-1 text-sm">
                  <option value="1">Last 24 hours</option>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </div>
              <select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)} className="border rounded px-3 py-1 text-sm">
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="assigned">Assigned</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </Card>

        <Card>
          <div className="overflow-x-auto">
            <RideTable rides={filteredRides} loading={loading} onView={(r)=>setSelectedRide(r)} />
          </div>
        </Card>

        {selectedRide && <RideTimelineModal ride={selectedRide} onClose={()=>setSelectedRide(null)} />}
      </div>
    </Layout>
  );
}
