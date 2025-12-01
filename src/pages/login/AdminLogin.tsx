// src/pages/login/AdminLogin.tsx
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loginEmail, loginGoogle, getUserRole } from "../../firebase";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSuccess = async (user: any) => {
    if (!user) {
      setErr("Login failed—no user returned.");
      setLoading(false);
      return;
    }

    try {
      const role = await getUserRole(user.uid);
      console.log("Admin role check:", role);

      if (role?.toUpperCase() === "ADMIN") {
        window.location.href = "/admin/dashboard";
      } else {
        setErr("This account is not an admin. Access denied.");
      }
    } catch (e: any) {
      console.error(e);
      setErr("Error validating admin role.");
    }

    setLoading(false);
  };

  const handleEmail = async () => {
    if (!email || !password) {
      setErr("Please enter both email and password.");
      return;
    }

    setErr(null);
    setLoading(true);

    try {
      const user = await loginEmail(email, password);
      await handleSuccess(user);
    } catch (e: any) {
      console.error("Email login error:", e);
      setErr(e?.message || "Email login failed.");
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setErr(null);
    setLoading(true);

    try {
      const user = await loginGoogle();
      await handleSuccess(user);
    } catch (e: any) {
      console.error("Google login error:", e);
      setErr(e?.message || "Google sign-in failed.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <Card className="max-w-md w-full p-8 shadow-xl">
        <h2 className="text-2xl font-bold mb-6">Admin Sign In</h2>

        {err && (
          <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
            {err}
          </div>
        )}

        <label className="block text-sm mb-2 font-medium">Email</label>
        <input
          className="w-full p-3 border rounded-lg mb-4"
          placeholder="admin@campus.edu"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />

        <label className="block text-sm mb-2 font-medium">Password</label>
        <input
          className="w-full p-3 border rounded-lg mb-6"
          placeholder="•••••••"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleEmail();
          }}
        />

        <Button onClick={handleEmail} disabled={loading} className="w-full mb-3">
          {loading ? "Signing in..." : "Sign In"}
        </Button>

        <Button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full bg-slate-800 hover:bg-slate-900"
        >
          {loading ? "Please wait..." : "Sign in with Google"}
        </Button>
      </Card>
    </div>
  );
}
