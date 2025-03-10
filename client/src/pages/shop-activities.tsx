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
import { Store, Filter, Clock, Zap, Plus, Heart, Search, ShoppingCart, Check } from "lucide-react";
import Header from "@/components/header";
import { useLocation } from "wouter";

// Activity Card component for consistency across tabs
interface ActivityCardProps {
  activity: Required<ActivityInsert>;
  onAddToCart: (activity: ActivityInsert) => void;
  onAddNow: (activity: ActivityInsert) => void;
  isRecommended?: boolean;
  recommendationReason?: string;
}

const ActivityCard = ({ 
  activity, 
  onAddToCart, 
  onAddNow, 
  isRecommended = false,
  recommendationReason
}: ActivityCardProps) => {
  const getImpactColor = (impact: number | undefined) => {
    if (!impact) return "bg-gray-500";
    if (impact >= 8) return "bg-green-500";
    if (impact >= 5) return "bg-blue-500";
    if (impact >= 3) return "bg-yellow-500";
    return "bg-gray-500";
  };

  return (
    <Card className={`overflow-hidden ${isRecommended ? "border-primary" : ""}`}>
      <div className={`h-2 ${getImpactColor(activity.lifeImpact)}`} />
      <CardHeader className="pb-2">
        <div className="flex justify-between">
          <CardTitle className="text-lg flex items-center">
            {activity.name}
            {isRecommended && <Heart className="h-4 w-4 ml-2 text-red-500 fill-red-500" />}
          </CardTitle>
          <Badge>{activity.category}</Badge>
        </div>
        <CardDescription>
          {!isRecommended && `${activity.frequency} x ${activity.frequencyUnit}`}
          {isRecommended && recommendationReason ? (
            <span className="text-primary font-medium">{recommendationReason}</span>
          ) : isRecommended ? (
            <span className="text-primary font-medium">Recommended for your profile</span>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex justify-between text-sm">
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
            <span>{activity.duration} {activity.durationUnit}{activity.duration > 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center">
            <Zap className="h-4 w-4 mr-1 text-muted-foreground" />
            <span>Impact: {activity.lifeImpact > 0 ? '+' : ''}{activity.lifeImpact}</span>
          </div>
        </div>
        {isRecommended && !recommendationReason && (
          <div className="mt-2 text-xs text-primary-foreground/70">
            <span className="flex items-center">
              <span className="mr-1">•</span> {activity.frequency} x {activity.frequencyUnit}
            </span>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex space-x-2">
        <Button 
          className="flex-1" 
          size="sm"
          onClick={() => onAddToCart(activity)}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add to Cart
        </Button>
        <Button 
          className="flex-1" 
          size="sm"
          variant="outline"
          onClick={() => onAddNow(activity)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Now
        </Button>
      </CardFooter>
    </Card>
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
  const availableWeeklyTime = (24 * 7 - userData.sleepHours * 7) * 60;
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
    color: "#8884d8"
  },
  {
    name: "Strength Training",
    category: "Health & Fitness",
    frequency: 3,
    frequencyUnit: "week",
    duration: 45,
    durationUnit: "minute",
    lifeImpact: 7,
    color: "#0088FE"
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
  const { userData, activities, addActivity, addActivitiesToCart, getCartActivities, saveCartActivities } = useUser();
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

  // Generate recommendations when user or activities change
  useEffect(() => {
    if (userData && activities) {
      // Fill in missing required properties for TypeScript
      const completeActivities = SAMPLE_ACTIVITIES.map(activity => ({
        ...activity,
        priority: 3,
        exportToCalendar: false,
        emoji: "✨",
        clusterId: null
      }));
      
      const recommendations = generateRecommendations(userData, activities, completeActivities);
      setRecommendedActivities(recommendations);
    }
  }, [userData, activities]);

  useEffect(() => {
    // Filter activities based on search query and category
    let result = SAMPLE_ACTIVITIES;
    
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
    <div className="min-h-screen bg-gray-100">
      <Header userData={userData} />
      
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Shop Activities</h1>
            <p className="text-muted-foreground">
              Browse and add life-enhancing activities to your routine
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setShowCart(!showCart)} 
              className="relative"
            >
              <ShoppingCart className="h-6 w-6 text-primary" />
              {cartItems.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full text-xs w-5 h-5 flex items-center justify-center">
                  {cartItems.length}
                </span>
              )}
            </Button>
            <Store className="h-10 w-10 text-primary" />
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
                        <div className={`h-2 ${getImpactColor(item.lifeImpact)}`} />
                        <div className="p-4">
                          <div className="flex justify-between mb-2">
                            <h3 className="font-medium">{item.name}</h3>
                            <Badge>{item.category}</Badge>
                          </div>
                          <div className="flex justify-between text-sm text-muted-foreground">
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
                    <Button onClick={() => document.querySelector('[data-value="all"]')?.click()}>
                      Browse All Activities
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}