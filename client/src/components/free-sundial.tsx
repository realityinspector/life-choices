import { useState } from "react";
import { UserData } from "@shared/schema";
import FreeSundialChart from "./ui/free-sundial-chart";

const FreeSundial = () => {
  // Create a complete UserData object with all required fields
  const [userData, setUserData] = useState<UserData>({
    username: "guest",
    password: "", // Not used for the demo
    name: "Guest",
    email: null,
    age: 30,
    lifeExpectancy: 85,
    sleepHours: 8,
    isAdmin: false
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
      <header className="bg-gradient-to-r from-blue-600 to-blue-400 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center">
              <div className="text-white font-serif font-bold text-3xl">
                LIFE CHOICES
              </div>
            </div>
            <div className="hidden md:block">
              <p className="text-blue-100 italic">Shape your timeline, design your future</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => window.location.href = "/"}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow-lg rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex flex-col md:flex-row">
                <div className="w-full md:w-2/3 p-4">
                  <FreeSundialChart userData={userData} />
                </div>
                <div className="w-full md:w-1/3 p-4">
                  <div className="bg-blue-50 rounded-lg p-4 mb-6">
                    <h3 className="text-lg font-medium text-blue-800">Your Life Timeline</h3>
                    <p className="mt-1 text-sm text-blue-700">
                      Visualize your life progress. Adjust your settings to see how your life position changes along the timeline.
                    </p>
                  </div>
                  
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="mb-4 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
                          value={userData.age ?? 30}
                          onChange={handleChange}
                          min="1"
                          max="120"
                          className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="lifeExpectancy" className="block text-sm font-medium text-gray-700">
                          Expected Lifespan (years)
                        </label>
                        <input
                          type="number"
                          id="lifeExpectancy"
                          value={userData.lifeExpectancy ?? 85}
                          onChange={handleChange}
                          min="1"
                          max="120"
                          className="mt-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Want more features?</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Create an account to track activities, visualize your time allocation, and use the Timeline to plan your future.
                    </p>
                    <div className="mt-4">
                      <button
                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        onClick={() => window.location.href = "/"}
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
      </main>

      <footer className="bg-gradient-to-r from-blue-600 to-blue-400 shadow-inner">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-white">
            LIFE CHOICES by ALL ONE THING: Shape your timeline, design your future.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default FreeSundial;