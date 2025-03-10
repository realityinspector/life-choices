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

// Set the document title
document.title = "Life Choices | Do what matters, one choice at a time";

function Router() {
  const { isUserSetup } = useUser();
  const [location] = useLocation();

  // Free routes that don't require authentication
  const freeRoutes = ["/", "/login", "/shared-activity"];

  // Check if we're on a free route
  const isOnFreeRoute = freeRoutes.includes(location);

  // If the user is not set up and not on a free route, redirect to login
  if (!isUserSetup && !isOnFreeRoute) {
    window.location.href = "/login";
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
      {isUserSetup && (
        <Route path="/activities">
          {() => <Home initialView="activities" />}
        </Route>
      )}
      
      {/* Calendar view */}
      {isUserSetup && (
        <Route path="/calendar">
          {() => <Home initialView="calendar" />}
        </Route>
      )}
      
      {/* User profile */}
      {isUserSetup && (
        <Route path="/profile">
          {() => <Home initialView="profile" />}
        </Route>
      )}
      
      {/* Shopping and social features */}
      {isUserSetup && <Route path="/shop-activities" component={ShopActivitiesPage} />}
      {isUserSetup && <Route path="/cart" component={CartPage} />}
      {isUserSetup && <Route path="/share">
        {() => <CartPage />} {/* Temporary, will be replaced with dedicated share page */}
      </Route>}
      
      {/* Analytics */}
      {isUserSetup && <Route path="/analytics" component={AnalyticsPage} />}
      
      {/* Legacy routes */}
      {isUserSetup && <Route path="/life-events" component={LifeEventsPage} />}
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <Router />
        <Toaster />
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;
