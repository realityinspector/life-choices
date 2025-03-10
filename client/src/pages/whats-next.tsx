import React, { useState, useEffect } from 'react';
import { useUser } from '@/context/user-context';
import { SwipeCard } from '@/components/ui/swipe-card';
import { Activity } from '@shared/schema';
import { ShoppingBag, CheckCircle, Calendar, Plus, List, ListChecks } from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';

export default function WhatsNextPage() {
  const { activities, getNextActivity, completeActivity, addActivitiesToCart, getCartActivities } = useUser();
  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    loadNextActivity();
    setCartCount(getCartActivities().length);
  }, []);

  const loadNextActivity = async () => {
    setLoading(true);
    try {
      const activity = await getNextActivity();
      setCurrentActivity(activity || null);
      setLoading(false);
    } catch (error) {
      console.error('Error loading next activity:', error);
      setLoading(false);
    }
  };

  const handleComplete = (activity: Activity) => {
    completeActivity(activity.id);
    toast({
      title: 'Activity Completed',
      description: `Great job completing "${activity.name}"!`,
      variant: 'default',
    });
    loadNextActivity();
  };

  const handleSkip = (activity: Activity) => {
    // Just load the next activity without completing
    loadNextActivity();
  };

  const handleAddToCart = (activity: Activity) => {
    addActivitiesToCart([{
      name: activity.name,
      category: activity.category,
      frequency: activity.frequency,
      frequencyUnit: activity.frequencyUnit as 'day' | 'week' | 'month' | 'year',
      duration: activity.duration,
      durationUnit: activity.durationUnit as 'minute' | 'hour',
      lifeImpact: activity.lifeImpact || 0,
      color: activity.color,
      priority: activity.priority,
      exportToCalendar: activity.exportToCalendar,
      emoji: activity.emoji,
      clusterId: activity.clusterId
    }]);
    
    setCartCount(getCartActivities().length);
    
    toast({
      title: 'Added to Cart',
      description: `"${activity.name}" added to your cart`,
      variant: 'default',
    });
    
    loadNextActivity();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Nav Bar */}
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-teal-600">Life Choices</h1>
        <div className="flex items-center space-x-3">
          <Link href="/cart" className="relative">
            <ShoppingBag className="h-6 w-6 text-gray-700" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center pt-6 px-4 relative">
        <h2 className="text-2xl font-bold mb-6 text-center">What's Next?</h2>
        
        <div className="w-full max-w-md h-[500px] relative flex items-center justify-center">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading your next activity...</p>
            </div>
          ) : currentActivity ? (
            <SwipeCard
              key={currentActivity.id}
              activity={currentActivity}
              onComplete={handleComplete}
              onSkip={handleSkip}
              onAddToCart={handleAddToCart}
              userActivities={activities}
              onInfo={(activity) => {
                // Show detailed info about the activity
                toast({
                  title: activity.name,
                  description: `${activity.duration} ${activity.durationUnit}${activity.duration > 1 ? 's' : ''} • ${activity.frequency} ${activity.frequencyUnit}${activity.frequency > 1 ? 's' : ''}`,
                  variant: 'default',
                });
              }}
            />
          ) : (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm p-8 w-full max-w-md">
              <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <List className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No Activities Yet</h3>
              <p className="text-gray-500 mb-6">You don't have any activities scheduled. Add some to get started!</p>
              <Link href="/shop-activities">
                <button className="bg-teal-600 text-white px-4 py-2 rounded-lg flex items-center justify-center w-full">
                  <Plus className="mr-2 h-5 w-5" />
                  Browse Activities
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="bg-white border-t py-2 px-4 grid grid-cols-5 gap-1 text-center">
        <Link href="/" className="flex flex-col items-center py-1 text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-xs mt-1">Next</span>
        </Link>
        
        <Link href="/activities" className="flex flex-col items-center py-1 text-gray-500">
          <ListChecks className="h-6 w-6" />
          <span className="text-xs mt-1">Tasks</span>
        </Link>
        
        <Link href="/shop-activities" className="flex flex-col items-center py-1 text-gray-500">
          <Plus className="h-6 w-6" />
          <span className="text-xs mt-1">Add</span>
        </Link>
        
        <Link href="/calendar" className="flex flex-col items-center py-1 text-gray-500">
          <Calendar className="h-6 w-6" />
          <span className="text-xs mt-1">Calendar</span>
        </Link>
        
        <Link href="/cart" className="flex flex-col items-center py-1 text-gray-500 relative">
          <ShoppingBag className="h-6 w-6" />
          {cartCount > 0 && (
            <span className="absolute top-0 right-1/4 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {cartCount}
            </span>
          )}
          <span className="text-xs mt-1">Cart</span>
        </Link>
      </div>
    </div>
  );
}