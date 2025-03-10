import { useState, useEffect } from "react";
import { useUser } from "@/context/user-context";
import { Activity } from "@shared/schema";
import { 
  ChevronRight, 
  Clock, 
  Plus, 
  BarChart, 
  User, 
  ShoppingBag, 
  Calendar, 
  BarChart2, 
  CheckCircle2,
  ListChecks,
  AlertCircle
} from "lucide-react";

interface DashboardProps {
  onViewChange: (view: string) => void;
}

const Dashboard = ({ onViewChange }: DashboardProps) => {
  const { userData, activities, getNextActivity, completeActivity } = useUser();
  const [nextActivity, setNextActivity] = useState<Activity | null>(null);
  
  // Fetch the next activity when component loads
  useEffect(() => {
    getNextActivity().then(activity => {
      if (activity) {
        setNextActivity(activity);
      }
    });
  }, []);
  
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-8">
        {/* Left Column - Next Activity */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <CheckCircle2 className="mr-2 h-5 w-5 text-teal-600" />
              What's Next?
            </h2>
            
            {/* Next Activity Card */}
            <div className="bg-teal-50 rounded-lg p-6 border border-teal-100 shadow-sm">
              {nextActivity ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{nextActivity.name}</h3>
                      <p className="text-sm text-gray-500">{nextActivity.category}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        className="p-2 rounded-full bg-teal-100 text-teal-600 hover:bg-teal-200"
                        onClick={() => {
                          if (nextActivity) {
                            // Complete the activity and get the next one
                            completeActivity(nextActivity.id);
                            getNextActivity().then(activity => {
                              if (activity) {
                                setNextActivity(activity);
                              } else {
                                setNextActivity(null);
                              }
                            });
                          }
                        }}
                      >
                        <CheckCircle2 size={24} />
                      </button>
                      <button 
                        className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                        onClick={() => {
                          // Skip to next activity
                          getNextActivity().then(activity => {
                            if (activity) {
                              setNextActivity(activity);
                            } else {
                              setNextActivity(null);
                            }
                          });
                        }}
                      >
                        <ChevronRight size={24} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-teal-700" />
                      <span>{nextActivity.duration} {nextActivity.durationUnit}{nextActivity.duration > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1 text-teal-700" />
                      <span>Every {nextActivity.frequency} {nextActivity.frequencyUnit}{nextActivity.frequency > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto h-12 w-12 text-teal-600 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No activities scheduled</h3>
                  <p className="text-gray-500 mb-4">Add activities to get started with your daily routine.</p>
                  <button 
                    onClick={() => onViewChange('activities')} 
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                  >
                    <Plus className="-ml-1 mr-2 h-5 w-5" />
                    Add Activity
                  </button>
                </div>
              )}
            </div>
            
            {/* Activity Categories */}
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Activity Categories</h3>
              <div className="flex flex-wrap gap-2">
                <div className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm">All</div>
                <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">Work</div>
                <div className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">Personal</div>
                <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">Health</div>
                <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">Learning</div>
                <div className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">Relationships</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Column - Stats & Quick Actions */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-6 mb-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <ListChecks className="mr-2 h-5 w-5 text-teal-600" />
              Activity Stats
            </h2>
            
            <div className="space-y-4">
              {/* Total Activities */}
              <div>
                <h3 className="text-sm font-medium text-gray-500">Total Activities</h3>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {activities.length}
                </p>
                <p className="text-sm text-gray-500">Activities in your routine</p>
              </div>
              
              {/* Activities by Category */}
              <div>
                <h3 className="text-sm font-medium text-gray-500">Categories</h3>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {new Set(activities.map(a => a.category)).size}
                </p>
                <p className="text-sm text-gray-500">Different activity types</p>
              </div>
              
              {/* Activity Balance */}
              <div>
                <h3 className="text-sm font-medium text-gray-500">Positive Impact</h3>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {activities.filter(a => a.lifeImpact && a.lifeImpact > 0).length}
                </p>
                <p className="text-sm text-gray-500">Activities with positive impact</p>
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
                onClick={() => onViewChange('shop-activities')} 
                className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <span>Shop Activities</span>
                <ShoppingBag className="h-5 w-5 text-gray-400" />
              </button>
              
              <button 
                onClick={() => onViewChange('life-events')} 
                className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <span>Browse Life Events</span>
                <Calendar className="h-5 w-5 text-gray-400" />
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
              
              <button 
                onClick={() => onViewChange('analytics')} 
                className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <span>View Analytics</span>
                <BarChart2 className="h-5 w-5 text-gray-400" />
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
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Estimate</th>
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
                          {Math.round(activity.duration * (activity.frequency * 52) / 60)} hours/year
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {activity.lifeImpact > 0 ? (
                          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                            <span>Positive</span>
                          </div>
                        ) : activity.lifeImpact < 0 ? (
                          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                            <span>Negative</span>
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
