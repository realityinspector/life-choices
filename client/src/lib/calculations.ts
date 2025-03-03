import { UserData, Activity } from "@shared/schema";

// Calculate percentage of life lived
export const calculatePercentageLived = (userData: UserData): number => {
  const totalLifespan = userData.lifeExpectancy;
  const lived = userData.age;
  const percentage = (lived / totalLifespan) * 100;
  return parseFloat(percentage.toFixed(1));
};

// Format the sundial time (map life percentage to a 12-hour clock, 6am to 6pm)
export const formatSundialTime = (userData: UserData): string => {
  const percentLived = calculatePercentageLived(userData) / 100;
  
  // Map to a 12-hour clock (6am to 6pm)
  const totalMinutes = 6 * 60 + percentLived * 12 * 60; // 6am + percentage of 12 hours
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

// Calculate total Budget of Conscious Hours (BCH)
export const calculateTotalBCH = (userData: UserData): number => {
  // Total life in hours minus sleep time
  const totalLife = userData.lifeExpectancy * 365 * 24;
  const totalSleep = userData.lifeExpectancy * 365 * userData.sleepHours;
  return totalLife - totalSleep;
};

// Calculate used BCH
export const calculateUsedBCH = (userData: UserData): number => {
  // Used life in hours minus sleep time
  const usedLife = userData.age * 365 * 24;
  const usedSleep = userData.age * 365 * userData.sleepHours;
  return usedLife - usedSleep;
};

// Calculate remaining BCH
export const calculateRemainingBCH = (userData: UserData): number => {
  return calculateTotalBCH(userData) - calculateUsedBCH(userData);
};

// Format time to BCH display format
export const formatTimeToBCH = (hours: number): string => {
  const formattedHours = Math.floor(hours).toLocaleString();
  return `${formattedHours} hours`;
};

// Calculate lifetime hours for a specific activity
export const calculateLifetimeHours = (userData: UserData, activity: Activity): number => {
  let hoursPerYear = 0;
  
  // Convert duration to hours
  const durationInHours = activity.durationUnit === 'hour' 
    ? activity.duration 
    : activity.duration / 60;
  
  // Calculate frequency per year
  switch (activity.frequencyUnit) {
    case 'day':
      hoursPerYear = durationInHours * activity.frequency * 365;
      break;
    case 'week':
      hoursPerYear = durationInHours * activity.frequency * 52;
      break;
    case 'month':
      hoursPerYear = durationInHours * activity.frequency * 12;
      break;
    case 'year':
      hoursPerYear = durationInHours * activity.frequency;
      break;
  }
  
  // Calculate for remaining lifespan
  const remainingYears = userData.lifeExpectancy - userData.age;
  return Math.round(hoursPerYear * remainingYears);
};

// Calculate total lifetime hours across all activities
export const calculateTotalLifetimeHours = (userData: UserData, activities: Activity[]): number => {
  return activities.reduce((total, activity) => {
    return total + calculateLifetimeHours(userData, activity);
  }, 0);
};

// Calculate allocated percentage of remaining conscious hours
export const calculateAllocatedPercentage = (userData: UserData, activities: Activity[]): number => {
  const totalActivityHours = calculateTotalLifetimeHours(userData, activities);
  const remainingBCH = calculateRemainingBCH(userData);
  const percentage = (totalActivityHours / remainingBCH) * 100;
  return Math.min(parseFloat(percentage.toFixed(1)), 100);
};

// Calculate net life impact from all activities
export const calculateNetLifeImpact = (activities: Activity[]): number => {
  const impact = activities.reduce((total, activity) => {
    return total + activity.lifeImpact;
  }, 0);
  return parseFloat(impact.toFixed(1));
};

// Calculate used BCH by a specific age
export const calculateUsedBCHByAge = (age: number, userData: UserData): number => {
  // Used life in hours minus sleep time for a given age
  const usedLife = age * 365 * 24;
  const usedSleep = age * 365 * userData.sleepHours;
  return usedLife - usedSleep;
};

// Calculate remaining BCH by a specific age
export const calculateRemainingBCHByAge = (age: number, userData: UserData): number => {
  return calculateTotalBCH(userData) - calculateUsedBCHByAge(age, userData);
};

// Calculate projected life percentage at a specific age
export const calculateProjectedLifePercentage = (age: number, lifeExpectancy: number): number => {
  const percentage = (age / lifeExpectancy) * 100;
  return parseFloat(percentage.toFixed(1));
};

// Calculate projected activity hours at a specific age
export const calculateProjectedActivityHours = (activity: Activity, targetAge: number, userData: UserData): number => {
  let hoursPerYear = 0;
  
  // Convert to hours
  const durationInHours = activity.durationUnit === 'hour' 
    ? activity.duration 
    : activity.duration / 60;
  
  // Calculate frequency per year
  switch (activity.frequencyUnit) {
    case 'day':
      hoursPerYear = durationInHours * activity.frequency * 365;
      break;
    case 'week':
      hoursPerYear = durationInHours * activity.frequency * 52;
      break;
    case 'month':
      hoursPerYear = durationInHours * activity.frequency * 12;
      break;
    case 'year':
      hoursPerYear = durationInHours * activity.frequency;
      break;
  }
  
  // Calculate up to target age
  const yearsFromNow = targetAge - userData.age;
  return Math.round(hoursPerYear * Math.max(0, yearsFromNow));
};

// Calculate projected activity percentage at a specific age
export const calculateProjectedActivityPercentage = (activity: Activity, targetAge: number, userData: UserData): number => {
  const activityHours = calculateProjectedActivityHours(activity, targetAge, userData);
  const totalBCH = calculateUsedBCHByAge(targetAge, userData) - calculateUsedBCH(userData);
  if (totalBCH <= 0) return 0;
  
  const percentage = (activityHours / totalBCH) * 100;
  return parseFloat(percentage.toFixed(1));
};

// Calculate total projected percentage at a specific age
export const calculateTotalProjectedPercentage = (activities: Activity[], targetAge: number, userData: UserData): number => {
  const percentage = activities.reduce((total, activity) => {
    return total + calculateProjectedActivityPercentage(activity, targetAge, userData);
  }, 0);
  return parseFloat(percentage.toFixed(1));
};

// Calculate projected life impact at a specific age
export const calculateProjectedLifeImpact = (activities: Activity[], targetAge: number, userData: UserData): number => {
  // Simple proportional calculation
  const fullImpact = calculateNetLifeImpact(activities);
  const ageSpan = userData.lifeExpectancy - userData.age;
  const targetSpan = targetAge - userData.age;
  if (ageSpan <= 0) return 0;
  
  const proportion = targetSpan / ageSpan;
  return parseFloat((fullImpact * proportion).toFixed(1));
};
