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
      <Route path="/" component={LandingPageWrapper} />
      <Route path="/login" component={LoginPage} />
      {/* Updated routes to match our new mobile-first approach */}
      {isUserSetup && <Route path="/whats-next">
        {() => <Home initialView="nextTask" />}
      </Route>}
      {isUserSetup && <Route path="/tasks">
        {() => <Home initialView="activities" />}
      </Route>}
      {isUserSetup && <Route path="/calendar">
        {() => <Home initialView="calendar" />}
      </Route>}
      {isUserSetup && <Route path="/profile">
        {() => <Home initialView="profile" />}
      </Route>}
      {isUserSetup && <Route path="/life-events" component={LifeEventsPage} />}
      {isUserSetup && <Route path="/shop-activities" component={ShopActivitiesPage} />}
      {isUserSetup && <Route path="/analytics" component={AnalyticsPage} />}
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
