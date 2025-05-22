import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import { useUser, UserProvider } from "./context/user-context";
import LandingPageWrapper from "@/pages/landing";
import LoginPage from "@/pages/login";
import LifeEventsPage from "@/pages/life-events";
import AnalyticsPage from "@/pages/analytics";
import ShopActivitiesPage from "@/pages/shop-activities";
import CartPage from "@/pages/cart";
import WhatsNextPage from "@/pages/whats-next";
import ProfilePage from "@/pages/profile";
import TasksPage from "@/pages/tasks";
import CalendarPage from "@/pages/calendar";
import AdminImagesPage from "@/pages/admin-images";
import AdminLLMPage from "@/pages/admin-llm";
import AdminBackupPage from "@/pages/admin-backup";
import AdminCSVImportPage from "@/pages/admin-csv-import";
import AdminDashboard from "@/pages/admin";
import AdminActivitiesPage from "@/pages/admin-activities";
import AdminActivityFormPage from "@/pages/admin-activity-form";
import BottomNavigation from "@/components/bottom-navigation";
import BookPage from "@/pages/book";
import BookReportPage from "@/pages/book-report";
import BookReportExportPage from "@/pages/book-report-export";
import { BookProvider } from "@/context/book-context";

// Set the document title
document.title = "LIFE CHOICES | Shape your timeline, design your future";

function Router() {
  const { isUserSetup } = useUser();
  const [location] = useLocation();

  // Free routes that don't require authentication
  const freeRoutes = ["/", "/login", "/shared-activity"];
  
  // Admin routes - these bypass normal user authentication
  const adminRoutes = ["/admin", "/admin/images", "/admin/llm", "/admin/backup", "/admin/csv-import"];
  const isAdminRoute = adminRoutes.some(route => location.startsWith(route));

  // Check if we're on a free route
  const isOnFreeRoute = freeRoutes.includes(location);

  // If the user is not set up and not on a free route or admin route, redirect to login
  if (!isUserSetup && !isOnFreeRoute && !isAdminRoute) {
    window.location.href = "/";
    return null;
  }

  return (
    <Switch>
      {/* Only show landing page if user is not logged in */}
      {!isUserSetup && <Route path="/" component={LandingPageWrapper} />}
      <Route path="/login" component={LoginPage} />
      
      {/* Main app - for authenticated users */}
      {isUserSetup && (
        <Route path="/dashboard">
          {() => <Home initialView="dashboard" />}
        </Route>
      )}
      
      {/* "What's Next" view as home for authenticated users */}
      {isUserSetup && (
        <Route path="/whats-next" component={WhatsNextPage} />
      )}
      
      {/* Legacy routes for compatibility */}
      {isUserSetup && (
        <Route path="/next">
          {() => {
            window.location.href = "/whats-next";
            return null;
          }}
        </Route>
      )}
      
      {/* If user is authenticated and goes to home, show What's Next */}
      {isUserSetup && (
        <Route path="/home" component={WhatsNextPage} />
      )}
      
      {/* Default route for authenticated users */}
      {isUserSetup && (
        <Route path="/">
          <WhatsNextPage />
        </Route>
      )}
      
      {/* Task management screens */}
      {isUserSetup && <Route path="/activities" component={TasksPage} />}
      
      {/* Calendar view */}
      {isUserSetup && <Route path="/calendar" component={CalendarPage} />}
      
      {/* User profile */}
      {isUserSetup && <Route path="/profile" component={ProfilePage} />}
      
      {/* Shopping and social features */}
      {isUserSetup && <Route path="/shop-activities" component={ShopActivitiesPage} />}
      {isUserSetup && <Route path="/cart" component={CartPage} />}
      {isUserSetup && <Route path="/share" component={CartPage} />} {/* Temporary, will be replaced with dedicated share page */}
      
      {/* Analytics */}
      {isUserSetup && <Route path="/analytics" component={AnalyticsPage} />}
      
      {/* Legacy routes */}
      {isUserSetup && <Route path="/life-events" component={LifeEventsPage} />}
      
      {/* Admin routes - accessible with or without normal user setup */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/activities" component={AdminActivitiesPage} />
      <Route path="/admin/activities/:id" component={AdminActivityFormPage} />
      <Route path="/admin/images" component={AdminImagesPage} />
      <Route path="/admin/llm" component={AdminLLMPage} />
      <Route path="/admin/backup" component={AdminBackupPage} />
      <Route path="/admin/csv-import" component={AdminCSVImportPage} />
      <Route path="/admin/recipes" component={AdminRecipes} />
      
      <Route path="/book" component={BookPage} />
      <Route path="/book-report" component={BookReportPage} />
      <Route path="/book-report-export" component={BookReportExportPage} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isUserSetup } = useUser();
  const [location] = useLocation();
  
  // Admin routes - don't show bottom nav
  const adminRoutes = ["/admin", "/admin/images", "/admin/llm", "/admin/backup"];
  const isAdminRoute = adminRoutes.some(route => location.startsWith(route));
  
  // Login/landing routes - don't show bottom nav
  const noNavRoutes = ["/login", "/shared-activity"];
  const shouldShowNav = isUserSetup && !isAdminRoute && !noNavRoutes.includes(location);
  
  return (
    <div className="flex flex-col min-h-screen">
      <Router />
      {shouldShowNav && <div className="fixed bottom-0 left-0 right-0 z-50">
        <BottomNavigation />
      </div>}
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <BookProvider>
          <AppContent />
        </BookProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}
