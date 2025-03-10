import { useEffect, useState } from "react";
import { useUser } from "@/context/user-context";
import { ActivityInsert } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2, CheckCircle2, Info, Plus, Calendar, Home, ArrowLeft } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function CartPage() {
  const { getCartActivities, clearCart, saveCartActivities } = useUser();
  const [cartActivities, setCartActivities] = useState<ActivityInsert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    setCartActivities(getCartActivities());
  }, [getCartActivities]);

  const handleRemoveActivity = (index: number) => {
    const newCartActivities = [...cartActivities];
    newCartActivities.splice(index, 1);
    setCartActivities(newCartActivities);
    localStorage.setItem('lifechoicesCart', JSON.stringify(newCartActivities));
  };

  const handleSaveActivities = async () => {
    if (cartActivities.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Add some activities before saving",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await saveCartActivities();
      toast({
        title: "Success!",
        description: `${cartActivities.length} activities added to your schedule`,
        variant: "default",
      });
      setLocation("/whats-next");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save activities. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotalTime = (): string => {
    const totalMinutes = cartActivities.reduce((total, activity) => {
      const durationInMinutes = activity.durationUnit === 'hour' 
        ? activity.duration * 60 
        : activity.duration;
      
      // Calculate sessions per week
      let sessionsPerWeek = 0;
      if (activity.frequencyUnit === 'day') {
        sessionsPerWeek = 7 / activity.frequency;
      } else if (activity.frequencyUnit === 'week') {
        sessionsPerWeek = 1 / activity.frequency;
      } else if (activity.frequencyUnit === 'month') {
        sessionsPerWeek = 0.25 / activity.frequency;
      } else if (activity.frequencyUnit === 'year') {
        sessionsPerWeek = 0.02 / activity.frequency;
      }
      
      return total + (durationInMinutes * sessionsPerWeek);
    }, 0);

    // Convert to hours and minutes
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    
    if (hours === 0) {
      return `${minutes} mins per week`;
    } else if (minutes === 0) {
      return `${hours} hours per week`;
    } else {
      return `${hours} hours, ${minutes} mins per week`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Nav Bar */}
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <div className="flex items-center">
          <button 
            onClick={() => setLocation('/whats-next')}
            className="mr-3 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-teal-600">Life Choices</h1>
        </div>
        <div className="flex items-center space-x-3">
          {cartActivities.length > 0 && (
            <button 
              onClick={clearCart}
              className="text-red-500 hover:text-red-700 flex items-center text-sm"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </button>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 flex items-center text-gray-800">
          <ShoppingCart className="h-6 w-6 mr-2 text-teal-600" />
          Your Cart
          <span className="ml-2 text-sm bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
            {cartActivities.length} {cartActivities.length === 1 ? 'item' : 'items'}
          </span>
        </h2>

        {cartActivities.length > 0 && (
          <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-200 flex items-start">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <p className="text-blue-700 text-sm">
                Add these activities to your schedule (est. {calculateTotalTime()})
              </p>
            </div>
          </div>
        )}

        {cartActivities.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
            <ShoppingCart className="h-16 w-16 text-gray-300 mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-6 max-w-xs mx-auto">
              Add activities from the shop to start building your routine
            </p>
            <Link href="/shop-activities">
              <button className="bg-teal-600 text-white px-5 py-2 rounded-lg flex items-center justify-center">
                <Plus className="mr-2 h-5 w-5" />
                Browse Activities
              </button>
            </Link>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            <ul className="space-y-3 mb-6">
              {cartActivities.map((activity, index) => (
                <motion.li 
                  key={`${activity.name}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-lg shadow-sm overflow-hidden"
                >
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center overflow-hidden">
                      <div 
                        className="h-12 w-12 rounded-md flex items-center justify-center mr-3 flex-shrink-0" 
                        style={{ backgroundColor: `${activity.color}20`, color: activity.color }}
                      >
                        {activity.emoji || '✓'}
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="text-base font-medium text-gray-900 truncate">{activity.name}</h3>
                        <p className="text-sm text-gray-500">
                          {activity.duration} {activity.durationUnit}
                          {activity.duration > 1 ? 's' : ''} • 
                          Every {activity.frequency} {activity.frequencyUnit}
                          {activity.frequency > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      className="p-2 text-gray-400 hover:text-red-500 focus:outline-none"
                      onClick={() => handleRemoveActivity(index)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </motion.li>
              ))}
            </ul>
          </AnimatePresence>
        )}

        {cartActivities.length > 0 && (
          <div className="sticky bottom-20 left-0 right-0 p-4 bg-white border-t border-gray-200 rounded-t-xl shadow-lg">
            <button 
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 px-4 rounded-lg flex items-center justify-center font-medium"
              onClick={handleSaveActivities}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                  Processing...
                </div>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Add to My Tasks
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="bg-white border-t py-2 px-4 grid grid-cols-5 gap-1 text-center">
        <Link href="/home" className="flex flex-col items-center py-1 text-gray-500">
          <Home className="h-6 w-6" />
          <span className="text-xs mt-1">Home</span>
        </Link>
        
        <Link href="/whats-next" className="flex flex-col items-center py-1 text-gray-500">
          <CheckCircle2 className="h-6 w-6" />
          <span className="text-xs mt-1">Next</span>
        </Link>
        
        <Link href="/shop-activities" className="flex flex-col items-center py-1 text-gray-500">
          <Plus className="h-6 w-6" />
          <span className="text-xs mt-1">Add</span>
        </Link>
        
        <Link href="/calendar" className="flex flex-col items-center py-1 text-gray-500">
          <Calendar className="h-6 w-6" />
          <span className="text-xs mt-1">Calendar</span>
        </Link>
        
        <Link href="/cart" className="flex flex-col items-center py-1 text-teal-600">
          <ShoppingCart className="h-6 w-6" />
          <span className="text-xs mt-1">Cart</span>
        </Link>
      </div>
    </div>
  );
}