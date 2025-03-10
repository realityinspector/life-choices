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
import { Activity, ActivityInsert, UserData } from "@shared/schema";
import { Store, Filter, Clock, Zap, Plus, Heart, Search, ShoppingCart, Check, Share2, Link, Lock, Globe, Calendar, ArrowRight } from "lucide-react";
import Header from "@/components/header";
import { useLocation } from "wouter";

// Activity Card component for consistency across tabs
interface ActivityCardProps {
  activity: Required<ActivityInsert>;
  onAddToCart: (activity: ActivityInsert) => void;
  onAddNow: (activity: ActivityInsert) => void;
  onComplete?: (activity: Activity) => void;
  onSkip?: (activity: Activity) => void;
  isRecommended?: boolean;
  recommendationReason?: string;
  userActivities: Activity[];
}

const ActivityCard = ({ 
  activity, 
  onAddToCart, 
  onAddNow, 
  onComplete,
  onSkip,
  isRecommended = false,
  recommendationReason,
  userActivities
}: ActivityCardProps) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharePrivacy, setSharePrivacy] = useState<"private" | "link" | "public">("private");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const { toast } = useToast();
  
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

  // Check if this activity already exists in the user's activities
  const activityExists = userActivities.some(a => a.name === activity.name);
  
  // Find the activity in user's activities if it exists
  const existingActivity = userActivities.find(a => a.name === activity.name);

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
          {activityExists ? (
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
                className="w-full text-xs h-8" 
                size="sm"
                variant="ghost"
                onClick={handleExportToCalendar}
              >
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                Add to Calendar
              </Button>
            </>
          ) : (
            <>
              <div className="flex w-full space-x-2">
                <Button 
                  className="flex-1 text-xs h-8" 
                  size="sm"
                  onClick={() => onAddToCart(activity)}
                >
                  <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                  Add to Cart
                </Button>
                <Button 
                  className="flex-1 text-xs h-8" 
                  size="sm"
                  variant="outline"
                  onClick={() => onAddNow(activity)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add Now
                </Button>
              </div>
              <Button 
                className="w-full text-xs h-8" 
                size="sm"
                variant="ghost"
                onClick={() => setShowShareModal(true)}
              >
                <Share2 className="h-3.5 w-3.5 mr-1.5" />
                Share Activity
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
                        <Link className="h-4 w-4 text-blue-600" />
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
  activity: Required<ActivityInsert>,
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
  const timeUsagePercentage = (weeklyTimeAllocation / availableWeeklyTime) * 100;
  
  // Reasons based on various factors
  if (activity.lifeImpact >= 8) {
    return "High impact activity that could significantly improve your life quality";
  }
  
  if (!userCategories.has(activity.category)) {
    return `Adding ${activity.category} activities can create more balance in your routine`;
  }
  
  if (timeUsagePercentage > 70 && activity.duration <= 30 && activity.durationUnit === "minute") {
    return "Quick activity that fits well in your busy schedule";
  }
  
  if (averageImpact < 6 && activity.lifeImpact > averageImpact) {
    return "Higher impact than your current activities";
  }
  
  return "Complements your existing routine well";
};

// Main recommendation generation function
const generateRecommendations = (
  userData: UserData,
  currentActivities: Activity[],
  allActivities: Required<ActivityInsert>[]
): Required<ActivityInsert>[] => {
  // Get current categories and activity names
  const userCategories = new Set(currentActivities.map(a => a.category));
  const userActivityNames = new Set(currentActivities.map(a => a.name));
  
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
  const sleepHours = userData.sleepHours || 8; // Default to 8 hours if not specified
  const availableWeeklyTime = (24 * 7 - sleepHours * 7) * 60;
  const timeUsagePercentage = (weeklyTimeAllocation / availableWeeklyTime) * 100;
  
  // Create a balanced recommendation set
  const recommendations: Required<ActivityInsert>[] = [];
  
  // Approach 1: Recommend activities from categories the user is interested in but not fully explored
  if (userCategories.size > 0) {
    // Find activities in the same categories but with different names
    const categorySimilarActivities = allActivities.filter(activity => 
      userCategories.has(activity.category) && 
      !userActivityNames.has(activity.name)
    );
    
    recommendations.push(...categorySimilarActivities.slice(0, 3));
  }
  
  // Approach 2: Recommend high-impact activities if the user has mostly low-impact ones
  const averageImpact = currentActivities.length > 0 
    ? currentActivities.reduce((sum, a) => sum + (a.lifeImpact || 0), 0) / currentActivities.length
    : 0;
    
  if (averageImpact < 6 && recommendations.length < 6) {
    const highImpactActivities = allActivities
      .filter(a => a.lifeImpact >= 7 && !userActivityNames.has(a.name))
      .slice(0, 3);
      
    recommendations.push(...highImpactActivities);
  }
  
  // Approach 3: If the user has a busy schedule (>70% allocated), recommend shorter activities
  if (timeUsagePercentage > 70 && recommendations.length < 8) {
    const quickActivities = allActivities
      .filter(a => 
        a.duration <= 30 && 
        a.durationUnit === "minute" && 
        !userActivityNames.has(a.name)
      )
      .slice(0, 3);
      
    recommendations.push(...quickActivities);
  }
  
  // Approach 4: Recommend activities from new categories if the user has a narrow focus
  if (userCategories.size < 4 && recommendations.length < 10) {
    const newCategoryActivities = allActivities
      .filter(a => !userCategories.has(a.category) && !userActivityNames.has(a.name))
      .slice(0, 3);
      
    recommendations.push(...newCategoryActivities);
  }
  
  // If we still don't have enough recommendations, add some high-quality ones
  if (recommendations.length < 6) {
    const additionalActivities = allActivities
      .filter(a => !userActivityNames.has(a.name) && a.lifeImpact >= 6)
      .slice(0, 6 - recommendations.length);
      
    recommendations.push(...additionalActivities);
  }
  
  // Remove any duplicates and return
  return [...new Map(recommendations.map(item => [item.name, item])).values()];
};

// Sample activities data - in a real app, this would come from the database
// Making sure all properties are defined to avoid TypeScript errors
const SAMPLE_ACTIVITIES: Array<Required<ActivityInsert>> = [
  {
    name: "Morning Meditation",
    category: "Spirituality & Mindfulness",
    frequency: 7,
    frequencyUnit: "week",
    duration: 20,
    durationUnit: "minute",
    lifeImpact: 8,
    color: "#8884d8",
    emoji: "🧘",
    priority: 3,
    exportToCalendar: false,
    clusterId: null
  },
  {
    name: "Strength Training",
    category: "Health & Fitness",
    frequency: 3,
    frequencyUnit: "week",
    duration: 45,
    durationUnit: "minute",
    lifeImpact: 7,
    color: "#0088FE",
    emoji: "💪",
    priority: 3,
    exportToCalendar: false,
    clusterId: null
  },
  {
    name: "Reading Non-Fiction",
    category: "Learning & Growth",
    frequency: 5,
    frequencyUnit: "week",
    duration: 30,
    durationUnit: "minute",
    lifeImpact: 6,
    color: "#00C49F"
  },
  {
    name: "Family Game Night",
    category: "Relationships",
    frequency: 1,
    frequencyUnit: "week",
    duration: 2,
    durationUnit: "hour",
    lifeImpact: 9,
    color: "#FFBB28"
  },
  {
    name: "Deep Work Session",
    category: "Work & Career",
    frequency: 5,
    frequencyUnit: "week",
    duration: 3,
    durationUnit: "hour",
    lifeImpact: 6,
    color: "#FF8042"
  },
  {
    name: "Volunteer Work",
    category: "Service & Community",
    frequency: 2,
    frequencyUnit: "month",
    duration: 3,
    durationUnit: "hour",
    lifeImpact: 8,
    color: "#82ca9d"
  },
  {
    name: "Hiking",
    category: "Travel & Adventure",
    frequency: 2,
    frequencyUnit: "month",
    duration: 3,
    durationUnit: "hour",
    lifeImpact: 7,
    color: "#ffc658"
  },
  {
    name: "Gardening",
    category: "Home & Life Management",
    frequency: 2,
    frequencyUnit: "week",
    duration: 1,
    durationUnit: "hour",
    lifeImpact: 5,
    color: "#8dd1e1"
  },
  {
    name: "Painting",
    category: "Creativity",
    frequency: 1,
    frequencyUnit: "week",
    duration: 2,
    durationUnit: "hour",
    lifeImpact: 6,
    color: "#a4de6c"
  },
  {
    name: "Yoga Practice",
    category: "Health & Fitness",
    frequency: 3,
    frequencyUnit: "week",
    duration: 1,
    durationUnit: "hour",
    lifeImpact: 7,
    color: "#d0ed57"
  },
  {
    name: "Learning New Language",
    category: "Learning & Growth",
    frequency: 5,
    frequencyUnit: "week",
    duration: 30,
    durationUnit: "minute",
    lifeImpact: 8,
    color: "#8884d8"
  },
  {
    name: "Date Night",
    category: "Relationships",
    frequency: 1,
    frequencyUnit: "week",
    duration: 3,
    durationUnit: "hour",
    lifeImpact: 8,
    color: "#0088FE"
  },
  {
    name: "Deep Reading",
    category: "Learning & Growth",
    frequency: 3,
    frequencyUnit: "week",
    duration: 1,
    durationUnit: "hour",
    lifeImpact: 6,
    color: "#00C49F"
  },
  {
    name: "Journaling",
    category: "Spirituality & Mindfulness",
    frequency: 7,
    frequencyUnit: "week",
    duration: 15,
    durationUnit: "minute",
    lifeImpact: 6,
    color: "#FFBB28"
  },
  {
    name: "Networking Event",
    category: "Work & Career",
    frequency: 2,
    frequencyUnit: "month",
    duration: 2,
    durationUnit: "hour",
    lifeImpact: 5,
    color: "#FF8042"
  }
];

export default function ShopActivitiesPage() {
  const { toast } = useToast();
  const { 
    userData, 
    activities, 
    addActivity, 
    addActivitiesToCart, 
    getCartActivities, 
    saveCartActivities,
    completeActivity 
  } = useUser();
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filteredActivities, setFilteredActivities] = useState<Required<ActivityInsert>[]>(SAMPLE_ACTIVITIES);
  const [recommendedActivities, setRecommendedActivities] = useState<Required<ActivityInsert>[]>([]);
  const [cartItems, setCartItems] = useState<ActivityInsert[]>([]);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    // Initialize cart from user context
    setCartItems(getCartActivities());
  }, [getCartActivities]);

  // Helper function to ensure all activities have required properties
  const completeActivityData = (activities: any[]): Required<ActivityInsert>[] => {
    return activities.map(activity => ({
      ...activity,
      priority: activity.priority ?? 3,
      exportToCalendar: activity.exportToCalendar ?? false,
      emoji: activity.emoji ?? "✨",
      clusterId: activity.clusterId ?? null
    }));
  };

  // Generate recommendations when user or activities change
  useEffect(() => {
    if (userData && activities) {
      // Use our helper function to ensure activities have required properties
      const completeActivities = completeActivityData(SAMPLE_ACTIVITIES);
      
      const recommendations = generateRecommendations(userData, activities, completeActivities);
      setRecommendedActivities(recommendations);
    }
  }, [userData, activities]);
  
  useEffect(() => {
    // Filter activities based on search query and category
    const completedSamples = completeActivityData(SAMPLE_ACTIVITIES);
    let result = completedSamples;
    
    if (searchQuery.trim() !== "") {
      result = result.filter(activity => 
        activity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedCategory) {
      result = result.filter(activity => activity.category === selectedCategory);
    }
    
    setFilteredActivities(result);
  }, [searchQuery, selectedCategory]);

  const handleAddActivity = (activity: ActivityInsert) => {
    // Add directly to activities
    addActivity(activity);
    toast({
      title: "Activity Added",
      description: `${activity.name} has been added to your activities.`,
    });
  };
  
  const handleAddToCart = (activity: ActivityInsert) => {
    // Add to cart
    addActivitiesToCart([activity]);
    setCartItems(getCartActivities());
    toast({
      title: "Added to Cart",
      description: `${activity.name} has been added to your shopping cart.`,
    });
  };
  
  const handleCompleteActivity = (activity: Activity) => {
    completeActivity(activity.id);
    toast({
      title: "Activity Completed",
      description: `${activity.name} has been marked as complete.`,
    });
  };
  
  const handleSkipActivity = (activity: Activity) => {
    // Skip functionality - might be added to backend later
    // For now, we just show a notification
    toast({
      title: "Activity Skipped",
      description: `${activity.name} has been skipped for now.`,
    });
  };
  
  const handleCheckout = async () => {
    await saveCartActivities();
    toast({
      title: "Activities Added",
      description: `${cartItems.length} activities have been added to your routine.`,
    });
    setCartItems([]);
    setShowCart(false);
  };

  const getImpactColor = (impact: number | undefined) => {
    if (!impact) return "bg-gray-500";
    if (impact >= 8) return "bg-green-500";
    if (impact >= 5) return "bg-blue-500";
    if (impact >= 3) return "bg-yellow-500";
    return "bg-gray-500";
  };

  // If user is not logged in, show login prompt
  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <Header />
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg text-center">
          <h1 className="text-2xl font-bold mb-4">Login Required</h1>
          <p className="mb-6">Please log in to view and add activities.</p>
          <Button onClick={() => window.location.href = "/login"}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Header userData={userData} />
      
      <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 flex-grow">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div className="mb-4 md:mb-0">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Store className="h-6 w-6 text-primary mr-2" />
              Shop Activities
            </h1>
            <p className="text-gray-500 mt-1">
              Browse and add life-enhancing activities to your routine
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setShowCart(!showCart)} 
              className="relative bg-white hover:bg-gray-50"
            >
              <ShoppingCart className="h-5 w-5 text-primary" />
              {cartItems.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full text-xs w-5 h-5 flex items-center justify-center">
                  {cartItems.length}
                </span>
              )}
            </Button>
          </div>
        </div>
        
        {/* Shopping Cart Drawer */}
        {showCart && (
          <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
            <div className="bg-background w-full max-w-md h-full flex flex-col overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold">Your Shopping Cart</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowCart(false)}>
                  &times;
                </Button>
              </div>
              
              <div className="flex-1 overflow-auto p-4">
                {cartItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Your cart is empty</h3>
                    <p className="text-muted-foreground mb-6">
                      Browse activities and add them to your cart
                    </p>
                    <Button onClick={() => setShowCart(false)}>Shop Activities</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cartItems.map((item, i) => (
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
                    ))}
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="md:col-span-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                className="pl-10"
                placeholder="Search activities by name or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => setSelectedCategory(null)}
            >
              <Filter className="mr-2 h-4 w-4" />
              {selectedCategory ? "Clear Filter" : "All Categories"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Categories</CardTitle>
                <CardDescription>Browse by type</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {ACTIVITY_CATEGORIES.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "ghost"}
                    className="w-full justify-start text-left"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-3">
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
                          recommendationReason={userData && activities ? getRecommendationReason(activity, userData, activities) : undefined}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center p-10 bg-muted rounded-lg">
                    <Heart className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium text-lg mb-2">No recommendations yet</h3>
                    <p className="text-muted-foreground mb-6">
                      Add some activities to your routine to get personalized recommendations.
                    </p>
                    <Button onClick={() => {
                      const element = document.querySelector('[data-value="all"]');
                      if (element && element instanceof HTMLElement) {
                        element.click();
                      }
                    }}>
                      Browse All Activities
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-white py-4 border-t mt-auto">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            Life Choices: Do what matters, one choice at a time.
          </p>
        </div>
      </footer>
    </div>
  );
}