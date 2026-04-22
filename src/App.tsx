import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { PremiumProvider } from "@/contexts/PremiumContext";
import PremiumModal from "@/components/PremiumModal";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import PhotoUpload from "./pages/PhotoUpload";
import WeeklyReport from "./pages/WeeklyReport";
import Reminders from "./pages/Reminders";
import CosmeticShelf from "./pages/CosmeticShelf";
import Progress from "./pages/Progress";
import ShoppingList from "./pages/ShoppingList";
import NotFound from "./pages/NotFound";
import AppNav from "./components/AppNav";
import ProfileSidebar from "./components/ProfileSidebar";
import AiChat from "./components/AiChat";

const queryClient = new QueryClient();

import Subscription from "./pages/Subscription";

const protectedPaths = ["/dashboard", "/upload", "/report", "/reminders", "/shelf", "/progress", "/shopping", "/subscription"];

import { useProfile } from "@/contexts/ProfileContext";
import { Loader2 } from "lucide-react";
import { useDailySync } from "@/hooks/useDailySync";

function Layout() {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { loading: profileLoading } = useProfile();
  useDailySync();
  const showNav = location.pathname !== "/";
  const isProtected = protectedPaths.some((p) => location.pathname.startsWith(p));
  const showSidebar = user && isProtected;

  if (authLoading || (user && profileLoading && isProtected)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {showNav && <AppNav />}
      {showSidebar && <ProfileSidebar />}
      <div
        className={
          showSidebar
            ? "md:pl-56 pt-[130px] md:pt-[120px]"
            : showNav
              ? "pt-[80px] md:pt-[120px]"
              : ""
        }
      >
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/upload" element={<PhotoUpload />} />
          <Route path="/shelf" element={<ProtectedRoute><CosmeticShelf /></ProtectedRoute>} />
          <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
          <Route path="/shopping" element={<ProtectedRoute><ShoppingList /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute><WeeklyReport /></ProtectedRoute>} />
          <Route path="/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
          <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <AiChat />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ProfileProvider>
            <PremiumProvider>
              <Layout />
              <PremiumModal />
            </PremiumProvider>
          </ProfileProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
