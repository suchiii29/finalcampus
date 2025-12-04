import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bus, Home, MapPin, User, BarChart3, Map, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
  role: 'student' | 'teacher' | 'driver' | 'admin' | 'dashboard';
}

const roleConfig = {
  student: {
    title: 'Student Portal',
    links: [
      { to: '/student/dashboard', label: 'Dashboard', icon: Home },
      { to: '/student/request', label: 'Request Ride', icon: MapPin },
      { to: '/student/rides', label: 'My Rides', icon: Bus },
      { to: '/student/profile', label: 'Profile', icon: User }
    ]
  },
  teacher: {
    title: 'Teacher Portal',
    links: [
      { to: '/student/dashboard', label: 'Dashboard', icon: Home },
      { to: '/student/request', label: 'Request Ride', icon: MapPin },
      { to: '/student/rides', label: 'My Rides', icon: Bus },
      { to: '/student/profile', label: 'Profile', icon: User }
    ]
  },
  driver: {
    title: 'Driver Portal',
    links: [
      { to: '/driver/dashboard', label: 'Dashboard', icon: Home },
      { to: '/driver/location', label: 'Location', icon: MapPin }
    ]
  },
  admin: {
    title: 'Admin Portal',
    links: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: Home },

      // ❌ Vehicles removed here
      // { to: '/admin/vehicles', label: 'Vehicles', icon: Bus },

      { to: '/admin/heatmap', label: 'Demand Heatmap', icon: Map },
      { to: '/admin/reports', label: 'Reports', icon: BarChart3 }
    ]
  },
  dashboard: {
    title: 'Live Dashboard',
    links: [
      { to: '/dashboard/live', label: 'Live View', icon: Map },
      { to: '/dashboard/predictions', label: 'Predictions', icon: BarChart3 }
    ]
  }
};

export default function Layout({ children, role }: LayoutProps) {
  const location = useLocation();
  const config = roleConfig[role];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bus className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">{config.title}</h1>
              <p className="text-xs text-muted-foreground">Campus Transport System</p>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-1">
            {config.links.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Role switcher for demo */}
          <div className="flex items-center gap-2">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              Switch Role
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden border-b bg-card px-4 py-2 flex gap-1 overflow-x-auto">
        {config.links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors whitespace-nowrap",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
