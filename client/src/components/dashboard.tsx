import { useState } from "react";
import SundialChart from "./ui/sundial-chart";
import { useUser } from "@/context/user-context";
import { 
  calculatePercentageLived, 
  calculateTotalBCH, 
  calculateRemainingBCH, 
  formatTimeToBCH,
  calculateAllocatedPercentage,
  calculateLifetimeHours
} from "@/lib/calculations";
import { Activity } from "@shared/schema";
import { ChevronRight, Clock, Plus, BarChart, User } from "lucide-react";

interface DashboardProps {
  onViewChange: (view: string) => void;
}

const Dashboard = ({ onViewChange }: DashboardProps) => {
  const { userData, activities } = useUser();
  
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-8">
        {/* Left Column - Sundial Visualization */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Your Life Sundial</h2>
            
            {/* Sundial Visualization */}
            <SundialChart />
            
            {/* Legend */}
            <div className="mt-6 grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <div className="text-lg font-semibold text-gray-900">{userData.age}</div>
                <div className="text-gray-500">Current Age</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">{calculatePercentageLived(userData)}%</div>
                <div className="text-gray-500">Life Completed</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">{userData.lifeExpectancy - userData.age}</div>
                <div className="text-gray-500">Years Remaining</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Column - Stats */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-6 mb-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Time Allocation</h2>
            
            <div className="space-y-4">
              {/* BCH Stats */}
              <div>
                <h3 className="text-sm font-medium text-gray-500">Budget of Conscious Hours (BCH)</h3>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {formatTimeToBCH(calculateTotalBCH(userData))}
                </p>
                <p className="text-sm text-gray-500">Total waking hours in your life</p>
              </div>
              
              {/* Remaining BCH */}
              <div>
                <h3 className="text-sm font-medium text-gray-500">Remaining BCH</h3>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {formatTimeToBCH(calculateRemainingBCH(userData))}
                </p>
                <p className="text-sm text-gray-500">Waking hours left in your life</p>
              </div>
              
              {/* Allocated Time */}
              <div>
                <h3 className="text-sm font-medium text-gray-500">Allocated to Activities</h3>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {calculateAllocatedPercentage(userData, activities)}%
                </p>
                <p className="text-sm text-gray-500">Of your remaining time</p>
              </div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
            
            <div className="space-y-3">
              <button 
                onClick={() => onViewChange('activities')} 
                className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <span>Add New Activity</span>
                <Plus className="h-5 w-5 text-gray-400" />
              </button>
              
              <button 
                onClick={() => onViewChange('projections')} 
                className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <span>View Time Projections</span>
                <BarChart className="h-5 w-5 text-gray-400" />
              </button>
              
              <button 
                onClick={() => onViewChange('profile')} 
                className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <span>Update Profile</span>
                <User className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Activity Overview */}
      <div className="mt-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Your Activities</h2>
            <button 
              onClick={() => onViewChange('activities')} 
              className="text-sm text-primary-600 hover:text-primary-800 flex items-center"
            >
              View All
              <ChevronRight className="ml-1 h-4 w-4" />
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lifetime Hours</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Life Impact</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activities.length > 0 ? (
                  activities.slice(0, 3).map((activity, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center bg-${activity.color}-100 text-${activity.color}-600`}>
                            <Clock className="h-4 w-4" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{activity.name}</div>
                            <div className="text-sm text-gray-500">{activity.category}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {`${activity.frequency} ${activity.frequencyUnit}${activity.frequency > 1 ? 's' : ''}`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {`${activity.duration} ${activity.durationUnit}${activity.duration > 1 ? 's' : ''}`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {calculateLifetimeHours(userData, activity)} hours
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {activity.lifeImpact > 0 ? (
                          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                            <span>{`+${activity.lifeImpact} years`}</span>
                          </div>
                        ) : activity.lifeImpact < 0 ? (
                          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                            <span>{`${activity.lifeImpact} years`}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Neutral
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      No activities added yet. <button onClick={() => onViewChange('activities')} className="text-primary-600 hover:text-primary-800">Add your first activity</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
