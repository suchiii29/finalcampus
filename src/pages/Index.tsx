import { Link } from 'react-router-dom';
import { Bus, User, UserCog, BarChart } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';   // <-- Added import

const Index = () => {
  const portals = [
    {
      title: 'Student Portal',
      description: 'Book rides, track buses, and manage your commute',
      icon: User,
      path: '/student/login',   // 🔥 FIXED
      color: 'bg-primary/10 text-foreground hover:bg-primary/20'
    },
    {
      title: 'Driver Portal',
      description: 'Manage rides, update location, and view assignments',
      icon: UserCog,
      path: '/driver/login',    // 🔥 FIXED
      color: 'bg-primary/10 text-foreground hover:bg-primary/20'
    },
    {
      title: 'Admin Portal',
      description: 'Manage fleet, assign drivers, and view analytics',
      icon: Bus,
      path: '/admin/login',     // 🔥 FIXED
      color: 'bg-primary/10 text-foreground hover:bg-primary/20'
    },
    {
      title: 'Live Dashboard',
      description: 'Real-time fleet tracking and demand predictions',
      icon: BarChart,
      path: '/dashboard/live',
      color: 'bg-primary/10 text-foreground hover:bg-primary/20'
    }
  ];


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <div className="container mx-auto px-4 py-8">

        {/* Theme Toggle (only on first page) */}
        <div className="flex justify-end mb-6">
          <ThemeToggle />
        </div>

        {/* Hero Section */}
        <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-2xl mb-6">
            <Bus className="h-16 w-16 text-primary" />
          </div>

          <h1 className="text-5xl font-bold mb-4 text-foreground">
            Campus Transport System
          </h1>

          <p className="text-xl text-foreground/70 max-w-2xl mx-auto">
            Smart, efficient, and real-time campus transportation management
          </p>
        </div>

        {/* Portal Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {portals.map((portal, index) => {
            const Icon = portal.icon;
            return (
              <Card
                key={portal.path}
                className="p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-8"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`inline-flex p-3 rounded-xl mb-4 ${portal.color} transition-colors`}>
                  <Icon className="h-8 w-8" />
                </div>

                <h2 className="text-xl font-bold mb-2 text-foreground">
                  {portal.title}
                </h2>

                <p className="text-sm text-foreground/70 mb-6 min-h-[3rem]">
                  {portal.description}
                </p>

                <Link to={portal.path}>
                  <Button className="w-full">
                    Access Portal →
                  </Button>
                </Link>
              </Card>
            );
          })}
        </div>

        {/* Features */}
        <div className="mt-20 text-center">
          <h3 className="text-2xl font-bold mb-8 text-foreground">
            Key Features
          </h3>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { title: 'Real-time Tracking', desc: 'Live vehicle locations and ETAs' },
              { title: 'Smart Routing', desc: 'AI-powered route optimization' },
              { title: 'Demand Predictions', desc: 'Forecast peak hours and zones' }
            ].map((feature, index) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl bg-card/50 backdrop-blur animate-in fade-in slide-in-from-bottom-8"
                style={{ animationDelay: `${(index + 4) * 100}ms` }}
              >
                <h4 className="font-semibold mb-2 text-foreground">
                  {feature.title}
                </h4>

                <p className="text-sm text-foreground/70">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Index;
