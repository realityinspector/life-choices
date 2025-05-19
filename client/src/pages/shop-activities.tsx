import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/user-context";
import { Activity, ActivityInsert, UserData, ActivityImage } from "@shared/schema";
import { Store, Filter, Clock, Zap, Plus, Heart, Search, ShoppingCart, Check, Share2, Link as LinkIcon, Lock, Globe, Calendar, ArrowRight, User, ListChecks, Image, Triangle } from "lucide-react";
import Header from "@/components/header";
import { Link, useLocation } from "wouter";
// import Navigation from "@/components/navigation"; // Removed as we use central bottom navigation
import { SAMPLE_ACTIVITIES, MORE_SAMPLE_ACTIVITIES } from "@shared/sample-activities";
import { apiRequest } from "@/lib/queryClient";

// Debug flag to help troubleshoot issues
const DEBUG_MODE = true;

// Add global error handler to catch any unhandled errors
if (typeof window !== 'undefined') {
  console.log("ALL ONE THING: Setting up global error handler");
  window.addEventListener('error', (event) => {
    console.error("ALL ONE THING: GLOBAL ERROR", event.error);
    console.error("ALL ONE THING: Error message:", event.message);
    console.error("ALL ONE THING: Error at:", event.filename, "line:", event.lineno, "col:", event.colno);
  });

  // Also catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error("ALL ONE THING: UNHANDLED PROMISE REJECTION", event.reason);
    if (event.reason instanceof Error) {
      console.error("ALL ONE THING: Stack trace:", event.reason.stack);
    }
  });
}

// Activity Card component for consistency across tabs
interface ActivityCardProps {
  activity: Required<ActivityInsert> | (Activity & { description?: string; completed?: boolean });
  onAddToCart: (activity: ActivityInsert) => void;
  onAddNow: (activity: ActivityInsert) => void;
  onComplete?: (activity: Activity) => void;
  onSkip?: (activity: Activity) => void;
  isRecommended?: boolean;
  recommendationReason?: string;
  userActivities: Activity[];
  activityImages?: ActivityImage[];
}

const ActivityCard = ({ 
  activity, 
  onAddToCart, 
  onAddNow, 
  onComplete,
  onSkip,
  isRecommended = false,
  recommendationReason,
  userActivities,
  activityImages = []
}: ActivityCardProps) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharePrivacy, setSharePrivacy] = useState<"private" | "link" | "public">("private");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Find images for this activity
  const activityImagesForActivity = activityImages.filter(img => 
    img.activityId === (activity as Activity).id
  );

  const getImpactColor = (impact: number | undefined) => {
    if (!impact) return "bg-gray-500";
    if (impact >= 8) return "bg-green-500";
    if (impact >= 5) return "bg-blue-500";
    if (impact >= 3) return "bg-yellow-500";
    return "bg-gray-500";
  };

  const handleShare = () => {
    // In a real app, this would call an API to generate a shareable link
    // For now, we'll just simulate it
    if (sharePrivacy === "private") {
      toast({
        title: "Cannot share private activity",
        description: "Please change the privacy setting to generate a shareable link.",
        variant: "destructive"
      });
      return;
    }

    const shareableUrl = `https://lifechoices.app/share/${activity.name.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).substring(2, 8)}`;
    setShareUrl(shareableUrl);

    toast({
      title: sharePrivacy === "public" ? "Activity shared publicly" : "Share link generated",
      description: "You can now share this activity with others",
    });
  };

  const copyToClipboard = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Copied to clipboard",
        description: "Share link has been copied to your clipboard",
      });
    }
  };

  // Important: In the shop interface, we want to identify which activities the user has personally
  // added to their tasks vs. which activities are system-provided and available for selection.

  // Most direct fix possible: Override the activityExists flag for now
  const { userData: currentUser } = useUser();

  // EMERGENCY FIX: The shop view should always allow adding activities
  // This is the simplest, most direct approach to ensure the shop works

  // For shop view, always show "Add" buttons, never "Already in Tasks"
  const activityExists = false;

  // Keep a placeholder for the existing activity lookup in case we need it in other parts of the code
  const existingActivity = userActivities.find(a => {
    if ('id' in activity && 'id' in a && activity.id !== undefined && a.id !== undefined) {
      return activity.id === a.id;
    }
    return activity.name.toLowerCase() === a.name.toLowerCase();
  });

  // Helper function to convert Activity to ActivityInsert safely
  const toActivityInsert = (act: any): ActivityInsert => {
    return {
      name: act.name,
      category: act.category,
      frequency: act.frequency,
      frequencyUnit: act.frequencyUnit as "day" | "week" | "month" | "year",
      duration: act.duration,
      durationUnit: act.durationUnit as "minute" | "hour",
      lifeImpact: act.lifeImpact,
      color: act.color,
      priority: act.priority,
      exportToCalendar: act.exportToCalendar,
      emoji: act.emoji
    };
  };

  const handleExportToCalendar = () => {
    if (!existingActivity) return;

    // Create a calendar event URL
    const eventTitle = encodeURIComponent(existingActivity.name);
    const eventDescription = encodeURIComponent(`${existingActivity.category} activity - Life Impact: ${existingActivity.lifeImpact}`);
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (existingActivity.duration * (existingActivity.durationUnit === 'hour' ? 60 : 1) * 60 * 1000));

    // Format dates for calendar URLs
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, "");
    };

    // Google Calendar URL
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&details=${eventDescription}&dates=${formatDate(startDate)}/${formatDate(endDate)}`;

    // Open in a new tab
    window.open(googleCalendarUrl, '_blank');

    toast({
      title: "Calendar Link Generated",
      description: "Event has been created and can be added to your calendar",
    });
  };

  return (
    <>
      <Card className={`overflow-hidden h-full flex flex-col ${isRecommended ? "border-primary border-2" : ""} ${activityExists ? "border-green-400" : ""}`}>
        <div className={`h-1.5 ${getImpactColor(activity.lifeImpact)}`} />

        {/* Show image if available */}
        {activityImagesForActivity.length > 0 && (
          <div className="relative aspect-video overflow-hidden">
            <img 
              src={activityImagesForActivity[0].path}
              alt={activity.name}
              className="object-cover w-full h-full"
              onError={(e) => {
                // Hide the image container if load fails
                const target = e.target as HTMLImageElement;
                target.parentElement?.style.setProperty('display', 'none');
                console.debug(`Image failed to load for activity ${activity.name}:`, activityImagesForActivity[0].path);
              }}
            />
            {isAdmin && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 break-all">
                {activityImagesForActivity[0].path}
              </div>
            )}
          </div>
        )}

        <CardHeader className="pb-2 pt-3">
          <div className="flex justify-between items-start">
            <CardTitle className="text-base flex items-center">
              {activity.name}
              {activityExists && <Check className="h-3.5 w-3.5 ml-1.5 text-green-500" />}
              {isRecommended && <Heart className="h-3.5 w-3.5 ml-1.5 text-red-500 fill-red-500" />}
            </CardTitle>
            <Badge className="text-xs">{activity.category}</Badge>
          </div>
          <CardDescription className="mt-1 text-xs">
            {activityExists ? (
              <span className="text-green-600 font-medium">Already in your activities</span>
            ) : !isRecommended ? (
              `${activity.frequency} x ${activity.frequencyUnit}`
            ) : isRecommended && recommendationReason ? (
              <span className="text-primary font-medium">{recommendationReason}</span>
            ) : isRecommended ? (
              <span className="text-primary font-medium">Recommended for your profile</span>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2 pt-0 flex-grow">
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
          {isRecommended && !recommendationReason && !activityExists && (
            <div className="mt-2 text-xs text-primary-foreground/70">
              <span className="flex items-center">
                <span className="mr-1">•</span> {activity.frequency} x {activity.frequencyUnit}
              </span>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-1.5 pt-2">
          {/* SHOP-ACTIVITIES VIEW: Show Add to Cart and Add Now buttons only for non-existing activities */}
          {window.location.pathname === '/shop-activities' && (
            <>
              {/* Show the action buttons only if the activity doesn't exist yet */}
              {activityExists ? (
                <div className="flex w-full space-x-2">
                  <Button 
                    className="flex-1 text-xs h-8" 
                    size="sm"
                    disabled={true}
                  >
                    <Check className="h-3.5 w-3.5 mr-1.5" />
                    Already in Tasks
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex w-full space-x-2">
                    <Button 
                      className="flex-1 text-xs h-8" 
                      size="sm"
                      onClick={() => onAddToCart(toActivityInsert(activity))}
                    >
                      <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                      Add to Cart
                    </Button>
                    <Button 
                      className="flex-1 text-xs h-8" 
                      size="sm"
                      variant="outline"
                      onClick={() => onAddNow(toActivityInsert(activity))}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Add to Tasks
                    </Button>
                  </div>
                  <Button 
                    className="w-full text-xs h-8 text-black" 
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowShareModal(true)}
                  >
                    <Share2 className="h-3.5 w-3.5 mr-1.5" />
                    Share Activity
                  </Button>
                </>
              )}
            </>
          )}

          {/* WHATS-NEXT VIEW: Show Complete/Skip buttons for existing activities */}
          {window.location.pathname === '/whats-next' && activityExists && (
            <>
              <div className="flex w-full space-x-2">
                <Button 
                  className="flex-1 text-xs h-8" 
                  size="sm"
                  variant="default"
                  onClick={() => existingActivity && onComplete && onComplete(existingActivity)}
                >
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Complete
                </Button>
                <Button 
                  className="flex-1 text-xs h-8" 
                  size="sm"
                  variant="outline"
                  onClick={() => existingActivity && onSkip && onSkip(existingActivity)}
                >
                  <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                  Skip
                </Button>
              </div>
              <Button 
                className="w-full text-xs h-8 text-black" 
                size="sm"
                variant="ghost"
                onClick={handleExportToCalendar}
              >
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                Add to Calendar
              </Button>
            </>
          )}
        </CardFooter>
      </Card>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Share "{activity.name}"</h3>
              <Button size="sm" variant="ghost" onClick={() => setShowShareModal(false)}>
                &times;
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Privacy Settings</h4>
                <div className="flex flex-col space-y-2">
                  <div 
                    className={`p-3 border rounded-md cursor-pointer flex justify-between items-center ${sharePrivacy === 'private' ? 'border-primary bg-primary/5' : ''}`}
                    onClick={() => setSharePrivacy('private')}
                  >
                    <div className="flex items-center">
                      <div className="h-6 w-6 mr-2 flex items-center justify-center bg-gray-100 rounded-full">
                        <Lock className="h-4 w-4 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium">Private</div>
                        <div className="text-xs text-gray-500">Only you can see this activity</div>
                      </div>
                    </div>
                    {sharePrivacy === 'private' && <Check className="h-5 w-5 text-primary" />}
                  </div>

                  <div 
                    className={`p-3 border rounded-md cursor-pointer flex justify-between items-center ${sharePrivacy === 'link' ? 'border-primary bg-primary/5' : ''}`}
                    onClick={() => setSharePrivacy('link')}
                  >
                    <div className="flex items-center">
                      <div className="h-6 w-6 mr-2 flex items-center justify-center bg-blue-100 rounded-full">
                        <LinkIcon className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">Anyone with the link</div>
                        <div className="text-xs text-gray-500">Anyone with the link can view</div>
                      </div>
                    </div>
                    {sharePrivacy === 'link' && <Check className="h-5 w-5 text-primary" />}
                  </div>

                  <div 
                    className={`p-3 border rounded-md cursor-pointer flex justify-between items-center ${sharePrivacy === 'public' ? 'border-primary bg-primary/5' : ''}`}
                    onClick={() => setSharePrivacy('public')}
                  >
                    <div className="flex items-center">
                      <div className="h-6 w-6 mr-2 flex items-center justify-center bg-green-100 rounded-full">
                        <Globe className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium">Public</div>
                        <div className="text-xs text-gray-500">Anyone can find this activity</div>
                      </div>
                    </div>
                    {sharePrivacy === 'public' && <Check className="h-5 w-5 text-primary" />}
                  </div>
                </div>
              </div>

              {shareUrl && (
                <div>
                  <h4 className="font-medium mb-2">Share Link</h4>
                  <div className="flex">
                    <input 
                      type="text" 
                      value={shareUrl}
                      readOnly
                      className="flex-1 p-2 text-sm border rounded-l-md focus:outline-none"
                    />
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="rounded-l-none" 
                      onClick={copyToClipboard}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end space-x-2">
                <Button variant="outline" size="sm" onClick={() => setShowShareModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleShare} disabled={sharePrivacy === 'private' && shareUrl === null}>
                  {shareUrl ? 'Generate New Link' : 'Generate Share Link'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Sample categories for activities
const ACTIVITY_CATEGORIES = [
  "Health & Fitness",
  "Learning & Growth",
  "Work & Career",
  "Relationships",
  "Leisure & Recreation",
  "Spirituality & Mindfulness",
  "Creativity",
  "Service & Community",
  "Travel & Adventure",
  "Home & Life Management"
];

// Function to generate personalized recommendations based on user profile and current activities
// Function to generate reasons for recommendations
const getRecommendationReason = (
  activity: Required<ActivityInsert> | (Activity & { description?: string; completed?: boolean }),
  userData: UserData,
  currentActivities: Activity[]
): string => {
  // Check if the user already has activities in this category
  const userCategories = new Set(currentActivities.map(a => a.category));

  // Get current categories and activity names
  const averageImpact = currentActivities.length > 0 
    ? currentActivities.reduce((sum, a) => sum + (a.lifeImpact || 0), 0) / currentActivities.length
    : 0;

  // Calculate total time allocated per week
  const weeklyTimeAllocation = currentActivities.reduce((total, activity) => {
    let weeklyTime = activity.duration;
    if (activity.durationUnit === "hour") {
      weeklyTime *= 60; // Convert to minutes
    }

    // Convert to weekly frequency
    if (activity.frequencyUnit === "day") {
      weeklyTime *= (activity.frequency * 7);
    } else if (activity.frequencyUnit === "week") {
      weeklyTime *= activity.frequency;
    } else if (activity.frequencyUnit === "month") {
      weeklyTime *= (activity.frequency / 4);
    } else if (activity.frequencyUnit === "year") {
      weeklyTime *= (activity.frequency / 52);
    }

    return total + weeklyTime;
  }, 0);

  // Calculate available weekly time (excluding sleep) in minutes
  const availableWeeklyTime = (24 * 7 - (userData.sleepHours || 8) * 7) * 60;
  const timePercentage = (weeklyTimeAllocation / availableWeeklyTime) * 100;

  // New category
  if (!userCategories.has(activity.category)) {
    return `Adds a new ${activity.category} category to your routine`;
  }

  // High impact activity
  if (activity.lifeImpact > averageImpact + 2) {
    return `Higher impact than your average activities`;
  }

  // Balance time commitments
  if (timePercentage < 30 && (activity.duration <= 30 && activity.durationUnit === "minute")) {
    return `Quick activity that fits your schedule`;
  } else if (timePercentage > 70 && (activity.frequency <= 2 && activity.frequencyUnit === "week")) {
    return `Low-frequency activity for your busy schedule`;
  }

  // Based on user's age - handle potential null values
  if (userData.age !== null && userData.age !== undefined) {
    const age = userData.age;
    if (age < 30 && activity.category === "Learning & Growth") {
      return `Great for skill development in your ${age}s`;
    } else if (age >= 30 && age < 50 && activity.category === "Career & Finance") {
      return `Important for career advancement at your age`;
    } else if (age >= 50 && (activity.category === "Health & Fitness" || activity.category === "Spirituality & Mindfulness")) {
      return `Beneficial for wellbeing at your life stage`;
    }
  }

  // Fallback
  return "Complements your current lifestyle";
};

// TypeScript helper to make sure we can add required fields to ActivityInsert
interface EnhancedActivityInsert extends ActivityInsert {
  description?: string;
  completed?: boolean;
}

function completeActivityData(activities: EnhancedActivityInsert[]): Required<EnhancedActivityInsert>[] {
  return activities.map(a => ({
    ...a,
    description: a.description || "",
    completed: a.completed ?? false
  })) as Required<EnhancedActivityInsert>[];
}

export default function ShopActivitiesPage() {
  const { userData, activities, addActivity, completeActivity: completeUserActivity, addActivitiesToCart, getCartActivities } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [cartItems, setCartItems] = useState<ActivityInsert[]>([]);
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  // Fetch all activities with images for the shop (no user filtering)
  const { data: activitiesWithImages = [] } = useQuery<(Activity & { images: ActivityImage[] })[]>({
    queryKey: ['/api/activities/shop/with-images'],
    queryFn: async ({ signal }) => {
      try {
        const res = await apiRequest('/api/activities/shop/with-images', { signal });
        return res.json();
      } catch (error) {
        // Only log non-abort errors (abort errors are expected during unmounting)
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Error fetching shop activities with images:', error);
        }
        return [];
      }
    },
    // Add retry: false to prevent retries when component unmounts
    retry: false,
    // Add staleTime to reduce duplicate requests
    staleTime: 30000 // 30 seconds
  });

  // Extract all images for easier reference
  const allActivityImages = activitiesWithImages.flatMap(a => a.images);

  useEffect(() => {
    // Load cart items when the component mounts
    setCartItems(getCartActivities());
  }, [getCartActivities]);

  // Process sample activities to ensure they have description and completed fields
  const enhancedSampleActivities = completeActivityData(
    SAMPLE_ACTIVITIES.map(a => ({ ...a, description: "", completed: false }))
  );

  const enhancedMoreSampleActivities = completeActivityData(
    MORE_SAMPLE_ACTIVITIES.map(a => ({ ...a, description: "", completed: false }))
  );

  // Fetch all activities from database for the shop (no user filtering)
  const { data: databaseActivities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/activities/shop'],
    queryFn: async ({ signal }) => {
      try {
        const res = await apiRequest('/api/activities/shop', { signal });
        return res.json();
      } catch (error) {
        // Only log non-abort errors (abort errors are expected during unmounting)
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Error fetching shop activities:', error);
        }
        return [];
      }
    },
    // Add retry: false to prevent retries when component unmounts
    retry: false,
    // Add staleTime to reduce duplicate requests
    staleTime: 30000 // 30 seconds
  });

  // Process database activities to match the expected format
  const enhancedDatabaseActivities = databaseActivities.map(activity => {
    // Ensure frequency unit is the correct type
    const frequencyUnit = (activity.frequencyUnit === "day" || 
                           activity.frequencyUnit === "week" || 
                           activity.frequencyUnit === "month" || 
                           activity.frequencyUnit === "year") 
      ? activity.frequencyUnit 
      : "week"; // Default to week if invalid

    // Ensure duration unit is the correct type
    const durationUnit = (activity.durationUnit === "minute" || 
                          activity.durationUnit === "hour") 
      ? activity.durationUnit 
      : "minute"; // Default to minute if invalid

    return {
      ...activity,
      frequencyUnit,
      durationUnit,
      description: "", // Add description field if it doesn't exist
      completed: false // Add completed field if it doesn't exist
    };
  });

  // Debug to console the user's activities and the database activities for comparison
  useEffect(() => {
    if (window.location.pathname === '/shop-activities') {
      console.debug('Activity data for debugging:', {
        userActivitiesCount: activities.length,
        userActivitiesNames: activities.map(a => a.name),
        databaseActivitiesCount: databaseActivities.length,
        sampleActivitiesCount: enhancedSampleActivities.length + enhancedMoreSampleActivities.length
      });
    }
  }, [activities, databaseActivities, enhancedSampleActivities, enhancedMoreSampleActivities]);

  // Combine all activities from different sources, prioritizing database entries
  const allActivities = [
    ...enhancedDatabaseActivities,
    ...enhancedSampleActivities.filter(sample => 
      !enhancedDatabaseActivities.some(db => db.name === sample.name)
    ),
    ...enhancedMoreSampleActivities.filter(sample => 
      !enhancedDatabaseActivities.some(db => db.name === sample.name)
    )
  ];

  // Filter activities based on search and category
  const filteredActivities = allActivities.filter(activity => {
    // Convert search query to lowercase for case-insensitive matching
    const query = searchQuery.toLowerCase();

    // Check various fields for matches
    const nameMatch = activity.name.toLowerCase().includes(query);
    const descriptionMatch = activity.description?.toLowerCase().includes(query) ?? false;
    const categoryMatch = activity.category.toLowerCase().includes(query);

    // Check emoji field for keywords (we store search keywords here)
    const emojiMatch = activity.emoji?.toLowerCase().includes(query) ?? false;

    // Check for specific matches in name parts (e.g., "raft" in "Rafting Adventure")
    let namePartMatch = false;
    if (query.length >= 3) { // Only check for meaningful parts (3+ characters)
      const nameParts = activity.name.toLowerCase().split(/\s+|[-_]/); // Split by spaces and common separators
      namePartMatch = nameParts.some(part => part.startsWith(query) || part.includes(query));
    }

    const matchesSearch = searchQuery === "" || 
                          nameMatch || 
                          descriptionMatch || 
                          categoryMatch || 
                          namePartMatch || 
                          emojiMatch;

    const matchesCategory = selectedCategory === null || activity.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Generate recommended activities for the user
  const recommendedActivities = userData && activities 
    ? allActivities
      .filter(a => !activities.some(ua => ua.name === a.name)) // Don't recommend activities the user already has
      .sort(() => Math.random() - 0.5) // Shuffle
      .slice(0, 6) // Take the first 6
    : [];

  const handleAddActivity = (activity: ActivityInsert) => {
    addActivity(activity);

    toast({
      title: "Activity Added",
      description: `${activity.name} has been added to your activities.`
    });
  };

  const handleAddToCart = (activity: ActivityInsert) => {
    if (cartItems.some(item => item.name === activity.name)) {
      toast({
        title: "Already in Cart",
        description: `${activity.name} is already in your cart.`,
        variant: "destructive"
      });
      return;
    }

    addActivitiesToCart([activity]);
    setCartItems(prev => [...prev, activity]);

    toast({
      title: "Added to Cart",
      description: `${activity.name} has been added to your cart.`
    });
  };

  const handleCheckout = () => {
    toast({
      title: "Checkout Complete",
      description: `${cartItems.length} activities have been added to your routine.`
    });

    // Add all cart items to the user's activities
    cartItems.forEach(activity => {
      addActivity(activity);
    });

    // Clear the cart
    setCartItems([]);
    addActivitiesToCart([]);

    // Close the cart drawer
    setShowCart(false);
  };

  const handleCompleteActivity = (activity: Activity) => {
    completeUserActivity(activity.id);

    toast({
      title: "Activity Completed",
      description: `You've completed ${activity.name} for today.`
    });
  };

  const handleSkipActivity = (activity: Activity) => {
    // This would typically update the activity's next due date
    // For now, we'll just show a toast
    toast({
      title: "Activity Skipped",
      description: `${activity.name} will be rescheduled for later.`
    });
  };

  if (!userData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Please log in to browse activities</h1>
        <Button onClick={() => setLocation("/")}>
          Go to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <Header userData={userData} />
      <div className="flex items-center justify-end px-4 py-2 border-b">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => setShowCart(!showCart)} 
          className="relative bg-white hover:bg-gray-50 border-black"
        >
          <ShoppingCart className="h-5 w-5 text-primary" />
          {cartItems.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full text-xs w-5 h-5 flex items-center justify-center">
              {cartItems.length}
            </span>
          )}
        </Button>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            LIFE CHOICES Activities
          </h1>
          <p className="text-gray-500 mt-1">
            Explore activities for your personal growth and well-being
          </p>
        </div>

        {/* Shopping Cart Drawer */}
        {showCart && (
          <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
            <div className="bg-background w-full max-w-md h-full flex flex-col overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold">Your Activity Collection</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowCart(false)}>
                  &times;
                </Button>
              </div>

              <div className="flex-1 overflow-auto p-4">
                {cartItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <h2 className="text-3xl font-bold mb-4">LIFE CHOICES</h2>
                    <h3 className="text-lg font-medium mb-2">Your collection is empty</h3>
                    <p className="text-mutedforeground mb-6">
                      Explore our activities and add them to your collection
                    </p>
                    <Button onClick={() => setShowCart(false)} className="border-black text-black bg-white hover:bg-gray-50">Explore Activities</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cartItems.map((item, i) => {
                      const getImpactColor = (impact: number | undefined) => {
                        if (!impact) return "bg-gray-500";
                        if (impact >= 8) return "bg-green-500";
                        if (impact >= 5) return "bg-blue-500";
                        if (impact >= 3) return "bg-yellow-500";
                        return "bg-gray-500";
                      };

                      return (
                        <Card key={i} className="overflow-hidden">
                          <div className={`h-1.5 ${getImpactColor(item.lifeImpact)}`} />
                          <div className="p-3">
                            <div className="flex justify-between mb-1.5">
                              <h3 className="font-medium text-sm">{item.name}</h3>
                              <Badge className="text-xs">{item.category}</Badge>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{item.frequency} x {item.frequencyUnit}</span>
                              <span>{item.duration} {item.durationUnit}{item.duration > 1 ? 's' : ''}</span>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              {cartItems.length > 0 && (
                <div className="p-4 border-t">
                  <Button 
                    className="w-full" 
                    onClick={handleCheckout}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Checkout ({cartItems.length} item{cartItems.length !== 1 ? 's' : ''})
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search box and Categories in one row */}
        <div className="mb-6 space-y-4">
          {/* Search box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              className="pl-10"
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Simplified Categories */}
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={selectedCategory === null ? "default" : "outline"}
                onClick={() => setSelectedCategory(null)}
              >
                All
              </Button>
              {ACTIVITY_CATEGORIES.map((category) => (
                <Button
                  key={category}
                  size="sm"
                  variant={selectedCategory === category ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category.split(' & ')[0]}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Activities content */}
        <div>
          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Activities</TabsTrigger>
              <TabsTrigger value="high-impact">High Impact</TabsTrigger>
              <TabsTrigger value="quick">Quick Activities</TabsTrigger>
              <TabsTrigger value="recommended">Recommended</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredActivities.map((activity, index) => (
                  <ActivityCard 
                    key={index}
                    activity={activity}
                    onAddToCart={handleAddToCart}
                    onAddNow={handleAddActivity}
                    onComplete={handleCompleteActivity}
                    onSkip={handleSkipActivity}
                    userActivities={activities}
                    activityImages={allActivityImages}
                  />
                ))}
              </div>

              {filteredActivities.length === 0 && (
                <div className="text-center p-10 bg-muted rounded-lg">
                  <Search className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium text-lg mb-2">No activities found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search or filters to find activities.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="high-impact" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredActivities
                  .filter(a => a.lifeImpact >= 7)
                  .map((activity, index) => (
                    <ActivityCard 
                      key={index}
                      activity={activity}
                      onAddToCart={handleAddToCart}
                      onAddNow={handleAddActivity}
                      onComplete={handleCompleteActivity}
                      onSkip={handleSkipActivity}
                      userActivities={activities}
                      activityImages={allActivityImages}
                    />
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="quick" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredActivities
                  .filter(a => a.duration <= 30 && a.durationUnit === "minute")
                  .map((activity, index) => (
                    <ActivityCard 
                      key={index}
                      activity={activity}
                      onAddToCart={handleAddToCart}
                      onAddNow={handleAddActivity}
                      onComplete={handleCompleteActivity}
                      onSkip={handleSkipActivity}
                      userActivities={activities}
                      activityImages={allActivityImages}
                    />
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="recommended" className="space-y-4">
              {recommendedActivities.length > 0 ? (
                <>
                  <div className="bg-primary/10 rounded-lg p-4 mb-6">
                    <h3 className="text-lg font-medium mb-2 flex items-center">
                      <Heart className="h-5 w-5 mr-2 text-primary" fill="currentColor" /> 
                      Personalized Recommendations
                    </h3>
                    <p className="text-muted-foreground">
                      Based on your current activities and profile, we've selected these activities 
                      that might enhance your life balance and overall impact.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recommendedActivities.map((activity, index) => (
                      <ActivityCard 
                        key={index}
                        activity={activity}
                        onAddToCart={handleAddToCart}
                        onAddNow={handleAddActivity}
                        onComplete={handleCompleteActivity}
                        onSkip={handleSkipActivity}
                        userActivities={activities}
                        isRecommended={true}
                        recommendationReason={getRecommendationReason(activity, userData, activities)}
                        activityImages={allActivityImages}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center p-10 bg-muted rounded-lg">
                  <User className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium text-lg mb-2">No recommendations available</h3>
                  <p className="text-muted-foreground mb-6">
                    Add some activities to your profile to get personalized recommendations.
                  </p>
                  <Button onClick={() => setLocation("/profile")}>Update Your Profile</Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Navigation removed as we use centralized bottom navigation */}
    </div>
  );
}