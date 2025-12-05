// src/pages/admin/Reports.tsx
import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Filter, Calendar, Eye, X, RefreshCw, AlertCircle } from 'lucide-react';
import { getHistoricalRideData, type Ride } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

export default function AdminReports() {
  const { toast } = useToast();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7');
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);

  useEffect(() => {
    loadRides();
  }, [dateRange]);

  const loadRides = async () => {
    setLoading(true);
    try {
      const days = parseInt(dateRange);
      const ridesData = await getHistoricalRideData(days);

      const normalized: Ride[] = ridesData.map((r: any) => ({
        ...r,
        requestTime: r.requestTime instanceof Date ? r.requestTime : new Date(r.requestTime),
      }));

      setRides(normalized);
      toast({
        title: 'Loaded',
        description: `Loaded ${normalized.length} rides from last ${days} days`,
      });

    } catch (error: any) {
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
    const filtered = rides.filter(r => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'assigned') return r.status === 'assigned' || r.status === 'accepted';
      return r.status === statusFilter;
    });
    return filtered;
  }, [rides, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: rides.length,
      cancelled: rides.filter(r => r.status === 'cancelled').length,
    };
  }, [rides]);

  const handleExport = () => {
    try {
      const headers = [
        'Ride ID',
        'Student Name',
        'Student ID',
        'Pickup Location',
        'Destination',
        'Ride Type',
        'Priority',
        'Request Time',
        'Assigned Time',
        'Pickup Time',
        'Completed Time'
      ];
      
      const csvRows = [
        headers.join(','),
        ...filteredRides.map(ride => [
          ride.id,
          `"${ride.studentName || ''}"`,
          ride.studentId || '',
          `"${ride.pickup || ''}"`,
          `"${ride.destination || ''}"`,
          ride.type || 'on-demand',
          ride.priority || 'normal',
          new Date(ride.requestTime).toLocaleString(),
          ride.assignedTime ? new Date(ride.assignedTime).toLocaleString() : 'N/A',
          ride.pickupTime ? new Date(ride.pickupTime).toLocaleString() : 'N/A',
          ride.completedTime ? new Date(ride.completedTime).toLocaleString() : 'N/A'
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
      
      toast({ 
        title: 'Export Successful', 
        description: `Exported ${filteredRides.length} rides to CSV` 
      });
    } catch (error) {
      toast({ 
        title: 'Export Failed', 
        description: 'Failed to export data', 
        variant: 'destructive' 
      });
    }
  };

  const getPriorityBadgeClass = (priority?: string) => {
    const base = "px-3 py-1 rounded-full text-xs font-semibold";
    switch (priority) {
      case 'emergency': return `${base} bg-red-500 text-white`;
      case 'exam': return `${base} bg-orange-500 text-white`;
      default: return `${base} bg-slate-500 text-white`;
    }
  };

  return (
    <Layout role="admin">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Ride Reports</h2>
            <p className="text-muted-foreground mt-1">View, analyze, and export ride data</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={loadRides} variant="outline" className="gap-2" disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={handleExport} className="gap-2" disabled={loading || filteredRides.length === 0}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Important Note */}
        <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">Important Note</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                This page shows <strong>student ride requests</strong>, not route assignments.
              </p>
            </div>
          </div>
        </Card>

        {/* Statistics (Only Total + Cancelled) */}
        <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
          <Card className="p-3 bg-card border-border">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          </Card>

          <Card className="p-3 bg-card border-border">
            <div className="text-xs text-muted-foreground">Cancelled</div>
            <div className="text-2xl font-bold text-red-500">{stats.cancelled}</div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 bg-card border-border">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Filters</span>
            </div>

            <div className="flex gap-4 flex-wrap">

              {/* Date Filter */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <select 
                  value={dateRange} 
                  onChange={(e) => setDateRange(e.target.value)} 
                  className="border rounded-md px-3 py-2 text-sm bg-background text-foreground border-input"
                >
                  <option value="1">Last 24 hours</option>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last year</option>
                </select>
              </div>

              {/* Status Filter */}
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)} 
                className="border rounded-md px-3 py-2 text-sm bg-background text-foreground border-input"
              >
                <option value="all">All Statuses ({rides.length})</option>
                <option value="cancelled">Cancelled ({stats.cancelled})</option>
              </select>

            </div>
          </div>
        </Card>

        {/* Table */}
        <Card className="bg-card border-border">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Loading rides...</div>
              </div>
            ) : filteredRides.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="text-muted-foreground mb-2">No rides found</div>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-foreground">Ride ID</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-foreground">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-foreground">Route</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-foreground">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-foreground">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-foreground">Request Time</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-foreground">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {filteredRides.map((ride) => (
                    <tr key={ride.id} className="hover:bg-muted/30 transition-colors">

                      {/* Ride ID */}
                      <td className="px-6 py-4 text-sm font-semibold text-foreground">
                        {ride.id}
                      </td>

                      {/* Student */}
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-foreground">{ride.studentName}</div>
                        <div className="text-sm text-muted-foreground">{ride.studentId}</div>
                      </td>

                      {/* Route */}
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-foreground">{ride.pickup}</div>
                        <div className="text-sm text-muted-foreground">→ {ride.destination}</div>
                      </td>

                      {/* Type */}
                      <td className="px-6 py-4 text-sm capitalize text-foreground">
                        {ride.type || 'on-demand'}
                      </td>

                      {/* Priority */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getPriorityBadgeClass(ride.priority)}>
                          {(ride.priority || 'normal').toUpperCase()}
                        </span>
                      </td>

                      {/* Request Time */}
                      <td className="px-6 py-4 text-sm">
                        <div className="text-foreground">
                          {new Date(ride.requestTime).toLocaleDateString()}
                        </div>
                        <div className="text-muted-foreground">
                          {new Date(ride.requestTime).toLocaleTimeString()}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => setSelectedRide(ride)}
                          className="text-primary hover:text-primary/80 flex items-center gap-1 font-medium"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                      </td>

                    </tr>
                  ))}
                </tbody>

              </table>
            )}
          </div>
        </Card>

        {/* Ride Details Modal */}
        {selectedRide && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-card border-border">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-2xl font-bold text-foreground">Ride Details</h3>
                  <button
                    onClick={() => setSelectedRide(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-muted-foreground">Ride ID</label>
                      <p className="text-foreground font-medium mt-1">{selectedRide.id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-muted-foreground">Status</label>
                      <p className="text-foreground font-medium mt-1">{selectedRide.status}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-muted-foreground">Student</label>
                    <p className="text-foreground font-medium mt-1">{selectedRide.studentName}</p>
                    <p className="text-sm text-muted-foreground">{selectedRide.studentId}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-muted-foreground">Pickup Location</label>
                      <p className="text-foreground font-medium mt-1">{selectedRide.pickup}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-muted-foreground">Destination</label>
                      <p className="text-foreground font-medium mt-1">{selectedRide.destination}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-muted-foreground">Ride Type</label>
                      <p className="text-foreground font-medium capitalize mt-1">{selectedRide.type || 'on-demand'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-muted-foreground">Priority Level</label>
                      <span className={getPriorityBadgeClass(selectedRide.priority)}>
                        {(selectedRide.priority || 'normal').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <label className="text-sm font-semibold text-muted-foreground mb-3 block">Timeline</label>

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Requested:</span>
                        <span className="text-sm font-medium text-foreground">{new Date(selectedRide.requestTime).toLocaleString()}</span>
                      </div>

                      {selectedRide.assignedTime && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Assigned:</span>
                          <span className="text-sm font-medium text-foreground">{new Date(selectedRide.assignedTime).toLocaleString()}</span>
                        </div>
                      )}

                      {selectedRide.pickupTime && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Picked Up:</span>
                          <span className="text-sm font-medium text-foreground">{new Date(selectedRide.pickupTime).toLocaleString()}</span>
                        </div>
                      )}

                      {selectedRide.completedTime && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Completed:</span>
                          <span className="text-sm font-medium text-foreground">{new Date(selectedRide.completedTime).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </Card>
          </div>
        )}

      </div>
    </Layout>
  );
}