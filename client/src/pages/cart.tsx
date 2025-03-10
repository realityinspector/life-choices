import { useEffect, useState } from "react";
import { useUser } from "@/context/user-context";
import { ActivityInsert } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2, CheckCircle2, Info, ArrowRight } from "lucide-react";
import Header from "@/components/header";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

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
      setLocation("/");
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
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <ShoppingCart className="h-6 w-6 mr-2 text-teal-600" />
            Activity Cart
          </h1>
          <Button 
            variant="outline" 
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" 
            onClick={clearCart}
            disabled={cartActivities.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>

        {cartActivities.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <ShoppingCart className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-6">
              Browse our activity suggestions and add them to your cart
            </p>
            <Button onClick={() => setLocation('/shop-activities')}>
              Browse Activities
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200 flex items-start">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-blue-800">Activity Cart</h3>
                <p className="text-blue-700 text-sm">
                  These activities will be added to your schedule when you click "Add to My Tasks". 
                  You'll commit to an estimated {calculateTotalTime()}.
                </p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
              <ul className="divide-y divide-gray-200">
                {cartActivities.map((activity, index) => (
                  <li key={index} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full flex items-center justify-center mr-4" 
                           style={{ backgroundColor: `${activity.color}20`, color: activity.color }}>
                        {activity.emoji || '✓'}
                      </div>
                      <div>
                        <h3 className="text-base font-medium text-gray-900">{activity.name}</h3>
                        <p className="text-sm text-gray-500">
                          {activity.duration} {activity.durationUnit === 'minute' ? 'mins' : 'hours'} • 
                          Every {activity.frequency} {activity.frequencyUnit}
                          {activity.frequency > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-500 hover:text-red-600"
                      onClick={() => handleRemoveActivity(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setLocation('/shop-activities')}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Continue Shopping
              </Button>
              <Button 
                className="flex-1 bg-teal-600 hover:bg-teal-700"
                onClick={handleSaveActivities}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Add to My Tasks
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}