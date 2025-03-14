import { useState } from "react";
import { UserData } from "@shared/schema";
import { ListChecks, Share2, Calendar, ArrowRight, CheckCircle2, Triangle } from "lucide-react";

const LandingPage = () => {
  // Simplified userData without life expectancy focus
  const [userData, setUserData] = useState<Partial<UserData>>({
    name: "Guest",
    age: 30,
    lifeExpectancy: 85, // kept for compatibility but no longer displayed
    sleepHours: 8,
    username: "guest", // added for compatibility with UserData type
    password: "" // added for compatibility with UserData type
  });

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center">
              <div className="text-black font-sans font-bold text-3xl flex items-center">
                <span>ALL </span>
                <span className="relative mx-1">
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="w-4 h-4 border-black border-2 bg-transparent transform rotate-45"></div>
                  </div>
                  ONE
                </span>
                <span> THING</span>
              </div>
            </div>
            <div className="hidden md:block">
              <p className="text-black font-medium">Co-work. Co-learn. Co-exist.</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => window.location.href = "/login"}
                className="inline-flex items-center justify-center px-4 py-2 border border-black text-sm font-medium rounded-md shadow-sm text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Hero Section - Mobile First Demo */}
        <div className="px-4 py-6 sm:px-0 mb-8">
          <div className="bg-white overflow-hidden shadow-lg rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex flex-col md:flex-row items-center">
                <div className="w-full md:w-1/2 p-4 flex justify-center">
                  {/* Mobile Phone Mockup */}
                  <div className="relative w-64 h-[500px] bg-gray-900 rounded-[36px] border-4 border-gray-800 shadow-xl overflow-hidden">
                    {/* Screen Content */}
                    <div className="absolute inset-0 m-2 rounded-[28px] bg-teal-50 overflow-hidden flex flex-col">
                      {/* App Header */}
                      <div className="bg-white p-4 text-black border-b border-gray-200">
                        <div className="text-xl font-bold flex items-center">
                          <div className="relative mr-2">
                            <span className="relative mx-1">
                              <div className="absolute -top-3 transform rotate-45">
                                <div className="w-3 h-3 border-black border bg-transparent"></div>
                              </div>
                              ONE
                            </span>
                          </div>
                          THING
                        </div>
                      </div>
                      
                      {/* What's Next Card */}
                      <div className="p-4">
                        <div className="text-lg font-semibold mb-2">What's Next?</div>
                        <div className="bg-white p-4 rounded-lg shadow mb-3 flex items-center justify-between">
                          <div>
                            <div className="font-medium">Morning Meditation</div>
                            <div className="text-sm text-gray-500">15 min • Daily Routine</div>
                          </div>
                          <div className="flex space-x-2">
                            <button className="p-2 rounded-full bg-white border border-black text-black">
                              <Triangle size={18} className="transform rotate-180" />
                            </button>
                            <button className="p-2 rounded-full bg-gray-100 text-gray-600">
                              <ArrowRight size={18} />
                            </button>
                          </div>
                        </div>
                        
                        {/* Activity Categories */}
                        <div className="flex space-x-2 overflow-x-auto py-2 mb-4">
                          <div className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm whitespace-nowrap">All</div>
                          <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm whitespace-nowrap">Work</div>
                          <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm whitespace-nowrap">Personal</div>
                          <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm whitespace-nowrap">Health</div>
                        </div>
                        
                        {/* Task List */}
                        <div className="space-y-2">
                          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                            <div className="font-medium">Respond to emails</div>
                            <div className="text-sm text-gray-500">30 min • Work</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                            <div className="font-medium">Grocery shopping</div>
                            <div className="text-sm text-gray-500">45 min • Personal</div>
                          </div>
                          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                            <div className="font-medium">Evening walk</div>
                            <div className="text-sm text-gray-500">20 min • Health</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Bottom Navigation */}
                      <div className="mt-auto bg-white border-t border-gray-200 flex justify-around p-3">
                        <div className="flex flex-col items-center">
                          <Triangle size={20} className="text-black transform rotate-180" />
                          <span className="text-xs">Next</span>
                        </div>
                        <div className="flex flex-col items-center text-gray-400">
                          <ListChecks size={20} />
                          <span className="text-xs">Tasks</span>
                        </div>
                        <div className="flex flex-col items-center text-gray-400">
                          <Share2 size={20} />
                          <span className="text-xs">Community</span>
                        </div>
                        <div className="flex flex-col items-center text-gray-400">
                          <Calendar size={20} />
                          <span className="text-xs">Calendar</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="w-full md:w-1/2 p-4">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">Focus on what's next, not what's gone</h2>
                  <p className="text-lg text-gray-600 mb-6">
                    Life Choices helps you tackle daily tasks while keeping you aligned with your long-term goals. No complicated time tracking, just simple, effective choices.
                  </p>
                  
                  <div className="bg-teal-50 rounded-lg p-4 mb-6 border border-teal-100">
                    <h3 className="text-lg font-medium text-teal-800">Mobile-First Experience</h3>
                    <p className="mt-1 text-sm text-teal-700">
                      Simple swipe interface lets you quickly complete tasks, skip to the next one, or share activities with friends.
                    </p>
                  </div>
                  
                  <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Get started with shared activities</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Received a shared activity? Add it to your account with one tap, or create a free account to start your own routines.
                    </p>
                    <div className="mt-4">
                      <button
                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
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
              <div className="p-3 bg-white border border-black mb-4">
                <Triangle className="h-8 w-8 text-black transform rotate-180" />
              </div>
              <h3 className="font-bold text-lg mb-2">Co-working</h3>
              <p className="text-gray-600">Create collaborative professional spaces with activities designed for focused productivity and teamwork.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center text-center">
              <div className="p-3 bg-white border border-black mb-4">
                <Triangle className="h-8 w-8 text-black" />
              </div>
              <h3 className="font-bold text-lg mb-2">Co-learning</h3>
              <p className="text-gray-600">Engage in educational pursuits that foster knowledge sharing and experiential learning within the community.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center text-center">
              <div className="p-3 bg-white border border-black mb-4">
                <Triangle className="h-8 w-8 text-black transform rotate-90" />
              </div>
              <h3 className="font-bold text-lg mb-2">Co-existing</h3>
              <p className="text-gray-600">Build spaces where shared values and collective experiences strengthen community bonds and support well-being.</p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="px-4 sm:px-0">
          <div className="bg-[#F5F5F0] border border-black rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-12 text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-black sm:text-4xl">
                Join a community that recognizes our shared consciousness
              </h2>
              <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-700">
                Build spaces where humanity can thrive together.
              </p>
              <div className="mt-8">
                <div className="inline-flex rounded-md shadow">
                  <a
                    href="/login"
                    className="inline-flex items-center justify-center px-5 py-3 border border-black text-base font-medium rounded-md text-black bg-white hover:bg-gray-50"
                  >
                    Get Started
                  </a>
                </div>
                <div className="ml-3 inline-flex rounded-md shadow">
                  <a
                    href="/shop-activities"
                    className="inline-flex items-center justify-center px-5 py-3 border border-black text-base font-medium rounded-md text-white bg-black hover:bg-gray-900"
                  >
                    Discover Community Activities
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-[#E8E6D9] shadow-inner">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-black font-sans font-bold text-xl flex items-center mb-4 md:mb-0">
              <span>ALL </span>
              <span className="relative mx-1">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="w-3 h-3 border-black border-2 bg-transparent transform rotate-45"></div>
                </div>
                ONE
              </span>
              <span> THING</span>
            </div>
            <p className="text-center text-sm text-black">
              Co-work. Co-learn. Co-exist. Your New Town Square.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;