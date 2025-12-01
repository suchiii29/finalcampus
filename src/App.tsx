// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";

// Main page (portals)
import Index from "./pages/Index";

// Login pages
import StudentLogin from "./pages/login/StudentLogin";
import DriverLogin from "./pages/login/DriverLogin";
import AdminLogin from "./pages/login/AdminLogin";

// Student pages
import StudentDashboard from "./pages/student/Dashboard";
import RequestRide from "./pages/student/RequestRide";
import StudentRides from "./pages/student/Rides";
import StudentProfile from "./pages/student/Profile";
import TrackRide from "./pages/student/TrackRide";

// Driver pages
import DriverDashboard from "./pages/driver/Dashboard";
import DriverLocation from "./pages/driver/Location";   // ⭐ ADDED

// Admin page
import AdminDashboard from "./pages/admin/Dashboard";

// Protected Route
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <>
      <Routes>

        {/* Public homepage */}
        <Route path="/" element={<Index />} />

        {/* Public login routes */}
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/driver/login" element={<DriverLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Student protected routes */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute requiredRole="STUDENT">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/request"
          element={
            <ProtectedRoute requiredRole="STUDENT">
              <RequestRide />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/rides"
          element={
            <ProtectedRoute requiredRole="STUDENT">
              <StudentRides />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/profile"
          element={
            <ProtectedRoute requiredRole="STUDENT">
              <StudentProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/track/:rideId"
          element={
            <ProtectedRoute requiredRole="STUDENT">
              <TrackRide />
            </ProtectedRoute>
          }
        />

        {/* Driver protected routes */}
        <Route
          path="/driver/dashboard"
          element={
            <ProtectedRoute requiredRole="DRIVER">
              <DriverDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/driver/location"     // ⭐ FIXED
          element={
            <ProtectedRoute requiredRole="DRIVER">
              <DriverLocation />
            </ProtectedRoute>
          }
        />

        {/* Admin protected routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster />
    </>
  );
}

export default App;
