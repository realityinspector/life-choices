import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { UserData, Activity, ActivityInsert } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { v4 as uuidv4 } from 'uuid';

interface UserContextType {
  isUserSetup: boolean;
  userData: UserData;
  activities: Activity[];
  isAdmin: boolean;
  completeSetup: (userData: UserData) => void;
  updateUserData: (userData: UserData) => void;
  addActivity: (activity: ActivityInsert) => Promise<Activity | undefined>;
  updateActivity: (index: number, activity: ActivityInsert) => void;
  removeActivity: (index: number) => void;
  removeMultipleActivities: (activityIds: number[]) => Promise<boolean>;
  completeActivity: (id: number) => Promise<Activity | undefined>;
  skipActivity: (id: number) => Promise<Activity | undefined>;
  getNextActivity: (skipActivityNames?: string[], skipDuplicates?: boolean) => Promise<Activity | undefined>;
  createSharedActivity: (activity: ActivityInsert, recipientEmail: string) => Promise<string>;
  addActivitiesToCart: (activities: ActivityInsert[]) => void;
  getCartActivities: () => ActivityInsert[];
  clearCart: () => void;
  saveCartActivities: () => Promise<Activity[] | undefined>;
  resetData: () => void;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [isUserSetup, setIsUserSetup] = useState(false);
  const [userData, setUserData] = useState<UserData>({
    name: '',
    username: '',
    password: '',
    age: 30,
    lifeExpectancy: 85,
    sleepHours: 8
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityCart, setActivityCart] = useState<ActivityInsert[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  // Load data from API on initial render and handle auth state
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log("ALL ONE THING: Starting to load user data");
        // First try to get user data from API with credentials
        const userDataResponse = await fetch('/api/user', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (userDataResponse.ok) {
          try {
            const userData = await userDataResponse.json();
            console.log("ALL ONE THING: User data loaded successfully");
            
            if (userData) {
              setUserData(userData);
              setIsUserSetup(true);
              
              // Then get activities
              try {
                console.log("ALL ONE THING: Fetching activities");
                const activitiesResponse = await fetch('/api/activities', {
                  method: 'GET',
                  credentials: 'include',
                  headers: {
                    'Content-Type': 'application/json'
                  }
                });
                
                if (activitiesResponse.ok) {
                  try {
                    const activities = await activitiesResponse.json();
                    console.log(`ALL ONE THING: Activities loaded successfully (${activities.length} items)`);
                    setActivities(activities);
                  } catch (err) {
                    console.error("ALL ONE THING: Error parsing activities JSON:", err);
                  }
                } else {
                  console.error("ALL ONE THING: Failed to fetch activities, status:", activitiesResponse.status);
                }
              } catch (activitiesError) {
                console.error("ALL ONE THING: Error fetching activities:", activitiesError);
              }
              
              // Check if user is admin
              try {
                console.log("ALL ONE THING: Checking admin status");
                const adminCheckResponse = await fetch('/api/user/admin-check', {
                  method: 'GET',
                  credentials: 'include',
                  headers: {
                    'Content-Type': 'application/json'
                  }
                });
                
                if (adminCheckResponse.ok) {
                  try {
                    const { isAdmin: adminStatus } = await adminCheckResponse.json();
                    console.log("ALL ONE THING: Admin status:", adminStatus);
                    setIsAdmin(adminStatus);
                  } catch (err) {
                    console.error("ALL ONE THING: Error parsing admin check JSON:", err);
                  }
                } else {
                  console.error("ALL ONE THING: Failed admin check, status:", adminCheckResponse.status);
                }
              } catch (error) {
                console.error('ALL ONE THING: Error checking admin status:', error);
              }
              
              // Load cart from localStorage (cart is client-side only)
              try {
                console.log("ALL ONE THING: Loading cart from localStorage");
                const savedCart = localStorage.getItem('lifechoicesCart');
                if (savedCart) {
                  const parsedCart = JSON.parse(savedCart);
                  console.log(`ALL ONE THING: Cart loaded with ${parsedCart.length} items`);
                  setActivityCart(parsedCart);
                } else {
                  console.log("ALL ONE THING: No cart data found in localStorage");
                }
              } catch (cartError) {
                console.error("ALL ONE THING: Error loading cart from localStorage:", cartError);
              }
            } else {
              console.error("ALL ONE THING: User data is empty or undefined");
            }
          } catch (userDataError) {
            console.error("ALL ONE THING: Error parsing user data JSON:", userDataError);
          }
        } else {
          console.error("ALL ONE THING: Failed to fetch user data, status:", userDataResponse.status);
          
          // If not authenticated, try to load from localStorage as fallback
          const savedUserData = localStorage.getItem('lifechoicesUserData');
          const savedActivities = localStorage.getItem('lifechoicesActivities');
          const savedCart = localStorage.getItem('lifechoicesCart');
          
          if (savedUserData) {
            setUserData(JSON.parse(savedUserData));
            setIsUserSetup(true);
          }
          
          if (savedActivities) {
            setActivities(JSON.parse(savedActivities));
          }

          if (savedCart) {
            setActivityCart(JSON.parse(savedCart));
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        
        // Handle complete failure by checking localStorage
        const savedUserData = localStorage.getItem('lifechoicesUserData');
        const savedActivities = localStorage.getItem('lifechoicesActivities');
        const savedCart = localStorage.getItem('lifechoicesCart');
        
        if (savedUserData) {
          setUserData(JSON.parse(savedUserData));
          setIsUserSetup(true);
        }
        
        if (savedActivities) {
          setActivities(JSON.parse(savedActivities));
        }

        if (savedCart) {
          setActivityCart(JSON.parse(savedCart));
        }
      }
    };
    
    loadData();
  }, []);

  const completeSetup = async (newUserData: UserData) => {
    setUserData(newUserData);
    setIsUserSetup(true);
    
    try {
      await apiRequest('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserData)
      });
    } catch (error) {
      // Fallback to localStorage if API fails
      localStorage.setItem('lifechoicesUserData', JSON.stringify(newUserData));
    }
  };

  const updateUserData = async (newUserData: UserData) => {
    setUserData(newUserData);
    
    try {
      await apiRequest('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserData)
      });
    } catch (error) {
      // Fallback to localStorage if API fails
      localStorage.setItem('lifechoicesUserData', JSON.stringify(newUserData));
    }
  };

  const addActivity = async (activity: ActivityInsert): Promise<Activity | undefined> => {
    try {
      console.log("Adding new activity:", activity.name);
      
      // Call the API without any scheduleForLater flag to ensure immediate display
      const response = await apiRequest('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activity)
      });
      
      const newActivity = await response.json();
      console.log("New activity created:", newActivity);
      
      // Update the local activities state with the newly added activity
      setActivities(prevActivities => [...prevActivities, newActivity]);
      
      // Return the new activity for immediate use if needed
      return newActivity;
    } catch (error) {
      console.error("Error adding activity:", error);
      
      // Generate a unique ID and fallback to localStorage
      const newActivity = {
        ...activity,
        id: activities.length > 0 ? Math.max(...activities.map(a => a.id || 0)) + 1 : 1,
        userId: 1, // Placeholder for local storage
        nextDue: new Date() // Set nextDue to now for local storage fallback too
      } as Activity;
      
      const updatedActivities = [...activities, newActivity];
      setActivities(updatedActivities);
      localStorage.setItem('lifechoicesActivities', JSON.stringify(updatedActivities));
      
      // Return the new activity for immediate use even in fallback mode
      return newActivity;
    }
  };

  const updateActivity = async (index: number, activity: ActivityInsert) => {
    const activityToUpdate = activities[index];
    const updatedActivity = { 
      ...activity, 
      id: activityToUpdate.id,
      userId: activityToUpdate.userId,
      lastCompleted: activityToUpdate.lastCompleted,
      nextDue: activityToUpdate.nextDue,
      completionCount: activityToUpdate.completionCount
    } as Activity;
    
    try {
      await apiRequest(`/api/activities/${activityToUpdate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedActivity)
      });
      const updatedActivities = [...activities];
      updatedActivities[index] = updatedActivity;
      setActivities(updatedActivities);
    } catch (error) {
      // Fallback to localStorage if API fails
      const updatedActivities = [...activities];
      updatedActivities[index] = updatedActivity;
      setActivities(updatedActivities);
      localStorage.setItem('lifechoicesActivities', JSON.stringify(updatedActivities));
    }
  };

  const removeActivity = async (index: number) => {
    const activityToRemove = activities[index];
    
    try {
      await apiRequest(`/api/activities/${activityToRemove.id}`, {
        method: 'DELETE'
      });
      const updatedActivities = activities.filter((_, i) => i !== index);
      setActivities(updatedActivities);
    } catch (error) {
      // Fallback to localStorage if API fails
      const updatedActivities = activities.filter((_, i) => i !== index);
      setActivities(updatedActivities);
      localStorage.setItem('lifechoicesActivities', JSON.stringify(updatedActivities));
    }
  };
  
  const removeMultipleActivities = async (activityIds: number[]): Promise<boolean> => {
    try {
      // Delete each activity one by one
      for (const id of activityIds) {
        await apiRequest(`/api/activities/${id}`, {
          method: 'DELETE'
        });
      }
      // Update the local state - only remove user's activities
      const updatedActivities = activities.filter(activity => !activityIds.includes(activity.id));
      setActivities(updatedActivities);
      return true;
    } catch (error) {
      console.error('Error removing multiple activities:', error);
      // Fallback to localStorage if API fails
      const updatedActivities = activities.filter(activity => !activityIds.includes(activity.id));
      setActivities(updatedActivities);
      localStorage.setItem('lifechoicesActivities', JSON.stringify(updatedActivities));
      return false;
    }
  };

  const completeActivity = async (id: number): Promise<Activity | undefined> => {
    try {
      const response = await apiRequest(`/api/activities/${id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const updatedActivity = await response.json();
      
      // Update the activity in the local state
      const updatedActivities = activities.map(activity => 
        activity.id === id ? updatedActivity : activity
      );
      
      setActivities(updatedActivities);
      return updatedActivity;
    } catch (error) {
      // Fallback to local update
      const activityIndex = activities.findIndex(a => a.id === id);
      if (activityIndex === -1) return undefined;
      
      const activity = activities[activityIndex];
      const now = new Date();
      
      // Calculate when the activity will be due next based on frequency
      let nextDue = new Date(now);
      
      if (activity.frequencyUnit === 'day') {
        nextDue.setDate(nextDue.getDate() + activity.frequency);
      } else if (activity.frequencyUnit === 'week') {
        nextDue.setDate(nextDue.getDate() + (activity.frequency * 7));
      } else if (activity.frequencyUnit === 'month') {
        nextDue.setMonth(nextDue.getMonth() + activity.frequency);
      } else if (activity.frequencyUnit === 'year') {
        nextDue.setFullYear(nextDue.getFullYear() + activity.frequency);
      }
      
      const updatedActivity = {
        ...activity,
        lastCompleted: now,
        nextDue,
        completionCount: (activity.completionCount || 0) + 1
      };
      
      const updatedActivities = [...activities];
      updatedActivities[activityIndex] = updatedActivity;
      setActivities(updatedActivities);
      localStorage.setItem('lifechoicesActivities', JSON.stringify(updatedActivities));
      
      return updatedActivity;
    }
  };
  
  const skipActivity = async (id: number): Promise<Activity | undefined> => {
    try {
      const response = await apiRequest(`/api/activities/${id}/skip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const updatedActivity = await response.json();
      
      // Update the activity in the local state
      const updatedActivities = activities.map(activity => 
        activity.id === id ? updatedActivity : activity
      );
      
      setActivities(updatedActivities);
      return updatedActivity;
    } catch (error) {
      // Fallback to local update
      const activityIndex = activities.findIndex(a => a.id === id);
      if (activityIndex === -1) return undefined;
      
      const activity = activities[activityIndex];
      const now = new Date();
      
      // Calculate when the activity will be due next based on frequency (same as complete, but no lastCompleted update)
      let nextDue = new Date(now);
      
      if (activity.frequencyUnit === 'day') {
        nextDue.setDate(nextDue.getDate() + activity.frequency);
      } else if (activity.frequencyUnit === 'week') {
        nextDue.setDate(nextDue.getDate() + (activity.frequency * 7));
      } else if (activity.frequencyUnit === 'month') {
        nextDue.setMonth(nextDue.getMonth() + activity.frequency);
      } else if (activity.frequencyUnit === 'year') {
        nextDue.setFullYear(nextDue.getFullYear() + activity.frequency);
      }
      
      const updatedActivity = {
        ...activity,
        nextDue,
        // Don't update lastCompleted or completionCount since we're just skipping
      };
      
      const updatedActivities = [...activities];
      updatedActivities[activityIndex] = updatedActivity;
      setActivities(updatedActivities);
      localStorage.setItem('lifechoicesActivities', JSON.stringify(updatedActivities));
      
      return updatedActivity;
    }
  };

  const getNextActivity = async (skipActivityNames: string[] = [], skipDuplicates: boolean = true): Promise<Activity | undefined> => {
    try {
      // Build query parameters to skip duplicate activities or specific activity names
      const params = new URLSearchParams();
      
      // Add each activity name to skip as a separate query parameter
      skipActivityNames.forEach(name => {
        params.append('skipNames', name);
      });
      
      // Add the skipDuplicates flag if true - this will make the backend automatically detect duplicates
      if (skipDuplicates) {
        params.append('skipDuplicates', 'true');
      }
      
      // Make the API request with the parameters
      const url = `/api/activities/next${params.toString() ? `?${params.toString()}` : ''}`;
      
      // Use the modified apiRequest function with ignoreStatuses option to handle 404 gracefully
      const response = await apiRequest(url, {
        ignoreStatuses: [404] // Don't throw on 404, we'll handle it as "no activities found"
      });
      
      // If it's a 404, return undefined (no activities found)
      if (response.status === 404) {
        console.log("No activities found from server, using fallback logic");
        return undefined;
      }
      
      // Otherwise, return the parsed response
      return await response.json();
    } catch (error) {
      console.error('Error fetching next activity:', error);
      
      // Fallback to client-side logic for determining next activity
      const now = new Date();
      
      // Filter activities that are due now or past due
      // Sort activities by priority and due date
      let filteredActivities = [...activities]
        .filter(a => {
          // Only include activities that are:
          // 1. Due now or in the past (nextDue <= current date), or
          // 2. Don't have a nextDue date set
          if (!a.nextDue) return true;
          const dueDate = new Date(a.nextDue);
          return dueDate <= now;
        });
        
      // If skipActivityNames is provided, filter out those activities
      if (skipActivityNames.length > 0) {
        filteredActivities = filteredActivities.filter(a => 
          !skipActivityNames.includes(a.name)
        );
      }
      
      // If skipDuplicates is true, filter out activities with duplicate names
      if (skipDuplicates) {
        // Group activities by name and find duplicates
        const activityNames = new Set<string>();
        const nameCounts: Record<string, number> = {};
        
        // Count occurrences of each activity name
        filteredActivities.forEach(a => {
          nameCounts[a.name] = (nameCounts[a.name] || 0) + 1;
        });
        
        // Filter out activities with duplicate names
        filteredActivities = filteredActivities.filter(a => {
          // If this name has already been seen, skip it
          if (nameCounts[a.name] > 1) {
            if (activityNames.has(a.name)) {
              return false;
            }
            // Otherwise, mark it as seen and keep it
            activityNames.add(a.name);
          }
          return true;
        });
      }
      
      // Sort the filtered activities
      const sortedActivities = filteredActivities.sort((a, b) => {
        // First by priority (lower number = higher priority)
        if ((a.priority || 5) !== (b.priority || 5)) {
          return (a.priority || 5) - (b.priority || 5);
        }
        
        // Then by due date
        if (a.nextDue && b.nextDue) {
          return new Date(a.nextDue).getTime() - new Date(b.nextDue).getTime();
        }
        
        return 0;
      });
        
      return sortedActivities[0];
    }
  };

  const createSharedActivity = async (activity: ActivityInsert, recipientEmail: string): Promise<string> => {
    try {
      const response = await apiRequest('/api/activities/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity,
          recipientEmail
        }),
        // Ignore 404 errors which might occur if the sharing feature is disabled
        ignoreStatuses: [404]
      });
      
      // If the response is OK, return the invitation token
      if (response.ok) {
        const result = await response.json();
        return result.invitationToken;
      }
      
      // For any non-OK response that wasn't ignored, log and generate a temporary token
      console.log(`Activity sharing returned status: ${response.status}`);
      return `share-${uuidv4()}`;
    } catch (error) {
      // Log the error but don't crash the app
      console.error('Error sharing activity:', error);
      
      // Generate a token as a fallback
      return `share-${uuidv4()}`;
    }
  };

  const addActivitiesToCart = (activitiesToAdd: ActivityInsert[]) => {
    const updatedCart = [...activityCart, ...activitiesToAdd];
    setActivityCart(updatedCart);
    localStorage.setItem('lifechoicesCart', JSON.stringify(updatedCart));
  };

  const getCartActivities = () => {
    return activityCart;
  };

  const clearCart = () => {
    setActivityCart([]);
    localStorage.removeItem('lifechoicesCart');
  };

  const saveCartActivities = async (): Promise<Activity[] | undefined> => {
    // Store the number of activities to process
    const activityCount = activityCart.length;
    console.log(`Processing ${activityCount} activities from cart`);
    
    if (activityCount === 0) {
      return undefined; // No activities to process
    }
    
    try {
      // Add all activities in the cart to the user's activities
      const newActivities: Activity[] = [];
      
      // Process all activities in series to maintain order
      for (const activity of activityCart) {
        const newActivity = await addActivity(activity);
        if (newActivity) {
          newActivities.push(newActivity);
        }
      }
      
      console.log(`Successfully added ${newActivities.length} activities from cart`);
      
      // Clear the cart after successful processing
      clearCart();
      
      // Return the new activities for immediate use if needed
      return newActivities;
    } catch (error) {
      console.error("Error saving cart activities:", error);
      // Don't clear the cart on error so the user can try again
      return undefined;
    }
  };

  const resetData = async () => {
    try {
      // Delete user and activities data with improved error handling
      await apiRequest('/api/user', {
        method: 'DELETE',
        ignoreStatuses: [401, 404] // Ignore authentication errors and not found
      });
      
      await apiRequest('/api/activities', {
        method: 'DELETE',
        ignoreStatuses: [401, 404] // Ignore authentication errors and not found
      });
      
      console.log("Server data reset complete");
    } catch (error) {
      console.error("Error resetting server data:", error);
    }
    
    // Always clear local storage regardless of API success
    localStorage.removeItem('lifechoicesUserData');
    localStorage.removeItem('lifechoicesActivities');
    localStorage.removeItem('lifechoicesCart');
    
    // Reset app state
    setUserData({
      name: '',
      username: '',
      password: '',
      age: 30,
      lifeExpectancy: 85,
      sleepHours: 8
    });
    setActivities([]);
    setActivityCart([]);
    setIsUserSetup(false);
    
    console.log("Application state reset complete");
  };
  
  const logout = async () => {
    try {
      // Call the server logout endpoint with improved error handling
      await apiRequest('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        ignoreStatuses: [401, 404] // Ignore authentication errors and not found
      });
      
      console.log("Server logout successful");
    } catch (error) {
      console.error('Error during server logout:', error);
    }
    
    // Always clear user data regardless of server response
    setUserData({
      name: '',
      username: '',
      password: '',
      age: 30,
      lifeExpectancy: 85,
      sleepHours: 8
    });
    setActivities([]);
    setIsUserSetup(false);
    
    // Clear localStorage
    localStorage.removeItem('lifechoicesUserData');
    localStorage.removeItem('lifechoicesActivities');
    
    // Note: We don't clear cart on logout so users can pick up where they left off
    console.log("Local logout completed");
  };

  return (
    <UserContext.Provider
      value={{
        isUserSetup,
        userData,
        activities,
        isAdmin,
        completeSetup,
        updateUserData,
        addActivity,
        updateActivity,
        removeActivity,
        removeMultipleActivities,
        completeActivity,
        skipActivity,
        getNextActivity,
        createSharedActivity,
        addActivitiesToCart,
        getCartActivities,
        clearCart,
        saveCartActivities,
        resetData,
        logout
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};