import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/context/user-context";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserData } from "@shared/schema";

const LoginForm = ({ onSwitchForm }: { onSwitchForm: () => void }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { completeSetup } = useUser();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Since we're using in-memory storage, we'll simulate a login
    // In a real app, this would be an API call
    if (username && password) {
      // Create a user with default values
      const userData: UserData = {
        name: username,
        username: username, // Set username explicitly
        password: password, // Include password
        age: 30,
        lifeExpectancy: 85,
        sleepHours: 8
      };
      
      completeSetup(userData);
      toast({
        title: "Login successful",
        description: "Welcome back to Life Choices!",
      });
      setLocation("/whats-next");
    } else {
      toast({
        title: "Login failed",
        description: "Please enter your username and password",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-username">Username</Label>
          <Input
            id="login-username"
            placeholder="your-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="login-password">Password</Label>
          <Input
            id="login-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
      </div>
      <Button className="w-full mt-6" type="submit">
        Sign In
      </Button>
      <div className="mt-4 text-center text-sm">
        <span className="text-gray-500">Don't have an account?</span>{" "}
        <button
          type="button"
          className="text-blue-600 hover:underline"
          onClick={onSwitchForm}
        >
          Sign up
        </button>
      </div>
    </form>
  );
};

const RegisterForm = ({ onSwitchForm }: { onSwitchForm: () => void }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState<number>(30);
  const [lifeExpectancy, setLifeExpectancy] = useState<number>(85);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { completeSetup } = useUser();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Similar to login, we're simulating registration
    if (username && password && name) {
      const userData: UserData = {
        name,
        username, // Set username explicitly
        password, // Include password
        age,
        lifeExpectancy,
        sleepHours: 8
      };
      
      completeSetup(userData);
      toast({
        title: "Registration successful",
        description: "Welcome to Life Choices!",
      });
      setLocation("/whats-next");
    } else {
      toast({
        title: "Registration failed",
        description: "Please fill out all required fields",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleRegister}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="register-username">Username</Label>
          <Input
            id="register-username"
            placeholder="your-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-password">Password</Label>
          <Input
            id="register-password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-name">Full Name</Label>
          <Input
            id="register-name"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-age">Your Age</Label>
          <Input
            id="register-age"
            type="number"
            min={1}
            max={120}
            value={age}
            onChange={(e) => setAge(parseInt(e.target.value))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="register-life-expectancy">Life Expectancy (years)</Label>
          <Input
            id="register-life-expectancy"
            type="number"
            min={age}
            max={120}
            value={lifeExpectancy}
            onChange={(e) => setLifeExpectancy(parseInt(e.target.value))}
            required
          />
        </div>
      </div>
      <Button className="w-full mt-6" type="submit">
        Create Account
      </Button>
      <div className="mt-4 text-center text-sm">
        <span className="text-gray-500">Already have an account?</span>{" "}
        <button
          type="button"
          className="text-blue-600 hover:underline"
          onClick={onSwitchForm}
        >
          Sign in
        </button>
      </div>
    </form>
  );
};

const Login = () => {
  const [activeTab, setActiveTab] = useState<string>("login");

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Left side - Login/Register form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 text-teal-600 flex items-center justify-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8 mr-2"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              Life Choices
            </h1>
            <p className="text-gray-600 mt-2">Do what matters, one choice at a time</p>
          </div>

          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-xl font-semibold mb-2">
                {activeTab === "login" ? "Welcome back" : "Create your account"}
              </CardTitle>
              <CardDescription className="mb-4">
                {activeTab === "login" 
                  ? "Sign in to access your Life Choices app" 
                  : "Start making better choices every day"
                }
              </CardDescription>
              
              <Tabs defaultValue={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Sign In</TabsTrigger>
                  <TabsTrigger value="register">Create Account</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  <LoginForm onSwitchForm={() => handleTabChange("register")} />
                </TabsContent>
                <TabsContent value="register">
                  <RegisterForm onSwitchForm={() => handleTabChange("login")} />
                </TabsContent>
              </Tabs>
            </CardHeader>
            <CardContent>
              {/* Card content here if needed */}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right side - Hero image and information */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-teal-600 to-teal-700 text-white p-10 items-center">
        <div className="max-w-lg mx-auto space-y-8">
          <div>
            <h2 className="text-4xl font-bold tracking-tight">Make Better Choices Every Day</h2>
            <p className="mt-4 text-xl text-teal-100">
              Focus on what matters most with a simple, intuitive task management system.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start space-x-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-full">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold">What's Next?</h3>
                <p className="text-teal-100">Always know the most important thing to focus on right now.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-full">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Smart Activity Management</h3>
                <p className="text-teal-100">Browse and discover pre-made activities to keep your life balanced.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-full">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Share With Friends</h3>
                <p className="text-teal-100">Invite friends to join your activities and build habits together.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;