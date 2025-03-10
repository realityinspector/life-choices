import { useState } from "react";
import { UserData } from "@shared/schema";
import { Clock, BarChart2, PieChart, Activity } from "lucide-react";
import FreeSundialChart from "./ui/free-sundial-chart";

const LandingPage = () => {
  const [userData, setUserData] = useState<UserData>({
    name: "Guest",
    age: 30,
    lifeExpectancy: 85,
    sleepHours: 8
  });

  const [showSettings, setShowSettings] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setUserData({
      ...userData,
      [id]: id === 'name' ? value : Number(value)
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gradient-to-r from-indigo-600 to-purple-400 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center">
              <div className="text-white font-serif font-bold text-3xl flex items-center">
                <Clock className="h-8 w-8 mr-2" />
                TimeVision
              </div>
            </div>
            <div className="hidden md:block">
              <p className="text-indigo-100 italic">Map your life's journey through time</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => window.location.href = "/login"}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="px-4 py-6 sm:px-0 mb-8">
          <div className="bg-white overflow-hidden shadow-lg rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex flex-col md:flex-row">
                <div className="w-full md:w-2/3 p-4">
                  <FreeSundialChart userData={userData} />
                </div>
                <div className="w-full md:w-1/3 p-4">
                  <div className="bg-indigo-50 rounded-lg p-4 mb-6">
                    <h3 className="text-lg font-medium text-indigo-800">Your Life Timeline</h3>
                    <p className="mt-1 text-sm text-indigo-700">
                      Visualize your life as a 24-hour clock. Adjust your settings to see how your life position changes.
                    </p>
                  </div>
                  
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="mb-4 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {showSettings ? "Hide Settings" : "Adjust Your Settings"}
                  </button>
                  
                  {showSettings && (
                    <div className="space-y-4 mt-4">
                      <div>
                        <label htmlFor="age" className="block text-sm font-medium text-gray-700">
                          Your Current Age
                        </label>
                        <input
                          type="number"
                          id="age"
                          value={userData.age}
                          onChange={handleChange}
                          min="1"
                          max="120"
                          className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="lifeExpectancy" className="block text-sm font-medium text-gray-700">
                          Expected Lifespan (years)
                        </label>
                        <input
                          type="number"
                          id="lifeExpectancy"
                          value={userData.lifeExpectancy}
                          onChange={handleChange}
                          min="1"
                          max="120"
                          className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Want more features?</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Create an account to track activities, visualize your time allocation, and use the Time Machine to plan your future.
                    </p>
                    <div className="mt-4">
                      <button
                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        onClick={() => window.location.href = "/login"}
                      >
                        Create Free Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="px-4 sm:px-0 mb-8">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center text-center">
              <div className="p-3 bg-indigo-100 rounded-full mb-4">
                <BarChart2 className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Activity Analytics</h3>
              <p className="text-gray-600">Track and analyze how you spend your time with detailed visualizations and metrics.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center text-center">
              <div className="p-3 bg-indigo-100 rounded-full mb-4">
                <Activity className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Activity Shop</h3>
              <p className="text-gray-600">Discover personalized activity recommendations to enhance your time allocation.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center text-center">
              <div className="p-3 bg-indigo-100 rounded-full mb-4">
                <PieChart className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">Time Machine</h3>
              <p className="text-gray-600">Project your future and visualize how your decisions today impact your lifetime.</p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="px-4 sm:px-0">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg shadow-xl overflow-hidden">
            <div className="px-6 py-12 text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Start optimizing your lifetime today
              </h2>
              <p className="mt-4 max-w-2xl mx-auto text-xl text-indigo-100">
                Join thousands of users who are making the most of their limited time.
              </p>
              <div className="mt-8">
                <div className="inline-flex rounded-md shadow">
                  <a
                    href="/login"
                    className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50"
                  >
                    Get Started
                  </a>
                </div>
                <div className="ml-3 inline-flex rounded-md shadow">
                  <a
                    href="/shop-activities"
                    className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-800 hover:bg-indigo-900"
                  >
                    Shop Activities
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gradient-to-r from-indigo-800 to-purple-800 shadow-inner">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-white">
            TimeVision: Life Time Management. Visualize and optimize your lifetime.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;