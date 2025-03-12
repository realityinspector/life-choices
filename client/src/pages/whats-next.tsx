import React, { useState, useEffect } from 'react';
import { useUser } from '@/context/user-context';
import { SwipeCard } from '@/components/ui/swipe-card';
import { Activity, ActivityInsert } from '@shared/schema';
import { ShoppingBag, CheckCircle, Calendar, Plus, List, ListChecks, User, Search } from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SAMPLE_ACTIVITIES, MORE_SAMPLE_ACTIVITIES } from '@shared/sample-activities';

export default function WhatsNextPage() {
  const { activities, getNextActivity, completeActivity, skipActivity, addActivitiesToCart, getCartActivities, addActivity } = useUser();
  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [suggestedActivities, setSuggestedActivities] = useState<ActivityInsert[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadNextActivity();
    setCartCount(getCartActivities().length);
    // Get suggested activities
    if (!currentActivity) {
      setSuggestedActivities(getRandomSuggestedActivities(3));
    }
  }, []);

  const getRandomSuggestedActivities = (count: number): ActivityInsert[] => {
    // Combine sample activities from both sources
    const allSampleActivities = [...SAMPLE_ACTIVITIES, ...MORE_SAMPLE_ACTIVITIES];
    
    // Filter out activities that are already in the user's activities
    const availableActivities = allSampleActivities.filter(
      sample => !activities.some(userActivity => 
        userActivity.name.toLowerCase() === sample.name.toLowerCase()
      )
    );
    
    // Shuffle the available activities
    const shuffled = [...availableActivities].sort(() => Math.random() - 0.5);
    
    // Take the requested number of activities
    return shuffled.slice(0, count);
  };

  const loadNextActivity = async () => {
    setLoading(true);
    try {
      const activity = await getNextActivity();
      setCurrentActivity(activity || null);
      
      // If there's no next activity, load some suggested activities
      if (!activity) {
        setSuggestedActivities(getRandomSuggestedActivities(3));
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading next activity:', error);
      setLoading(false);
      // If there's an error, still try to load suggestions
      setSuggestedActivities(getRandomSuggestedActivities(3));
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
    // Skip the current activity and update its nextDue date
    skipActivity(activity.id).then(() => {
      toast({
        title: 'Activity Skipped',
        description: `"${activity.name}" has been rescheduled for later.`,
        variant: 'default',
      });
      loadNextActivity();
    });
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
  
  const handleAddSuggestedActivity = (activity: ActivityInsert) => {
    addActivity(activity);
    
    toast({
      title: 'Activity Added',
      description: `"${activity.name}" has been added to your activities.`,
      variant: 'default',
    });
    
    // Refresh the suggestions to show different ones
    setSuggestedActivities(getRandomSuggestedActivities(3));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Simple header */}
      <div className="bg-white p-4 flex items-center justify-between border-b">
        <h1 className="text-xl font-bold text-teal-600">Life Choices</h1>
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
          ) : suggestedActivities.length > 0 ? (
            <div className="w-full max-w-md">
              <div className="text-center mb-6">
                <div className="mx-auto h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-purple-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Suggested Activities</h3>
                <p className="text-gray-500 mb-4">No planned activities right now. Here are some suggestions you might enjoy:</p>
              </div>
              
              <div className="grid gap-4">
                {suggestedActivities.map((activity, index) => (
                  <Card key={index} className="overflow-hidden border-2 border-purple-200 bg-purple-50 shadow-sm">
                    <div className={`h-1.5 bg-purple-500`} />
                    <CardHeader className="pb-2 pt-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base">{activity.name}</CardTitle>
                        <Badge className="text-xs">{activity.category}</Badge>
                      </div>
                      <CardDescription className="mt-1 text-xs">
                        {activity.frequency} x {activity.frequencyUnit}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2 pt-0">
                      <div className="flex justify-between text-xs">
                        <div className="flex items-center">
                          <Clock className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                          <span>{activity.duration} {activity.durationUnit}{activity.duration > 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center">
                          <Zap className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                          <span>Impact: {activity.lifeImpact > 0 ? '+' : ''}{activity.lifeImpact}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-2">
                      <Button 
                        className="w-full text-xs h-8" 
                        size="sm"
                        onClick={() => handleAddSuggestedActivity(activity)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Add This Activity
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
                
                <Link href="/shop-activities" className="block mt-2">
                  <Button className="w-full" variant="outline">
                    Browse More Activities
                  </Button>
                </Link>
              </div>
            </div>
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

      {/* Bottom navigation removed as we use centralized bottom navigation in App.tsx */}
    </div>
  );
}