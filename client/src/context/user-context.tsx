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
  addActivity: (activity: ActivityInsert) => void;
  updateActivity: (index: number, activity: ActivityInsert) => void;
  removeActivity: (index: number) => void;
  removeMultipleActivities: (activityIds: number[]) => Promise<boolean>;
  completeActivity: (id: number) => void;
  skipActivity: (id: number) => Promise<Activity | undefined>;
  getNextActivity: () => Promise<Activity | undefined>;
  createSharedActivity: (activity: ActivityInsert, recipientEmail: string) => Promise<string>;
  addActivitiesToCart: (activities: ActivityInsert[]) => void;
  getCartActivities: () => ActivityInsert[];
  clearCart: () => void;
  saveCartActivities: () => Promise<void>;
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
        // First try to get user data from API with credentials
        const userDataResponse = await fetch('/api/user', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (userDataResponse.ok) {
          const userData = await userDataResponse.json();
          
          if (userData) {
            setUserData(userData);
            setIsUserSetup(true);
            
            // Then get activities
            const activitiesResponse = await fetch('/api/activities', {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            if (activitiesResponse.ok) {
              const activities = await activitiesResponse.json();
              setActivities(activities);
            }
            
            // Check if user is admin
            try {
              const adminCheckResponse = await fetch('/api/user/admin-check', {
                method: 'GET',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json'
                }
              });
              
              if (adminCheckResponse.ok) {
                const { isAdmin: adminStatus } = await adminCheckResponse.json();
                setIsAdmin(adminStatus);
              }
            } catch (error) {
              console.error('Error checking admin status:', error);
            }
            
            // Load cart from localStorage (cart is client-side only)
            const savedCart = localStorage.getItem('lifechoicesCart');
            if (savedCart) {
              setActivityCart(JSON.parse(savedCart));
            }
          }
        } else {
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

  const addActivity = async (activity: ActivityInsert) => {
    try {
      const response = await apiRequest('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activity)
      });
      const newActivity = await response.json();
      setActivities([...activities, newActivity]);
    } catch (error) {
      // Generate a unique ID and fallback to localStorage
      const newActivity = {
        ...activity,
        id: activities.length > 0 ? Math.max(...activities.map(a => a.id || 0)) + 1 : 1,
        userId: 1 // Placeholder for local storage
      } as Activity;
      const updatedActivities = [...activities, newActivity];
      setActivities(updatedActivities);
      localStorage.setItem('lifechoicesActivities', JSON.stringify(updatedActivities));
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
  
  const removeMultipleActivities = async (activityIds: number[]) => {
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

  const completeActivity = async (id: number) => {
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
      if (activityIndex === -1) return;
      
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
  
  const skipActivity = async (id: number) => {
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
      if (activityIndex === -1) return;
      
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

  const getNextActivity = async (): Promise<Activity | undefined> => {
    try {
      const response = await apiRequest('/api/activities/next');
      return await response.json();
    } catch (error) {
      // Fallback to client-side logic for determining next activity
      const now = new Date();
      
      // Filter activities that are due now or past due
      // Sort activities by priority and due date
      const sortedActivities = [...activities]
        .filter(a => {
          // Only include activities that are:
          // 1. Due now or in the past (nextDue <= current date), or
          // 2. Don't have a nextDue date set
          if (!a.nextDue) return true;
          const dueDate = new Date(a.nextDue);
          return dueDate <= now;
        })
        .sort((a, b) => {
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
        })
      });
      const result = await response.json();
      return result.invitationToken;
    } catch (error) {
      // Generate a fake token for demo purposes
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

  const saveCartActivities = async () => {
    // Add all activities in the cart to the user's activities
    for (const activity of activityCart) {
      await addActivity(activity);
    }
    clearCart();
  };

  const resetData = async () => {
    try {
      await apiRequest('/api/user', {
        method: 'DELETE'
      });
      await apiRequest('/api/activities', {
        method: 'DELETE'
      });
    } catch (error) {
      // Fallback to localStorage if API fails
      localStorage.removeItem('lifechoicesUserData');
      localStorage.removeItem('lifechoicesActivities');
      localStorage.removeItem('lifechoicesCart');
    }
    
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
  };
  
  const logout = async () => {
    try {
      // Call the server logout endpoint
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Clear the user data regardless of server response
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
      
      // Keep cart data (optional - can be cleared too if needed)
      
      // Remove any localStorage data that might have been used as fallback
      localStorage.removeItem('lifechoicesUserData');
      localStorage.removeItem('lifechoicesActivities');
    } catch (error) {
      console.error('Logout error:', error);
      
      // Still clear client-side state even if API fails
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
      
      // Remove localStorage data
      localStorage.removeItem('lifechoicesUserData');
      localStorage.removeItem('lifechoicesActivities');
    }
  };

  return (
    <UserContext.Provider value={{
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
    }}>
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
