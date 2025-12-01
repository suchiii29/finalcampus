// src/pages/login/StudentLogin.tsx
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signUpEmail, loginEmail, loginGoogle, setUserRole, getUserRole, createUserProfile } from "../../firebase";

export default function StudentLogin() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      
      if (role === "STUDENT") {
        window.location.href = "/student/dashboard";
      } else if (!role && (mode === "signup" || isNewUser)) {
        // New user - set role and create profile
        await setUserRole(user.uid, "STUDENT");
        await createUserProfile(user.uid, {
          email: user.email,
          name: user.email?.split('@')[0] || 'Student',
          role: 'STUDENT'
        });
        window.location.href = "/student/dashboard";
      } else {
        setErr("This account is not a student.");
        setLoading(false);
      }
    } catch (error: any) {
      console.error("Error in handleSuccess:", error);
      setErr(error?.message || "An error occurred");
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setErr("Please enter both email and password");
      return;
    }
    
    setErr(null);
    setLoading(true);
    
    try {
      if (mode === "signin") {
        const user = await loginEmail(email, password);
        await handleSuccess(user);
      } else {
        const user = await signUpEmail(email, password);
        await setUserRole(user.uid, "STUDENT");
        await createUserProfile(user.uid, {
          email: user.email,
          name: user.email?.split('@')[0] || 'Student',
          role: 'STUDENT'
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
    setErr(null);
    setLoading(true);
    
    try {
      const user = await loginGoogle();
      const role = await getUserRole(user.uid);
      
      if (!role) {
        // New Google user
        await setUserRole(user.uid, "STUDENT");
        await createUserProfile(user.uid, {
          email: user.email,
          name: user.displayName || user.email?.split('@')[0] || 'Student',
          role: 'STUDENT'
        });
      }
      
      await handleSuccess(user, !role);
    } catch (e: any) {
      console.error("Google auth error:", e);
      setErr(e?.message || "Google sign-in failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-accent/5 p-4">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            {mode === "signin" ? "Student Sign In" : "Student Sign Up"}
          </h2>
          <div className="text-sm text-muted-foreground">
            <button
              className="underline hover:text-primary"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setErr(null);
              }}
              type="button"
            >
              {mode === "signin" ? "Create account" : "Sign in"}
            </button>
          </div>
        </div>

        {err && (
          <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
            {err}
          </div>
        )}

        <label className="block text-sm mb-2 font-medium">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border rounded-lg mb-4"
          type="email"
          placeholder="student@campus.edu"
          disabled={loading}
        />

        <label className="block text-sm mb-2 font-medium">Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 border rounded-lg mb-6"
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
          className="w-full mb-3" 
          onClick={handleEmailAuth} 
          disabled={loading}
          type="button"
        >
          {loading ? (
            mode === "signin" ? "Signing in..." : "Creating account..."
          ) : (
            mode === "signin" ? "Sign In" : "Sign Up"
          )}
        </Button>

        <Button 
          className="w-full bg-slate-800 hover:bg-slate-900" 
          onClick={handleGoogle} 
          disabled={loading}
          type="button"
        >
          {loading ? "Please wait..." : "Sign in with Google"}
        </Button>

        <div className="text-sm text-center text-muted-foreground mt-4">
          By continuing you agree to your institution policy.
        </div>
      </Card>
    </div>
  );
}
