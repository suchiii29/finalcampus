// src/pages/login/DriverLogin.tsx
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loginEmail, loginGoogle, getUserRole } from "../../firebase";

export default function DriverLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSuccess = async (user: any) => {
    if (!user) {
      setErr("Login failed — please try again.");
      setLoading(false);
      return;
    }

    try {
      const role = await getUserRole(user.uid);

      if (!role) {
        setErr("No role found for this account. Contact admin.");
        setLoading(false);
        return;
      }

      if (role !== "DRIVER") {
        setErr("This account is not a driver. Please contact admin.");
        setLoading(false);
        return;
      }

      // SUCCESS
      window.location.href = "/driver/dashboard";
    } catch (error: any) {
      console.error("Error:", error);
      setErr(error?.message || "An error occurred");
      setLoading(false);
    }
  };

  const handleEmail = async () => {
    if (!email || !password) {
      setErr("Please enter both email and password");
      return;
    }

    setErr(null);
    setLoading(true);

    try {
      const user = await loginEmail(email, password);
      await handleSuccess(user);
    } catch (e: any) {
      console.error("Email auth error:", e);
      setErr(e?.message || "Sign-in failed");
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
      console.error("Google auth error:", e);
      setErr(e?.message || "Google sign-in failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-primary/5 to-accent/5">
      <Card className="max-w-md w-full p-8 shadow-xl">
        <h2 className="text-2xl font-bold mb-6">Driver Sign In</h2>

        {err && (
          <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
            {err}
          </div>
        )}

        <label className="block text-sm mb-2 font-medium">Email</label>
        <input
          className="w-full p-3 border rounded-lg mb-4"
          placeholder="driver@campus.edu"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />

        <label className="block text-sm mb-2 font-medium">Password</label>
        <input
          className="w-full p-3 border rounded-lg mb-6"
          placeholder="••••••••"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />

        <Button
          className="w-full mb-3"
          onClick={handleEmail}
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign In"}
        </Button>

        <Button
          className="w-full bg-slate-800 hover:bg-slate-900"
          onClick={handleGoogle}
          disabled={loading}
        >
          {loading ? "Please wait..." : "Sign in with Google"}
        </Button>
      </Card>
    </div>
  );
}
