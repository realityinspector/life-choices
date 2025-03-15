import { useState, useEffect, useRef } from "react";
import { UserData } from "@shared/schema";
import { ListChecks, Share2, Calendar, ArrowRight, CheckCircle2, Triangle, Clock, Sparkles } from "lucide-react";

// Fractal animation component
const FractalAnimation = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    const setCanvasDimensions = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    
    setCanvasDimensions();
    window.addEventListener('resize', setCanvasDimensions);
    
    let hue = 0;
    let branches = 3;
    let scale = 0.55;
    let maxDepth = 6;
    let startAngle = 0;
    let angle = Math.PI * 2 * 0.45;
    let lineWidth = 15;
    let frameCount = 0;
    
    const drawFractal = (x: number, y: number, length: number, angle: number, depth: number) => {
      if (!ctx) return;
      
      ctx.beginPath();
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -length);
      
      const colorHue = (hue + depth * 30) % 360;
      ctx.strokeStyle = `hsl(${colorHue}, 100%, ${40 + depth * 10}%)`;
      ctx.lineWidth = lineWidth * (1 - depth / maxDepth);
      ctx.lineCap = 'round';
      ctx.stroke();
      
      if (depth < maxDepth) {
        for (let i = 0; i < branches; i++) {
          ctx.save();
          ctx.translate(0, -length);
          ctx.scale(scale, scale);
          
          const branchAngle = angle * (i + 1);
          drawFractal(0, 0, length, branchAngle, depth + 1);
          
          ctx.restore();
        }
      }
      
      ctx.restore();
    };
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Center the fractal
      const centerX = canvas.width / 2;
      const centerY = canvas.height;
      
      // Animate the starting angle
      startAngle += 0.005;
      frameCount++;
      
      // Pulse the size based on time
      const sizePulse = Math.sin(frameCount * 0.02) * 10 + 70;
      
      // Draw the fractal
      drawFractal(centerX, centerY, sizePulse, -Math.PI / 2 + Math.sin(startAngle) * 0.2, 0);
      
      // Change hue over time
      hue += 0.5;
      
      requestAnimationFrame(animate);
    };
    
    // Start animation
    animate();
    
    return () => {
      window.removeEventListener('resize', setCanvasDimensions);
    };
  }, []);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full opacity-20 z-0"
    />
  );
};

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
    <div className="min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-indigo-800 text-white relative overflow-hidden">
      <FractalAnimation />
      
      <header className="relative z-10 border-b border-indigo-700 bg-opacity-30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center">
              <div className="text-white font-sans font-bold text-3xl flex items-center">
                <span className="mr-1">LIFE</span>
                <span className="text-teal-400 mx-1">CHOICES</span>
                <span className="text-sm font-light mt-2 ml-2">by</span>
                <span className="ml-2">ALL </span>
                <span className="relative mx-1">
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-b-[18px] border-solid border-teal-400"></div>
                  </div>
                  <span className="text-teal-400">ONE</span>
                </span>
                <span> THING</span>
              </div>
            </div>
            <div className="hidden md:block">
              <p className="text-teal-300 font-medium italic">Shape your timeline, design your future</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => window.location.href = "/login"}
                className="inline-flex items-center justify-center px-4 py-2 border border-teal-400 text-sm font-medium rounded-md shadow-sm text-white bg-transparent hover:bg-teal-900 hover:bg-opacity-30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all duration-300"
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
                              <div className="absolute -top-3 transform">
                                <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[12px] border-solid border-black"></div>
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
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">Shape Your Timeline, Design Your Future</h2>
                  <p className="text-lg text-gray-600 mb-6">
                    LIFE CHOICES by ALL ONE THING helps you visualize and manage your time in a meaningful way. Navigate your life's timeline with purpose and clarity, making every moment count.
                  </p>
                  
                  <div className="bg-teal-50 rounded-lg p-4 mb-6 border border-teal-200">
                    <h3 className="text-lg font-medium text-teal-800 flex items-center">
                      <Clock className="mr-2 h-5 w-5 text-teal-600" />
                      Timeline Visualization
                    </h3>
                    <p className="mt-1 text-sm text-teal-700">
                      Visualize your life as a beautiful fractal timeline. See how your choices and activities interconnect to form the tapestry of your existence.
                    </p>
                  </div>
                  
                  <div className="mt-6 bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                    <h3 className="text-lg font-medium text-indigo-800 flex items-center">
                      <Sparkles className="mr-2 h-5 w-5 text-indigo-600" />
                      Fractal Time Management
                    </h3>
                    <p className="mt-1 text-sm text-indigo-700">
                      Experience how small choices create profound ripple effects throughout your life. Our fractal approach helps you see patterns and make better decisions.
                    </p>
                    <div className="mt-4">
                      <button
                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300"
                        onClick={() => window.location.href = "/login"}
                      >
                        Begin Your Timeline Journey
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="px-4 sm:px-0 mb-8 relative z-10">
          <h2 className="text-2xl font-bold text-center mb-8 text-white">Fractal Timeline Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-indigo-800 to-indigo-900 p-6 rounded-lg shadow-lg flex flex-col items-center text-center border border-indigo-600">
              <div className="p-3 bg-teal-400 bg-opacity-20 rounded-full mb-4 backdrop-blur-sm">
                <Clock className="h-8 w-8 text-teal-300" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-white">Time Visualization</h3>
              <p className="text-indigo-200">See your life as a beautiful branching timeline, with each choice creating new fractal patterns in your journey through time.</p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-800 to-purple-900 p-6 rounded-lg shadow-lg flex flex-col items-center text-center border border-purple-600">
              <div className="p-3 bg-teal-400 bg-opacity-20 rounded-full mb-4 backdrop-blur-sm">
                <Triangle className="h-8 w-8 text-teal-300" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-white">Ripple Effects</h3>
              <p className="text-purple-200">Understand how small decisions create profound ripple effects throughout your life's timeline, visualized through interactive fractal patterns.</p>
            </div>
            
            <div className="bg-gradient-to-br from-blue-800 to-blue-900 p-6 rounded-lg shadow-lg flex flex-col items-center text-center border border-blue-600">
              <div className="p-3 bg-teal-400 bg-opacity-20 rounded-full mb-4 backdrop-blur-sm">
                <Sparkles className="h-8 w-8 text-teal-300" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-white">Life Patterns</h3>
              <p className="text-blue-200">Discover recurring patterns in your life choices and optimize your time allocation for greater meaning, purpose and joy.</p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="px-4 sm:px-0 relative z-10">
          <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 rounded-lg shadow-xl overflow-hidden border border-teal-500">
            <div className="px-6 py-12 text-center backdrop-blur-sm">
              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Begin Your Fractal Timeline Journey
              </h2>
              <p className="mt-4 max-w-2xl mx-auto text-xl text-teal-200">
                Make every choice matter. Design your future with purpose and clarity.
              </p>
              <div className="mt-8">
                <div className="inline-flex rounded-md shadow">
                  <a
                    href="/login"
                    className="inline-flex items-center justify-center px-5 py-3 border border-teal-400 text-base font-medium rounded-md text-white bg-transparent hover:bg-teal-900 hover:bg-opacity-30 transition-all duration-300"
                  >
                    Start Your Timeline
                  </a>
                </div>
                <div className="ml-3 inline-flex rounded-md shadow">
                  <a
                    href="/shop-activities"
                    className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-indigo-900 bg-teal-400 hover:bg-teal-300 transition-all duration-300"
                  >
                    Explore Life Choices
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-indigo-700 mt-12 bg-black bg-opacity-30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-white font-sans font-bold text-xl flex items-center mb-4 md:mb-0">
              <span className="mr-1">LIFE</span>
              <span className="text-teal-400 mx-1">CHOICES</span>
              <span className="text-sm font-light mt-1 ml-2">by</span>
              <span className="ml-2">ALL </span>
              <span className="relative mx-1">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[12px] border-solid border-teal-400"></div>
                </div>
                <span className="text-teal-400">ONE</span>
              </span>
              <span> THING</span>
            </div>
            <p className="text-center text-sm text-teal-100">
              Shape your timeline. Design your future. Make better life choices.
            </p>
          </div>
          <div className="mt-4 text-center text-xs text-indigo-200 opacity-70">
            © {new Date().getFullYear()} • Fractal Time Management • ALL ONE THING
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;