import { useState } from "react";
import Dashboard from "@/components/dashboard";
import Activities from "@/components/activities";
import TimeMachine from "@/components/time-machine";
import Profile from "@/components/profile";
import { useUser } from "@/context/user-context";

const Home = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const { userData } = useUser();

  const handleViewChange = (view: string) => {
    setActiveView(view);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              {/* App Logo */}
              <div className="flex-shrink-0">
                <div className="text-primary-500 font-serif font-bold text-3xl">
                  Sundial
                </div>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="flex space-x-4">
              <button 
                onClick={() => setActiveView('dashboard')} 
                className={`px-3 py-2 text-sm font-medium ${
                  activeView === 'dashboard' 
                    ? 'text-primary-600 border-b-2 border-primary-500' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Dashboard
              </button>
              <button 
                onClick={() => setActiveView('activities')} 
                className={`px-3 py-2 text-sm font-medium ${
                  activeView === 'activities' 
                    ? 'text-primary-600 border-b-2 border-primary-500' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Activities
              </button>
              <button 
                onClick={() => setActiveView('projections')} 
                className={`px-3 py-2 text-sm font-medium ${
                  activeView === 'projections' 
                    ? 'text-primary-600 border-b-2 border-primary-500' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Time Machine
              </button>
              <button 
                onClick={() => setActiveView('profile')} 
                className={`px-3 py-2 text-sm font-medium ${
                  activeView === 'profile' 
                    ? 'text-primary-600 border-b-2 border-primary-500' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Profile
              </button>
            </nav>
          </div>
        </div>
      </header>

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
