import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { UserData, Activity, ActivityInsert } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface UserContextType {
  isUserSetup: boolean;
  userData: UserData;
  activities: Activity[];
  completeSetup: (userData: UserData) => void;
  updateUserData: (userData: UserData) => void;
  addActivity: (activity: ActivityInsert) => void;
  updateActivity: (index: number, activity: ActivityInsert) => void;
  removeActivity: (index: number) => void;
  resetData: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [isUserSetup, setIsUserSetup] = useState(false);
  const [userData, setUserData] = useState<UserData>({
    name: '',
    age: 30,
    lifeExpectancy: 85,
    sleepHours: 8
  });
  const [activities, setActivities] = useState<Activity[]>([]);

  // Load data from localStorage and API on initial render
  useEffect(() => {
    const loadData = async () => {
      try {
        // First try to get user data from API
        const userDataResponse = await apiRequest('GET', '/api/user', undefined);
        const userData = await userDataResponse.json();
        
        if (userData) {
          setUserData(userData);
          setIsUserSetup(true);
          
          // Then get activities
          const activitiesResponse = await apiRequest('GET', '/api/activities', undefined);
          const activities = await activitiesResponse.json();
          setActivities(activities);
        }
      } catch (error) {
        // Fallback to localStorage if API fails
        const savedUserData = localStorage.getItem('sundialUserData');
        const savedActivities = localStorage.getItem('sundialActivities');
        
        if (savedUserData) {
          setUserData(JSON.parse(savedUserData));
          setIsUserSetup(true);
        }
        
        if (savedActivities) {
          setActivities(JSON.parse(savedActivities));
        }
      }
    };
    
    loadData();
  }, []);

  const completeSetup = async (newUserData: UserData) => {
    setUserData(newUserData);
    setIsUserSetup(true);
    
    try {
      await apiRequest('POST', '/api/user', newUserData);
    } catch (error) {
      // Fallback to localStorage if API fails
      localStorage.setItem('sundialUserData', JSON.stringify(newUserData));
    }
  };

  const updateUserData = async (newUserData: UserData) => {
    setUserData(newUserData);
    
    try {
      await apiRequest('PUT', '/api/user', newUserData);
    } catch (error) {
      // Fallback to localStorage if API fails
      localStorage.setItem('sundialUserData', JSON.stringify(newUserData));
    }
  };

  const addActivity = async (activity: ActivityInsert) => {
    try {
      const response = await apiRequest('POST', '/api/activities', activity);
      const newActivity = await response.json();
      setActivities([...activities, newActivity]);
    } catch (error) {
      // Generate a unique ID and fallback to localStorage
      const newActivity = {
        ...activity,
        id: activities.length > 0 ? Math.max(...activities.map(a => a.id || 0)) + 1 : 1
      };
      const updatedActivities = [...activities, newActivity];
      setActivities(updatedActivities);
      localStorage.setItem('sundialActivities', JSON.stringify(updatedActivities));
    }
  };

  const updateActivity = async (index: number, activity: ActivityInsert) => {
    const activityToUpdate = activities[index];
    const updatedActivity = { ...activity, id: activityToUpdate.id };
    
    try {
      await apiRequest('PUT', `/api/activities/${activityToUpdate.id}`, updatedActivity);
      const updatedActivities = [...activities];
      updatedActivities[index] = updatedActivity;
      setActivities(updatedActivities);
    } catch (error) {
      // Fallback to localStorage if API fails
      const updatedActivities = [...activities];
      updatedActivities[index] = updatedActivity;
      setActivities(updatedActivities);
      localStorage.setItem('sundialActivities', JSON.stringify(updatedActivities));
    }
  };

  const removeActivity = async (index: number) => {
    const activityToRemove = activities[index];
    
    try {
      await apiRequest('DELETE', `/api/activities/${activityToRemove.id}`, undefined);
      const updatedActivities = activities.filter((_, i) => i !== index);
      setActivities(updatedActivities);
    } catch (error) {
      // Fallback to localStorage if API fails
      const updatedActivities = activities.filter((_, i) => i !== index);
      setActivities(updatedActivities);
      localStorage.setItem('sundialActivities', JSON.stringify(updatedActivities));
    }
  };

  const resetData = async () => {
    try {
      await apiRequest('DELETE', '/api/user', undefined);
      await apiRequest('DELETE', '/api/activities', undefined);
    } catch (error) {
      // Fallback to localStorage if API fails
      localStorage.removeItem('sundialUserData');
      localStorage.removeItem('sundialActivities');
    }
    
    setUserData({
      name: '',
      age: 30,
      lifeExpectancy: 85,
      sleepHours: 8
    });
    setActivities([]);
    setIsUserSetup(false);
  };

  return (
    <UserContext.Provider value={{
      isUserSetup,
      userData,
      activities,
      completeSetup,
      updateUserData,
      addActivity,
      updateActivity,
      removeActivity,
      resetData
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
