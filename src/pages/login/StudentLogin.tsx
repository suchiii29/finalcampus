// src/pages/login/StudentLogin.tsx
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signUpEmail, loginEmail, loginGoogle, setUserRole, getUserRole, createUserProfile } from "../../firebase";
import { GraduationCap, Users } from "lucide-react";

export default function StudentLogin() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [userType, setUserType] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [usn, setUsn] = useState(""); // USN for students or ID for teachers
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSuccess = async (user: any, isNewUser = false) => {
    try {
      if (!user) {
        setErr("Login failed — please try again.");
        setLoading(false);
        return;
      }
      
      const role = await getUserRole(user.uid);
      
      if (role === "STUDENT" || role === "TEACHER") {
        window.location.href = "/student/dashboard";
      } else if (!role && (mode === "signup" || isNewUser)) {
        // This shouldn't happen in signup - handled separately
        setErr("Please complete registration first.");
        setLoading(false);
      } else {
        setErr(`This account is registered as ${role}. Please use the correct portal.`);
        setLoading(false);
      }
    } catch (error: any) {
      console.error("Error in handleSuccess:", error);
      setErr(error?.message || "An error occurred");
      setLoading(false);
    }
  };

  const validateUSN = (usn: string, type: "STUDENT" | "TEACHER") => {
    if (!usn) return false;
    
    if (type === "STUDENT") {
      // USN format: 1BY23CS045 or 1TD22EC023
      // Format: 1 + (BY/TD) + (year: 2 digits) + (branch: 2-4 letters) + (number: 3 digits)
      return /^1(BY|TD)[0-9]{2}[A-Z]{2,4}[0-9]{3}$/i.test(usn);
    } else {
      // Teacher ID format: BMSIT001 or TEA001 or similar
      return /^[A-Z]{3,6}[0-9]{3,5}$/i.test(usn);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setErr("Please enter both email and password");
      return;
    }

    if (mode === "signup") {
      if (!name.trim()) {
        setErr("Please enter your full name");
        return;
      }
      
      if (!validateUSN(usn, userType)) {
        setErr(
          userType === "STUDENT" 
            ? "Please enter a valid USN (e.g., 1BY23CS045 or 1TD22EC023)" 
            : "Please enter a valid Teacher ID (e.g., BMSIT001)"
        );
        return;
      }
    }
    
    setErr(null);
    setLoading(true);
    
    try {
      if (mode === "signin") {
        const user = await loginEmail(email, password);
        await handleSuccess(user);
      } else {
        // Sign up with validation
        const user = await signUpEmail(email, password);
        await setUserRole(user.uid, userType);
        await createUserProfile(user.uid, {
          email: user.email,
          name: name.trim(),
          role: userType,
          usn: usn.toUpperCase(),
          idNumber: usn.toUpperCase(), // Same field, different name contextually
        });
        await handleSuccess(user, true);
      }
    } catch (e: any) {
      console.error("Email auth error:", e);
      setErr(e?.message || "Authentication error");
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (mode === "signup") {
      if (!name.trim()) {
        setErr("Please enter your full name");
        return;
      }
      
      if (!validateUSN(usn, userType)) {
        setErr(
          userType === "STUDENT" 
            ? "Please enter a valid USN before signing up with Google" 
            : "Please enter a valid Teacher ID before signing up with Google"
        );
        return;
      }
    }

    setErr(null);
    setLoading(true);
    
    try {
      const user = await loginGoogle();
      const role = await getUserRole(user.uid);
      
      if (!role && mode === "signup") {
        // New Google user signing up
        await setUserRole(user.uid, userType);
        await createUserProfile(user.uid, {
          email: user.email,
          name: name.trim() || user.displayName || user.email?.split('@')[0] || 'User',
          role: userType,
          usn: usn.toUpperCase(),
          idNumber: usn.toUpperCase(),
        });
        await handleSuccess(user, true);
      } else if (role) {
        // Existing user signing in
        await handleSuccess(user, false);
      } else {
        setErr("Please sign up first before using Google sign-in");
        setLoading(false);
      }
    } catch (e: any) {
      console.error("Google auth error:", e);
      setErr(e?.message || "Google sign-in failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 p-4">
      <Card className="w-full max-w-lg p-8 shadow-2xl border-2">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <GraduationCap className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-bold text-primary">BMSIT</h1>
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Student & Teacher Portal
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Campus Transport Management System
          </p>
        </div>

        {/* Toggle Sign In / Sign Up */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => {
              setMode("signin");
              setErr(null);
            }}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              mode === "signin"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
            type="button"
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setMode("signup");
              setErr(null);
            }}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              mode === "signup"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
            type="button"
          >
            Sign Up
          </button>
        </div>

        {/* User Type Selection (Only for Sign Up) */}
        {mode === "signup" && (
          <div className="mb-6">
            <label className="block text-sm mb-3 font-medium">I am a:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setUserType("STUDENT")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  userType === "STUDENT"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
                type="button"
              >
                <GraduationCap className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="font-medium">Student</div>
              </button>
              <button
                onClick={() => setUserType("TEACHER")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  userType === "TEACHER"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
                type="button"
              >
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="font-medium">Teacher</div>
              </button>
            </div>
          </div>
        )}

        {err && (
          <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg">
            {err}
          </div>
        )}

        {/* Sign Up Additional Fields */}
        {mode === "signup" && (
          <>
            <label className="block text-sm mb-2 font-medium">Full Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border rounded-lg mb-4 bg-background"
              type="text"
              placeholder="Enter your full name"
              disabled={loading}
            />

            <label className="block text-sm mb-2 font-medium">
              {userType === "STUDENT" ? "USN (University Seat Number)" : "Teacher ID"}
            </label>
            <input
              value={usn}
              onChange={(e) => setUsn(e.target.value.toUpperCase())}
              className="w-full p-3 border rounded-lg mb-4 bg-background font-mono"
              type="text"
              placeholder={userType === "STUDENT" ? "e.g., 1BY23CS045" : "e.g., BMSIT001"}
              disabled={loading}
            />
          </>
        )}

        <label className="block text-sm mb-2 font-medium">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border rounded-lg mb-4 bg-background"
          type="email"
          placeholder="your.email@bmsit.in"
          disabled={loading}
        />

        <label className="block text-sm mb-2 font-medium">Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 border rounded-lg mb-6 bg-background"
          type="password"
          placeholder="••••••••"
          disabled={loading}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              handleEmailAuth();
            }
          }}
        />

        <Button 
          className="w-full mb-3 h-12 text-base font-semibold" 
          onClick={handleEmailAuth} 
          disabled={loading}
          type="button"
        >
          {loading ? (
            mode === "signin" ? "Signing in..." : "Creating account..."
          ) : (
            mode === "signin" ? "Sign In" : "Create Account"
          )}
        </Button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-card text-muted-foreground">OR</span>
          </div>
        </div>

        <Button 
          className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 font-semibold" 
          onClick={handleGoogle} 
          disabled={loading}
          type="button"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? "Please wait..." : `Sign ${mode === "signin" ? "in" : "up"} with Google`}
        </Button>

        <div className="text-xs text-center text-muted-foreground mt-6 leading-relaxed">
          By continuing, you agree to BMSIT's terms of service and privacy policy.
          <br />
          For support, contact: transport@bmsit.in
        </div>
      </Card>
    </div>
  );
}
