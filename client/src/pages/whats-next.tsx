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
import Header from '@/components/header';

// Add a declaration to extend Window interface for our recently seen activities
declare global {
  interface Window {
    recentlySeenActivities?: string[];
  }
}

export default function WhatsNextPage() {
  const { activities, getNextActivity, completeActivity, skipActivity, addActivitiesToCart, getCartActivities, addActivity, updateActivity, updateActivityById } = useUser();
  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [currentSuggestedActivity, setCurrentSuggestedActivity] = useState<ActivityInsert | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize cart count
    setCartCount(getCartActivities().length);
    
    // Load the next activity with error handling
    loadNextActivity().catch(error => {
      console.error("Error loading initial activity:", error);
      setLoading(false);
      
      // Show a toast notification for the error
      toast({
        title: "Error",
        description: "Failed to load activities. Please try refreshing the page.",
        variant: "destructive"
      });
    });
  }, []);

  const getRandomSuggestedActivity = async (): Promise<ActivityInsert | null> => {
    try {
      // Try to fetch shop activities first (includes both DB activities and sample activities)
      const response = await fetch('/api/activities/shop');
      if (!response.ok) {
        throw new Error('Failed to fetch shop activities');
      }
      
      // Get activities from shop
      const shopActivities = await response.json();
      
      // Combine with sample activities for fallback
      const allPossibleActivities = [
        ...shopActivities,
        ...SAMPLE_ACTIVITIES,
        ...MORE_SAMPLE_ACTIVITIES
      ];
      
      // Filter out activities that are already in the user's activities
      const availableActivities = allPossibleActivities.filter(
        sample => !activities.some(userActivity => 
          userActivity.name.toLowerCase() === sample.name.toLowerCase()
        )
      );
      
      // No available activities left
      if (availableActivities.length === 0) return null;
      
      // Shuffle and pick one
      const shuffled = [...availableActivities].sort(() => Math.random() - 0.5);
      
      // Convert to ActivityInsert if needed
      const selectedActivity = shuffled[0];
      return {
        name: selectedActivity.name,
        category: selectedActivity.category,
        frequency: selectedActivity.frequency,
        frequencyUnit: selectedActivity.frequencyUnit as 'day' | 'week' | 'month' | 'year',
        duration: selectedActivity.duration,
        durationUnit: selectedActivity.durationUnit as 'minute' | 'hour',
        lifeImpact: selectedActivity.lifeImpact ?? 0,
        color: selectedActivity.color ?? '#4f46e5',
        priority: selectedActivity.priority ?? 3,
        exportToCalendar: selectedActivity.exportToCalendar ?? false,
        emoji: selectedActivity.emoji ?? null,
        clusterId: selectedActivity.clusterId ?? null
      };
    } catch (error) {
      console.error('Error fetching suggestions from shop:', error);
      
      // Fallback to sample activities if fetch fails
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
    }
  };

  const loadNextActivity = async (skipNames: string[] = []) => {
    setLoading(true);
    try {
      // Maintain an internal list of activity names we've seen recently
      const recentlySeenActivities = [...(window.recentlySeenActivities || []), ...skipNames];
      
      // Limit the list to the last 10 activities for performance
      if (recentlySeenActivities.length > 10) {
        recentlySeenActivities.splice(0, recentlySeenActivities.length - 10);
      }
      
      // Store this list in window object for persistence between renders
      window.recentlySeenActivities = recentlySeenActivities;
      
      // Add debugging information
      console.debug('Activity data for debugging:', {
        userActivitiesCount: activities.length,
        userActivitiesNames: activities.map(a => a.name),
        databaseActivitiesCount: activities.filter(a => a.id !== undefined).length,
        sampleActivitiesCount: [...SAMPLE_ACTIVITIES, ...MORE_SAMPLE_ACTIVITIES].length
      });
      
      try {
        // Call getNextActivity with our expanded list of activity names to skip
        const activity = await getNextActivity(recentlySeenActivities, true);
        
        // If we found an activity, add it to our recently seen list
        if (activity) {
          window.recentlySeenActivities.push(activity.name);
          setCurrentActivity(activity);
          setCurrentSuggestedActivity(null);
        } else {
          // If there's no next activity, load a suggested one
          setCurrentActivity(null);
          try {
            const suggestedActivity = await getRandomSuggestedActivity();
            setCurrentSuggestedActivity(suggestedActivity);
          } catch (suggestionError) {
            console.error('Error getting suggested activity:', suggestionError);
            setCurrentSuggestedActivity(null);
          }
        }
      } catch (apiError) {
        console.error('API Error loading next activity:', apiError);
        // Show a suggested activity since we couldn't load from API
        setCurrentActivity(null);
        try {
          const suggestedActivity = await getRandomSuggestedActivity();
          setCurrentSuggestedActivity(suggestedActivity);
        } catch (suggestionError) {
          console.error('Error getting suggested activity:', suggestionError);
          setCurrentSuggestedActivity(null);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error in loadNextActivity:', error);
      setLoading(false);
      // If there's an error, fallback to a suggestion
      setCurrentActivity(null);
      try {
        const suggestedActivity = await getRandomSuggestedActivity();
        setCurrentSuggestedActivity(suggestedActivity);
      } catch (fallbackError) {
        console.error('Error getting fallback suggestion:', fallbackError);
        setCurrentSuggestedActivity(null);
      }
    }
  };

  const handleComplete = async (activity: Activity) => {
    try {
      // Store activity name before completing
      const completedActivityName = activity.name;
      
      // Complete the activity and show the toast
      await completeActivity(activity.id);
      
      toast({
        title: 'Activity Completed',
        description: `Great job completing "${completedActivityName}"!`,
        variant: 'default',
      });
      
      // Set temporary loading state
      setLoading(true);
      
      // Add a brief delay before loading the next activity to ensure backend has time to update
      setTimeout(async () => {
        try {
          // Try to get the next due activity or show recommendations if none are due
          await loadNextActivity([]);
        } catch (error) {
          console.error("Error loading next activity after complete:", error);
          setLoading(false);
        }
      }, 1000); // 1 second delay to ensure database updates are processed
    } catch (error) {
      console.error("Error completing activity:", error);
      toast({
        title: "Error",
        description: "Failed to complete activity. Please try again.",
        variant: "destructive"
      });
      
      // Even if we failed, try to load the next activity
      setLoading(true);
      setTimeout(() => {
        loadNextActivity([]);
      }, 1000);
    }
  };

  const handleSkip = async (activity: Activity) => {
    try {
      // Store activity name before skipping
      const skippedActivityName = activity.name;
      
      // Skip the current activity and update its nextDue date
      await skipActivity(activity.id);
      
      toast({
        title: 'Activity Skipped',
        description: `"${skippedActivityName}" has been rescheduled for later.`,
        variant: 'default',
      });
      
      // Set temporary loading state
      setLoading(true);
      
      // Add a brief delay before loading the next activity
      setTimeout(async () => {
        try {
          // Try to get the next due activity or show recommendations if none are due
          await loadNextActivity([]);
        } catch (error) {
          console.error("Error loading next activity after skip:", error);
          setLoading(false);
        }
      }, 1000); // 1 second delay to ensure database updates are processed
    } catch (error) {
      console.error("Error skipping activity:", error);
      toast({
        title: "Error",
        description: "Failed to skip activity. Please try again.",
        variant: "destructive"
      });
      
      // Even if we failed, try to load the next activity
      setLoading(true);
      setTimeout(async () => {
        try {
          await loadNextActivity([]);
        } catch (loadError) {
          console.error("Error loading next activity after skip error:", loadError);
          setLoading(false);
        }
      }, 1000);
    }
  };

  const handleAddToCart = async (activity: Activity) => {
    try {
      // Store activity name before adding to cart
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
        description: `"${addedActivityName}" added to your cart`,
        variant: 'default',
      });
      
      // Set temporary loading state
      setLoading(true);
      
      // Add a brief delay before loading the next activity
      setTimeout(async () => {
        try {
          // Try to get the next due activity or show recommendations if none are due
          await loadNextActivity([]);
        } catch (loadError) {
          console.error("Error loading next activity after add to cart:", loadError);
          setLoading(false);
        }
      }, 1000); // 1 second delay to ensure database updates are processed
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast({
        title: "Error",
        description: "Failed to add activity to cart. Please try again.",
        variant: "destructive"
      });
      
      // Even if we failed, we should try to load the next activity
      setLoading(true);
      setTimeout(async () => {
        try {
          await loadNextActivity([]);
        } catch (loadError) {
          console.error("Error loading next activity after cart error:", loadError);
          setLoading(false);
        }
      }, 1000);
    }
  };
  
  const handleAddSuggestedActivity = async (activity: ActivityInsert) => {
    try {
      // Save the activity name before we potentially lose it
      const activityName = activity.name;
      
      // Wait for the activity to be added
      await addActivity(activity);
      
      toast({
        title: 'Activity Added',
        description: `"${activityName}" has been added to your activities.`,
        variant: 'default',
      });
      
      // Set loading state
      setLoading(true);
      
      // Always try to load planned activities first before showing another suggestion
      setTimeout(async () => {
        try {
          await loadNextActivity([]);
        } catch (loadError) {
          console.error("Error loading next activity after adding suggested activity:", loadError);
          setLoading(false);
        }
      }, 1000); // Short delay to let the database update
    } catch (error) {
      console.error("Error adding suggested activity:", error);
      toast({
        title: "Error",
        description: "Failed to add activity. Please try again.",
        variant: "destructive"
      });
      
      // Even if we failed to add, we should try to load something new
      setLoading(true);
      setTimeout(async () => {
        try {
          await loadNextActivity([]);
        } catch (loadError) {
          console.error("Error loading next activity after suggested activity error:", loadError);
          setLoading(false);
        }
      }, 1000);
    }
  };
  
  const handleToggleCalendarExport = async (activity: Activity) => {
    try {
      // Create a copy of the activity with the toggled exportToCalendar property
      // Use strict equality to handle null/undefined correctly
      const currentExportValue = activity.exportToCalendar === true;
      
      // Prepare minimal update payload with just the necessary fields
      const updatePayload = {
        name: activity.name,
        category: activity.category,
        frequency: activity.frequency,
        frequencyUnit: activity.frequencyUnit as 'day' | 'week' | 'month' | 'year',
        duration: activity.duration,
        durationUnit: activity.durationUnit as 'minute' | 'hour',
        lifeImpact: activity.lifeImpact,
        color: activity.color,
        priority: activity.priority,
        emoji: activity.emoji,
        clusterId: activity.clusterId,
        exportToCalendar: !currentExportValue // Toggle the value
      };
      
      // Update the activity using direct ID-based update
      const updatedActivity = await updateActivityById(activity.id, updatePayload);
      
      if (updatedActivity) {
        // Update the current activity in the state to reflect changes immediately
        setCurrentActivity(updatedActivity);
        
        // Show a toast notification
        toast({
          title: !currentExportValue ? 'Added to Calendar' : 'Removed from Calendar',
          description: `"${activity.name}" will ${!currentExportValue ? 'now' : 'no longer'} be exported to your calendar.`,
          variant: 'default',
        });
      } else {
        // If update returned undefined, there was an issue
        throw new Error('Failed to update activity - server returned undefined');
      }
    } catch (error) {
      console.error('Error updating calendar export setting:', error);
      toast({
        title: 'Error',
        description: 'Failed to update calendar export setting.',
        variant: 'destructive',
      });
    }
  };

  const handleSkipSuggestion = async () => {
    // Set loading state
    setLoading(true);
    
    try {
      // Check for actual planned activities first before showing another suggestion
      // But also keep track of the previously seen suggestion to avoid repeats
      if (currentSuggestedActivity) {
        const skipNames = [...(window.recentlySeenActivities || []), currentSuggestedActivity.name];
        window.recentlySeenActivities = skipNames;
        
        // Try to load a new suggestion directly to avoid loading planned activities again
        // since we already know there are none from the previous check
        const suggestedActivity = await getRandomSuggestedActivity();
        setCurrentSuggestedActivity(suggestedActivity);
        setLoading(false);
      } else {
        // Fallback to standard loading if there's no current suggestion
        await loadNextActivity([]);
      }
    } catch (error) {
      console.error('Error getting next suggestion:', error);
      setCurrentSuggestedActivity(null);
      setLoading(false);
      
      toast({
        title: "Error",
        description: "Failed to find another activity suggestion. Please try again.",
        variant: "destructive"
      });
    }
  };

  const { userData } = useUser();
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      {/* Use the consistent Header component with userData */}
      <Header userData={userData} />

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
              onToggleCalendarExport={handleToggleCalendarExport}
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