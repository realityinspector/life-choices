import { useState } from "react";
import Dashboard from "@/components/dashboard";
import Activities from "@/components/activities";
import TimeMachine from "@/components/time-machine";
import Profile from "@/components/profile";
import { useUser } from "@/context/user-context";
import Header from "@/components/header";
import { useLocation } from "wouter";

const Home = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const { userData } = useUser();
  const [location, setLocation] = useLocation();

  const handleViewChange = (view: string) => {
    // Handle special views that should redirect to different pages
    if (view === 'shop-activities') {
      setLocation('/shop-activities');
      return;
    }
    if (view === 'life-events') {
      setLocation('/life-events');
      return;
    } 
    if (view === 'analytics') {
      setLocation('/analytics');
      return;
    }
    
    // For views within the dashboard
    setActiveView(view);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Use the common Header component with full navigation */}
      <Header userData={userData} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {activeView === 'dashboard' && <Dashboard onViewChange={handleViewChange} />}
        {activeView === 'activities' && <Activities onViewChange={handleViewChange} />}
        {activeView === 'projections' && <TimeMachine />}
        {activeView === 'profile' && <Profile />}
      </main>

      {/* Footer */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">Sundial: Life Time Management. Visualize and optimize your lifetime.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
