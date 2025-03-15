import { useState, useEffect, useRef } from "react";
import { UserData } from "@shared/schema";
import { ListChecks, Share2, Calendar, ArrowRight, CheckCircle2, Triangle, Clock, Sparkles } from "lucide-react";

// Fractal timeline background component
const FractalAnimation = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions to match parent container
    const setCanvasDimensions = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetHeight;
      } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    
    setCanvasDimensions();
    
    // Add listener for window resize
    const handleResize = () => {
      setCanvasDimensions();
    };
    
    window.addEventListener('resize', handleResize);
    
    // Animation parameters
    let animationFrameId: number;
    let points: { x: number; y: number; vx: number; vy: number; life: number; size: number; hue: number }[] = [];
    let time = 0;
    
    // Create timeline points
    const createPoints = () => {
      const totalPoints = Math.floor(canvas.width / 60); // Density of points
      
      for (let i = 0; i < totalPoints; i++) {
        points.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          life: Math.random() * 100 + 50,
          size: Math.random() * 2 + 2,
          hue: Math.random() * 60 + 180, // Blue to teal color range
        });
      }
    };
    
    // Initialize points
    createPoints();
    
    // Draw connection lines between points (timeline connections)
    const drawConnections = () => {
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 150) { // Max distance for connection
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[j].x, points[j].y);
            
            // Gradient based on distance
            const opacity = 1 - distance / 150;
            const hue = (points[i].hue + points[j].hue) / 2;
            ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${opacity * 0.2})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }
    };
    
    // Draw fractal circles at each point
    const drawFractalPoints = () => {
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const size = point.size + Math.sin(time * 0.05 + i) * 1;
        
        // Draw outer glow
        const gradient = ctx.createRadialGradient(
          point.x, point.y, 0,
          point.x, point.y, size * 3
        );
        gradient.addColorStop(0, `hsla(${point.hue}, 80%, 60%, 0.4)`);
        gradient.addColorStop(1, `hsla(${point.hue}, 80%, 60%, 0)`);
        
        ctx.beginPath();
        ctx.arc(point.x, point.y, size * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Draw center point
        ctx.beginPath();
        ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${point.hue}, 80%, 60%, 0.8)`;
        ctx.fill();
      }
    };
    
    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update time
      time += 1;
      
      // Update points
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        
        // Move points
        point.x += point.vx;
        point.y += point.vy;
        
        // Boundary checks
        if (point.x < 0 || point.x > canvas.width) {
          point.vx = -point.vx;
        }
        
        if (point.y < 0 || point.y > canvas.height) {
          point.vy = -point.vy;
        }
        
        // Update life
        point.life -= 0.1;
        
        // Recycle dead points
        if (point.life <= 0) {
          points[i] = {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            life: Math.random() * 100 + 50,
            size: Math.random() * 2 + 2,
            hue: Math.random() * 60 + 180,
          };
        }
      }
      
      // Draw connections first (background)
      drawConnections();
      
      // Draw points on top
      drawFractalPoints();
      
      // Continue animation
      animationFrameId = requestAnimationFrame(animate);
    };
    
    // Start animation
    animate();
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full opacity-30 z-0"
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
                onClick={() => window.location.href = "/"}
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
                    <div className="absolute inset-0 m-2 rounded-[28px] bg-gradient-to-b from-indigo-50 to-teal-50 overflow-hidden flex flex-col">
                      {/* App Header */}
                      <div className="bg-gradient-to-r from-indigo-900 to-purple-900 p-4 text-white border-b border-indigo-700">
                        <div className="text-xl font-bold flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="mr-1">LIFE</span>
                            <span className="text-teal-400 mx-1">CHOICES</span>
                          </div>
                          <div className="bg-teal-400 bg-opacity-20 px-2 py-0.5 rounded-full text-xs text-teal-300 flex items-center">
                            <Clock size={14} className="mr-1" />
                            <span>March 15, 2025</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Timeline View */}
                      <div className="p-4">
                        <div className="text-lg font-semibold mb-2 flex items-center">
                          <span>Life Timeline</span>
                          <div className="ml-2 px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-xs">Today</div>
                        </div>
                        
                        {/* Current Moment Highlight */}
                        <div className="bg-gradient-to-r from-indigo-500 to-teal-400 p-4 rounded-lg shadow mb-3">
                          <div className="text-white font-medium">Present Moment</div>
                          <div className="text-sm text-white opacity-80 flex items-center">
                            <Clock size={14} className="mr-1" />
                            <span>Now • Make your choice</span>
                          </div>
                          <div className="mt-2 flex justify-between items-center">
                            <div className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-xs text-white">
                              Timeline Junction
                            </div>
                            <div className="flex space-x-2">
                              <button className="p-1.5 rounded-full bg-white text-indigo-600">
                                <Sparkles size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Timeline Navigation */}
                        <div className="flex space-x-2 overflow-x-auto py-2 mb-4">
                          <div className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm whitespace-nowrap">Timeline</div>
                          <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm whitespace-nowrap">Past</div>
                          <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm whitespace-nowrap">Future</div>
                          <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm whitespace-nowrap">Choices</div>
                        </div>
                        
                        {/* Timeline Branches */}
                        <div className="relative">
                          {/* Timeline connector */}
                          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-teal-500"></div>
                          
                          {/* Timeline items */}
                          <div className="space-y-4 pl-12 relative">
                            <div className="relative">
                              <div className="absolute left-[-24px] top-1 w-4 h-4 rounded-full bg-indigo-500 border-2 border-white"></div>
                              <div className="bg-white p-3 rounded-lg shadow-sm border border-indigo-100">
                                <div className="font-medium text-indigo-800">Path to Success</div>
                                <div className="text-sm text-indigo-500">Future • High Impact Choice</div>
                              </div>
                            </div>
                            
                            <div className="relative">
                              <div className="absolute left-[-24px] top-1 w-4 h-4 rounded-full bg-purple-500 border-2 border-white"></div>
                              <div className="bg-white p-3 rounded-lg shadow-sm border border-purple-100">
                                <div className="font-medium text-purple-800">Learning Journey</div>
                                <div className="text-sm text-purple-500">Ongoing • Personal Growth</div>
                              </div>
                            </div>
                            
                            <div className="relative">
                              <div className="absolute left-[-24px] top-1 w-4 h-4 rounded-full bg-teal-500 border-2 border-white"></div>
                              <div className="bg-white p-3 rounded-lg shadow-sm border border-teal-100">
                                <div className="font-medium text-teal-800">Well-being Focus</div>
                                <div className="text-sm text-teal-500">Daily • Health Priority</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Bottom Navigation */}
                      <div className="mt-auto bg-gradient-to-r from-indigo-900 to-indigo-800 border-t border-indigo-700 flex justify-around p-3">
                        <div className="flex flex-col items-center text-teal-400">
                          <Clock size={20} />
                          <span className="text-xs text-teal-300">Now</span>
                        </div>
                        <div className="flex flex-col items-center text-white opacity-60">
                          <Triangle size={20} className="transform rotate-270" />
                          <span className="text-xs">Past</span>
                        </div>
                        <div className="flex flex-col items-center text-white opacity-60">
                          <Triangle size={20} className="transform rotate-90" />
                          <span className="text-xs">Future</span>
                        </div>
                        <div className="flex flex-col items-center text-white opacity-60">
                          <Sparkles size={20} />
                          <span className="text-xs">Choices</span>
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
                        onClick={() => window.location.href = "/"}
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
                    href="/"
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