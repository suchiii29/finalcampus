// src/pages/login/DriverLogin.tsx
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  signUpEmail,
  loginEmail,
  loginGoogle,
  getUserRole,
  setUserRole,
  createUserProfile,
  createDriverDocument
} from "../../firebase";
import { Truck } from "lucide-react";

export default function DriverLogin() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState(""); // ⭐ NEW FIELD
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState<"bus" | "cab">("bus");

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateVehicleNumber = (number: string) => {
    const regex = /^[A-Z]{2}[0-9]{2}[A-Z]{0,2}[0-9]{4}$/;
    return regex.test(number.replace(/-/g, "").toUpperCase());
  };

  const validatePhone = (num: string) => /^[6-9]\d{9}$/.test(num);

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setErr("Please enter both email and password");
      return;
    }

    if (mode === "signup") {
      if (!name.trim()) return setErr("Please enter your full name");
      if (!phone.trim() || !validatePhone(phone)) return setErr("Please enter a valid phone number");
      if (!vehicleNumber.trim()) return setErr("Please enter your vehicle number");
      if (!validateVehicleNumber(vehicleNumber))
        return setErr("Invalid vehicle number (e.g., KA01AB1234)");
    }

    setErr(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        const user = await loginEmail(email, password);
        const role = await getUserRole(user.uid);

        if (role === "DRIVER") {
          window.location.href = "/driver/dashboard";
        } else if (role) {
          setErr(`This account is registered as ${role}. Use the correct portal.`);
          setLoading(false);
        } else {
          setErr("No role assigned. Contact admin.");
          setLoading(false);
        }

        return;
      }

      // -------------- SIGN UP FLOW ----------------------
      const user = await signUpEmail(email, password);

      await setUserRole(user.uid, "DRIVER");

      // Create user profile (existing)
      await createUserProfile(user.uid, {
        email: user.email,
        name,
        phone,                                     // ⭐ NEW
        role: "DRIVER",
        vehicleNumber: vehicleNumber.replace(/-/g, "").toUpperCase(),
        vehicleType
      });

      // Create driver doc (NEW)
      await createDriverDocument(user.uid, {
        name,
        phone,
        vehicleNumber: vehicleNumber.replace(/-/g, "").toUpperCase(),
        vehicleType,
        capacity: vehicleType === "bus" ? 40 : 4
      });

      window.location.href = "/driver/dashboard";
      // ---------------------------------------------------

    } catch (e: any) {
      console.error("Email auth error:", e);
      setErr(e.message || "Authentication error");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-lg p-8 shadow-2xl border-2">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Truck className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-bold text-primary">BMSIT</h1>
          </div>
          <h2 className="text-xl font-semibold">Driver Portal</h2>
          <p className="text-sm text-muted-foreground">Campus Transport Management System</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => {
              setMode("signin");
              setErr(null);
            }}
            className={`px-6 py-2 rounded-lg font-medium ${mode === "signin"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-secondary hover:bg-accent"
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
            className={`px-6 py-2 rounded-lg font-medium ${mode === "signup"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-secondary hover:bg-accent"
              }`}
            type="button"
          >
            Sign Up
          </button>
        </div>

        {/* Error */}
        {err && (
          <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
            {err}
          </div>
        )}

        {/* SIGN UP EXTRA FIELDS */}
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

            {/* ⭐ NEW PHONE FIELD — UI MATCHES EXISTING STYLE */}
            <label className="block text-sm mb-2 font-medium">Phone Number</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-3 border rounded-lg mb-4 bg-background"
              type="text"
              maxLength={10}
              placeholder="9876543210"
              disabled={loading}
            />

            <label className="block text-sm mb-2 font-medium">Vehicle Number</label>
            <input
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
              className="w-full p-3 border rounded-lg mb-4 bg-background font-mono"
              type="text"
              placeholder="KA01AB1234"
              disabled={loading}
            />

            <label className="block text-sm mb-2 font-medium">Vehicle Type</label>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => setVehicleType("bus")}
                className={`p-4 rounded-lg border-2 ${vehicleType === "bus"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                  }`}
                type="button"
              >
                Bus
              </button>
              <button
                onClick={() => setVehicleType("cab")}
                className={`p-4 rounded-lg border-2 ${vehicleType === "cab"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                  }`}
                type="button"
              >
                Cab
              </button>
            </div>
          </>
        )}

        {/* Email */}
        <label className="block text-sm mb-2 font-medium">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border rounded-lg mb-4 bg-background"
          type="email"
          placeholder="driver@bmsit.in"
          disabled={loading}
        />

        {/* Password */}
        <label className="block text-sm mb-2 font-medium">Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 border rounded-lg mb-6 bg-background"
          type="password"
          placeholder="••••••••"
          disabled={loading}
        />

        {/* Button */}
        <Button
          onClick={handleEmailAuth}
          disabled={loading}
          className="w-full mb-3 h-12 text-base font-semibold"
        >
          {loading
            ? mode === "signin"
              ? "Signing in..."
              : "Creating account..."
            : mode === "signin"
              ? "Sign In"
              : "Create Account"}
        </Button>

        <div className="text-xs text-center text-muted-foreground mt-6">
          For support, contact: transport@bmsit.in
        </div>
      </Card>
    </div>
  );
}
