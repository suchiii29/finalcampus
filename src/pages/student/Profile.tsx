// src/pages/student/Profile.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone, Building2, LogOut } from 'lucide-react';
import { auth, getUserProfile, updateUserProfile, logout } from '../../firebase';
import { useToast } from '@/hooks/use-toast';

export default function StudentProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    studentId: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/login/student');
      return;
    }

    try {
      setLoading(true);
      const userProfile = await getUserProfile(user.uid);
      
      if (userProfile) {
        setProfile({
          name: userProfile.name || '',
          email: user.email || '',
          phone: userProfile.phone || '',
          department: userProfile.department || '',
          studentId: userProfile.studentId || ''
        });
      } else {
        setProfile({
          ...profile,
          email: user.email || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const user = auth.currentUser;
    if (!user) {
      navigate('/login/student');
      return;
    }

    if (!profile.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name is required.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);
      
      await updateUserProfile(user.uid, {
        name: profile.name,
        phone: profile.phone,
        department: profile.department,
        studentId: profile.studentId,
        role: 'STUDENT'
      });

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been saved successfully.',
      });
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save profile. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to log out?')) {
      return;
    }

    try {
      await logout();
      toast({
        title: 'Logged Out',
        description: 'You have been logged out successfully.',
      });
      navigate('/login/student');
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: 'Error',
        description: 'Failed to log out. Please try again.',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <Layout role="student">
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout role="student">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-3xl font-bold mb-2">My Profile</h2>
          <p className="text-muted-foreground">Manage your account information</p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold">{profile.name || 'Student'}</h3>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Full Name *
                </Label>
                <Input 
                  id="name" 
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="Enter your full name"
                  required
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={profile.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </Label>
                <Input 
                  id="phone" 
                  type="tel" 
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentId" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Student ID
                </Label>
                <Input 
                  id="studentId" 
                  value={profile.studentId}
                  onChange={(e) => setProfile({ ...profile, studentId: e.target.value })}
                  placeholder="STU123456"
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Department
                </Label>
                <Input 
                  id="department" 
                  value={profile.department}
                  onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                  placeholder="Computer Science"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/student/dashboard')}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold mb-1">Logout</h3>
              <p className="text-sm text-muted-foreground">Sign out of your account</p>
            </div>
            <Button 
              variant="destructive" 
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
