import React, { useState, useEffect } from 'react';
import { useUser } from '@/context/user-context';
import { SwipeCard } from '@/components/ui/swipe-card';
import { Activity, ActivityInsert } from '@shared/schema';
import { ShoppingBag, CheckCircle, Calendar, Plus, List, ListChecks, User, Search, Clock, Zap } from 'lucide-react';
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
  const [currentSuggestedActivity, setCurrentSuggestedActivity] = useState<ActivityInsert | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadNextActivity();
    setCartCount(getCartActivities().length);
  }, []);

  const getRandomSuggestedActivity = (): ActivityInsert | null => {
    // Combine sample activities from both sources
    const allSampleActivities = [...SAMPLE_ACTIVITIES, ...MORE_SAMPLE_ACTIVITIES];
    
    // Filter out activities that are already in the user's activities
    const availableActivities = allSampleActivities.filter(
      sample => !activities.some(userActivity => 
        userActivity.name.toLowerCase() === sample.name.toLowerCase()
      )
    );
    
    // No available activities left
    if (availableActivities.length === 0) return null;
    
    // Shuffle and pick one
    const shuffled = [...availableActivities].sort(() => Math.random() - 0.5);
    return shuffled[0];
  };

  const loadNextActivity = async () => {
    setLoading(true);
    try {
      const activity = await getNextActivity();
      setCurrentActivity(activity || null);
      
      // If there's no next activity, load a suggested one
      if (!activity) {
        setCurrentSuggestedActivity(getRandomSuggestedActivity());
      } else {
        // Clear suggested activity if we have a regular one
        setCurrentSuggestedActivity(null);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading next activity:', error);
      setLoading(false);
      // If there's an error, still try to load a suggestion
      setCurrentSuggestedActivity(getRandomSuggestedActivity());
    }
  };

  const handleComplete = (activity: Activity) => {
    // Store activity ID and name before completing
    const completedActivityId = activity.id;
    const completedActivityName = activity.name;
    
    // Complete the activity and show the toast
    completeActivity(activity.id);
    toast({
      title: 'Activity Completed',
      description: `Great job completing "${activity.name}"!`,
      variant: 'default',
    });
    
    // Set temporary loading state
    setLoading(true);
    
    // Add a brief delay before loading the next activity to prevent cycling
    setTimeout(() => {
      // Use an async function to load the next activity
      (async () => {
        try {
          const nextActivity = await getNextActivity();
          
          // If the next activity has the same name as the one we just completed,
          // it's probably a duplicate, so skip it too
          if (nextActivity && 
              nextActivity.name === completedActivityName && 
              nextActivity.id !== completedActivityId) {
            // Skip this duplicate activity
            const skippedActivity = await skipActivity(nextActivity.id);
            
            // Now try to get the next activity again
            const newNextActivity = await getNextActivity();
            setCurrentActivity(newNextActivity || null);
            
            // If there's no next activity after skipping, load a suggested one
            if (!newNextActivity) {
              setCurrentSuggestedActivity(getRandomSuggestedActivity());
            } else {
              setCurrentSuggestedActivity(null);
            }
          } else {
            // No duplicate, just set the next activity normally
            setCurrentActivity(nextActivity || null);
            
            // If there's no next activity, load a suggested one
            if (!nextActivity) {
              setCurrentSuggestedActivity(getRandomSuggestedActivity());
            } else {
              setCurrentSuggestedActivity(null);
            }
          }
          
          setLoading(false);
        } catch (error) {
          console.error('Error loading next activity after completion:', error);
          setLoading(false);
          // If there's an error, try to load a suggestion
          setCurrentSuggestedActivity(getRandomSuggestedActivity());
        }
      })();
    }, 500); // 500ms delay to ensure the backend has time to update
  };

  const handleSkip = (activity: Activity) => {
    // Store activity ID and name before skipping
    const skippedActivityId = activity.id;
    const skippedActivityName = activity.name;
    
    // Skip the current activity and update its nextDue date
    skipActivity(activity.id).then(() => {
      toast({
        title: 'Activity Skipped',
        description: `"${activity.name}" has been rescheduled for later.`,
        variant: 'default',
      });
      
      // Set temporary loading state
      setLoading(true);
      
      // Add a brief delay before loading the next activity to prevent cycling
      setTimeout(() => {
        // Use an async function to load the next activity
        (async () => {
          try {
            const nextActivity = await getNextActivity();
            
            // If the next activity has the same name as the one we just skipped,
            // it's probably a duplicate, so skip it too
            if (nextActivity && 
                nextActivity.name === skippedActivityName && 
                nextActivity.id !== skippedActivityId) {
              // Skip this duplicate activity
              const skippedDuplicate = await skipActivity(nextActivity.id);
              
              // Now try to get the next activity again
              const newNextActivity = await getNextActivity();
              setCurrentActivity(newNextActivity || null);
              
              // If there's no next activity after skipping, load a suggested one
              if (!newNextActivity) {
                setCurrentSuggestedActivity(getRandomSuggestedActivity());
              } else {
                setCurrentSuggestedActivity(null);
              }
            } else {
              // No duplicate, just set the next activity normally
              setCurrentActivity(nextActivity || null);
              
              // If there's no next activity, load a suggested one
              if (!nextActivity) {
                setCurrentSuggestedActivity(getRandomSuggestedActivity());
              } else {
                setCurrentSuggestedActivity(null);
              }
            }
            
            setLoading(false);
          } catch (error) {
            console.error('Error loading next activity after skipping:', error);
            setLoading(false);
            // If there's an error, try to load a suggestion
            setCurrentSuggestedActivity(getRandomSuggestedActivity());
          }
        })();
      }, 500); // 500ms delay to ensure the backend has time to update
    });
  };

  const handleAddToCart = (activity: Activity) => {
    // Store activity ID and name before adding to cart
    const addedActivityId = activity.id;
    const addedActivityName = activity.name;
    
    // Add to cart
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
    
    // Set temporary loading state
    setLoading(true);
    
    // Add a brief delay before loading the next activity to prevent cycling
    setTimeout(() => {
      // Use an async function to load the next activity
      (async () => {
        try {
          const nextActivity = await getNextActivity();
          
          // If the next activity has the same name as the one we just added to cart,
          // it's probably a duplicate, so skip it
          if (nextActivity && 
              nextActivity.name === addedActivityName && 
              nextActivity.id !== addedActivityId) {
            // Skip this duplicate activity
            const skippedDuplicate = await skipActivity(nextActivity.id);
            
            // Now try to get the next activity again
            const newNextActivity = await getNextActivity();
            setCurrentActivity(newNextActivity || null);
            
            // If there's no next activity after skipping, load a suggested one
            if (!newNextActivity) {
              setCurrentSuggestedActivity(getRandomSuggestedActivity());
            } else {
              setCurrentSuggestedActivity(null);
            }
          } else {
            // No duplicate, just set the next activity normally
            setCurrentActivity(nextActivity || null);
            
            // If there's no next activity, load a suggested one
            if (!nextActivity) {
              setCurrentSuggestedActivity(getRandomSuggestedActivity());
            } else {
              setCurrentSuggestedActivity(null);
            }
          }
          
          setLoading(false);
        } catch (error) {
          console.error('Error loading next activity after adding to cart:', error);
          setLoading(false);
          // If there's an error, try to load a suggestion
          setCurrentSuggestedActivity(getRandomSuggestedActivity());
        }
      })();
    }, 500); // 500ms delay to ensure the backend has time to update
  };
  
  const handleAddSuggestedActivity = (activity: ActivityInsert) => {
    addActivity(activity);
    
    toast({
      title: 'Activity Added',
      description: `"${activity.name}" has been added to your activities.`,
      variant: 'default',
    });
    
    // Get the next suggested activity
    setCurrentSuggestedActivity(getRandomSuggestedActivity());
  };
  
  const handleSkipSuggestion = () => {
    // Get a different suggested activity
    setCurrentSuggestedActivity(getRandomSuggestedActivity());
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
          ) : currentSuggestedActivity ? (
            <div className="w-full max-w-md">
              <div className="text-center mb-6">
                <div className="mx-auto h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <Search className="h-8 w-8 text-purple-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Suggested Activities</h3>
                <p className="text-gray-500 mb-4">No planned activities right now. Here are some suggestions you might enjoy:</p>
              </div>
              
              <Card className="overflow-hidden border-purple-200 bg-purple-50 shadow-sm">
                <div className="h-1.5 bg-purple-500" />
                <CardHeader className="pb-2 pt-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base">{currentSuggestedActivity.name}</CardTitle>
                    <Badge className="text-xs bg-blue-500">{currentSuggestedActivity.category}</Badge>
                  </div>
                  <CardDescription className="mt-1 text-xs">
                    {currentSuggestedActivity.frequency} x {currentSuggestedActivity.frequencyUnit}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2 pt-0">
                  <div className="flex justify-between text-xs">
                    <div className="flex items-center">
                      <Clock className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      <span>{currentSuggestedActivity.duration} {currentSuggestedActivity.durationUnit}
                        {currentSuggestedActivity.duration > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Zap className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      <span>Impact: {(currentSuggestedActivity.lifeImpact ?? 0) > 0 ? '+' : ''}
                        {currentSuggestedActivity.lifeImpact ?? 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button 
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white" 
                    onClick={() => handleAddSuggestedActivity(currentSuggestedActivity)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add This Activity
                  </Button>
                </CardFooter>
              </Card>
              
              <div className="flex mt-4 gap-2">
                <Button 
                  className="flex-1" 
                  variant="outline"
                  onClick={handleSkipSuggestion}
                >
                  Show Another
                </Button>
                <Link href="/shop-activities" className="flex-1">
                  <Button className="w-full" variant="outline">
                    Browse More
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