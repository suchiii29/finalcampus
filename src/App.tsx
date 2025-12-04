// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ThemeProvider";

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
import DriverLocation from "./pages/driver/Location";   

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminHeatmap from "./pages/admin/Heatmap";
import AdminReports from "./pages/admin/Reports";

import ProtectedRoute from "./components/ProtectedRoute";
import AdminSetup from './pages/AdminSetup';

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <Routes>

        {/* Public homepage */}
        <Route path="/" element={<Index />} />

        {/* Public login routes */}
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/driver/login" element={<DriverLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin-setup" element={<AdminSetup />} />

        {/* Student & Teacher protected routes */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute requiredRole={["STUDENT", "TEACHER"]}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/request"
          element={
            <ProtectedRoute requiredRole={["STUDENT", "TEACHER"]}>
              <RequestRide />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/rides"
          element={
            <ProtectedRoute requiredRole={["STUDENT", "TEACHER"]}>
              <StudentRides />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/profile"
          element={
            <ProtectedRoute requiredRole={["STUDENT", "TEACHER"]}>
              <StudentProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/track/:rideId"
          element={
            <ProtectedRoute requiredRole={["STUDENT", "TEACHER"]}>
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
          path="/driver/location"
          element={
            <ProtectedRoute requiredRole="DRIVER">
              <DriverLocation />
            </ProtectedRoute>
          }
        />

        {/* ADMIN protected routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* ❌ Vehicles route removed here */}

        <Route
          path="/admin/heatmap"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AdminHeatmap />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AdminReports />
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster />
    </ThemeProvider>
  );
}

export default App;
