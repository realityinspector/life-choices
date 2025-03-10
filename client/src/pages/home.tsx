import { useState, useEffect } from "react";
import Dashboard from "@/components/dashboard";
import Activities from "@/components/activities";
import Profile from "@/components/profile";
import { useUser } from "@/context/user-context";
import Header from "@/components/header";
import { useLocation } from "wouter";
import { CheckCircle2, ArrowRight, Calendar, Share2, ListChecks } from "lucide-react";

interface HomeProps {
  initialView?: string;
}

// Placeholder component for the What's Next view
const WhatsNext = ({ onViewChange }: { onViewChange: (view: string) => void }) => {
  const { userData, getNextActivity, completeActivity } = useUser();
  const [currentActivity, setCurrentActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNextActivity = async () => {
      setLoading(true);
      try {
        const activity = await getNextActivity();
        setCurrentActivity(activity);
      } catch (error) {
        console.error("Error loading next activity:", error);
      } finally {
        setLoading(false);
      }
    };

    loadNextActivity();
  }, [getNextActivity]);

  const handleComplete = async () => {
    if (currentActivity?.id) {
      await completeActivity(currentActivity.id);
      // Reload the next activity
      const nextActivity = await getNextActivity();
      setCurrentActivity(nextActivity);
    }
  };

  const handleSkip = async () => {
    // Skip to the next activity without marking complete
    const nextActivity = await getNextActivity();
    setCurrentActivity(nextActivity);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">What's Next?</h1>
        <button onClick={() => onViewChange('activities')} className="text-teal-600 hover:text-teal-700 flex items-center">
          <ListChecks className="h-5 w-5 mr-1" />
          <span>View All</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="animate-spin h-10 w-10 border-4 border-teal-500 rounded-full border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500">Loading your next activity...</p>
        </div>
      ) : currentActivity ? (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">{currentActivity.name}</h2>
              <p className="text-gray-500">
                {currentActivity.duration} {currentActivity.durationUnit === 'minute' ? 'mins' : 'hours'} • {currentActivity.category}
              </p>
              {currentActivity.description && (
                <p className="mt-4 text-gray-700">{currentActivity.description}</p>
              )}
            </div>
            <div className="rounded-full h-12 w-12 flex items-center justify-center" 
              style={{ backgroundColor: currentActivity.color + '20', color: currentActivity.color }}>
              {currentActivity.emoji || '✓'}
            </div>
          </div>
          <div className="mt-6 flex space-x-4">
            <button
              onClick={handleComplete}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-3 px-4 rounded-md font-medium flex items-center justify-center"
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Complete
            </button>
            <button
              onClick={handleSkip}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-md font-medium flex items-center justify-center"
            >
              <ArrowRight className="h-5 w-5 mr-2" />
              Skip
            </button>
          </div>
          
          <div className="mt-4 flex justify-between border-t pt-4">
            <button
              onClick={() => onViewChange('shop-activities')}
              className="text-teal-600 text-sm font-medium flex items-center"
            >
              Add More Activities
            </button>
            {currentActivity.exportToCalendar && (
              <button className="text-teal-600 text-sm font-medium flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Export to Calendar
              </button>
            )}
            <button className="text-teal-600 text-sm font-medium flex items-center">
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="mb-4 text-gray-400">
            <ListChecks className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">No activities yet</h3>
          <p className="text-gray-500 mb-4">
            You don't have any activities set up. Add some to get started with your day.
          </p>
          <button
            onClick={() => onViewChange('shop-activities')}
            className="bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 rounded-md font-medium"
          >
            Browse Activities
          </button>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Activity Categories</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <button className="bg-teal-100 text-teal-800 p-4 rounded-lg hover:bg-teal-200">
            <span className="block font-medium">Work</span>
            <span className="block text-sm text-teal-600 mt-1">Professional tasks</span>
          </button>
          <button className="bg-blue-100 text-blue-800 p-4 rounded-lg hover:bg-blue-200">
            <span className="block font-medium">Personal</span>
            <span className="block text-sm text-blue-600 mt-1">Self-care &amp; hobbies</span>
          </button>
          <button className="bg-amber-100 text-amber-800 p-4 rounded-lg hover:bg-amber-200">
            <span className="block font-medium">Health</span>
            <span className="block text-sm text-amber-600 mt-1">Fitness &amp; wellness</span>
          </button>
          <button className="bg-purple-100 text-purple-800 p-4 rounded-lg hover:bg-purple-200">
            <span className="block font-medium">Family</span>
            <span className="block text-sm text-purple-600 mt-1">Time with loved ones</span>
          </button>
          <button className="bg-indigo-100 text-indigo-800 p-4 rounded-lg hover:bg-indigo-200">
            <span className="block font-medium">Learning</span>
            <span className="block text-sm text-indigo-600 mt-1">Education &amp; growth</span>
          </button>
          <button className="bg-gray-100 text-gray-800 p-4 rounded-lg hover:bg-gray-200">
            <span className="block font-medium">Other</span>
            <span className="block text-sm text-gray-600 mt-1">Miscellaneous</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Placeholder component for Calendar view
const CalendarView = () => (
  <div className="p-4">
    <h1 className="text-2xl font-bold text-gray-900 mb-6">Calendar</h1>
    <div className="bg-white rounded-lg shadow-md p-6 text-center">
      <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
      <h3 className="text-lg font-medium text-gray-700 mb-2">Calendar Integration</h3>
      <p className="text-gray-500 mb-4">
        Export your scheduled activities to your favorite calendar app to keep track of everything in one place.
      </p>
      <button className="bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 rounded-md font-medium">
        Connect Calendar
      </button>
    </div>
  </div>
);

const Home = ({ initialView = 'nextTask' }: HomeProps) => {
  const [activeView, setActiveView] = useState(initialView);
  const { userData } = useUser();
  const [location, setLocation] = useLocation();
  
  // Update active view if initialView changes
  useEffect(() => {
    if (initialView) {
      setActiveView(initialView);
    }
  }, [initialView]);

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
    
    // For views within the application
    setActiveView(view);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Use the common Header component with full navigation */}
      <Header userData={userData} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {activeView === 'nextTask' && <WhatsNext onViewChange={handleViewChange} />}
        {activeView === 'dashboard' && <Dashboard onViewChange={handleViewChange} />}
        {activeView === 'activities' && <Activities onViewChange={handleViewChange} />}
        {activeView === 'calendar' && <CalendarView />}
        {activeView === 'profile' && <Profile />}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-3">
        <button 
          onClick={() => setActiveView('nextTask')}
          className={`flex flex-col items-center ${activeView === 'nextTask' ? 'text-teal-600' : 'text-gray-500'}`}
        >
          <CheckCircle2 size={20} />
          <span className="text-xs">Next</span>
        </button>
        <button 
          onClick={() => setActiveView('activities')}
          className={`flex flex-col items-center ${activeView === 'activities' ? 'text-teal-600' : 'text-gray-500'}`}
        >
          <ListChecks size={20} />
          <span className="text-xs">Tasks</span>
        </button>
        <button 
          onClick={() => setLocation('/shop-activities')}
          className="flex flex-col items-center text-gray-500"
        >
          <Share2 size={20} />
          <span className="text-xs">Share</span>
        </button>
        <button 
          onClick={() => setActiveView('calendar')}
          className={`flex flex-col items-center ${activeView === 'calendar' ? 'text-teal-600' : 'text-gray-500'}`}
        >
          <Calendar size={20} />
          <span className="text-xs">Calendar</span>
        </button>
      </div>

      {/* Footer - hidden on mobile to make room for bottom navigation */}
      <footer className="bg-white hidden md:block">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">Life Choices: Do what matters, one choice at a time.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
