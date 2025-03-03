import { useState } from "react";
import { useUser } from "@/context/user-context";
import { UserData } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const Onboarding = () => {
  const { completeSetup } = useUser();
  const { toast } = useToast();
  const [userData, setUserData] = useState<UserData>({
    name: '',
    age: 30,
    lifeExpectancy: 85,
    sleepHours: 8
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setUserData({
      ...userData,
      [id]: id === 'name' ? value : Number(value)
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    completeSetup(userData);
    toast({
      title: "Profile created",
      description: "Your profile has been successfully created. Welcome to Sundial!",
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="text-primary-500 font-serif font-bold text-3xl">
                Sundial
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg divide-y divide-gray-200">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">Welcome to Sundial</h2>
              <p className="mt-1 text-sm text-gray-500">Let's set up your profile to get started</p>
            </div>
            <div className="px-4 py-5 sm:p-6">
              <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Your Name</label>
                    <div className="mt-1">
                      <input 
                        type="text" 
                        id="name" 
                        value={userData.name}
                        onChange={handleChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-3 border bg-white" 
                        placeholder="John Doe" 
                        required 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="age" className="block text-sm font-medium text-gray-700">Your Age</label>
                    <div className="mt-1">
                      <input 
                        type="number" 
                        id="age" 
                        value={userData.age}
                        onChange={handleChange}
                        min="1" 
                        max="120" 
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-3 border bg-white" 
                        placeholder="35" 
                        required 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="lifeExpectancy" className="block text-sm font-medium text-gray-700">
                      Expected Lifespan (years)
                    </label>
                    <div className="mt-1">
                      <input 
                        type="number" 
                        id="lifeExpectancy" 
                        value={userData.lifeExpectancy}
                        onChange={handleChange}
                        min="1" 
                        max="120" 
                        className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border" 
                        placeholder="85" 
                        required 
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="sleepHours" className="block text-sm font-medium text-gray-700">
                      Average Sleep Hours per Day
                    </label>
                    <div className="mt-1">
                      <input 
                        type="number" 
                        id="sleepHours" 
                        value={userData.sleepHours}
                        onChange={handleChange}
                        min="1" 
                        max="24" 
                        step="0.5" 
                        className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border" 
                        placeholder="8" 
                        required 
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button 
                      type="submit" 
                      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Start Using Sundial
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            Sundial: Life Time Management. Visualize and optimize your lifetime.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Onboarding;
