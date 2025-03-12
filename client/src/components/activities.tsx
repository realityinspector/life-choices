import { useState } from "react";
import { useUser } from "@/context/user-context";
import { Activity, ActivityInsert } from "@shared/schema";
import { 
  calculateLifetimeHours, 
  calculateTotalLifetimeHours, 
  calculateAllocatedPercentage,
  calculateNetLifeImpact
} from "@/lib/calculations";
import { Edit, Trash2, Clock, Plus, Check, Trash, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ActivitiesProps {
  onViewChange: (view: string) => void;
}

const colorOptions = ['red', 'yellow', 'green', 'blue', 'indigo', 'purple', 'pink'];

const Activities = ({ onViewChange }: ActivitiesProps) => {
  const { userData, activities, addActivity, updateActivity, removeActivity, removeMultipleActivities } = useUser();
  const { toast } = useToast();
  const [showAddActivityForm, setShowAddActivityForm] = useState(false);
  const [editingActivityIndex, setEditingActivityIndex] = useState<number | null>(null);
  const [isBulkDeleteMode, setIsBulkDeleteMode] = useState(false);
  const [selectedActivities, setSelectedActivities] = useState<{[id: number]: boolean}>({});
  const [currentActivity, setCurrentActivity] = useState<ActivityInsert>({
    name: '',
    category: 'Personal',
    frequency: 1,
    frequencyUnit: 'day',
    duration: 1,
    durationUnit: 'hour',
    lifeImpact: 0,
    color: 'blue'
  });

  const editActivity = (index: number) => {
    setEditingActivityIndex(index);
    // Type cast to handle frequency/duration unit conversion
    setCurrentActivity({
      ...activities[index],
      frequencyUnit: activities[index].frequencyUnit as "day" | "week" | "month" | "year",
      durationUnit: activities[index].durationUnit as "minute" | "hour"
    });
    setShowAddActivityForm(true);
  };

  const cancelActivityForm = () => {
    setShowAddActivityForm(false);
    setEditingActivityIndex(null);
    setCurrentActivity({
      name: '',
      category: 'Personal',
      frequency: 1,
      frequencyUnit: 'day',
      duration: 1,
      durationUnit: 'hour',
      lifeImpact: 0,
      color: 'blue'
    });
  };

  const saveActivity = () => {
    if (editingActivityIndex !== null) {
      updateActivity(editingActivityIndex, currentActivity);
      toast({
        title: "Activity updated",
        description: `${currentActivity.name} has been updated successfully.`,
      });
    } else {
      addActivity(currentActivity);
      toast({
        title: "Activity added",
        description: `${currentActivity.name} has been added to your activities.`,
      });
    }
    cancelActivityForm();
  };

  const handleRemoveActivity = (index: number) => {
    if (window.confirm('Are you sure you want to delete this activity?')) {
      removeActivity(index);
      toast({
        title: "Activity deleted",
        description: "The activity has been removed from your list.",
      });
    }
  };
  
  // Bulk delete helpers
  const toggleBulkDeleteMode = () => {
    setIsBulkDeleteMode(!isBulkDeleteMode);
    setSelectedActivities({});
  };
  
  const toggleActivitySelection = (activity: Activity) => {
    setSelectedActivities(prev => ({
      ...prev,
      [activity.id]: !prev[activity.id]
    }));
  };
  
  const getSelectedActivityIds = (): number[] => {
    return Object.entries(selectedActivities)
      .filter(([_, isSelected]) => isSelected)
      .map(([id, _]) => parseInt(id));
  };
  
  const handleBulkDelete = async () => {
    const selectedIds = getSelectedActivityIds();
    
    if (selectedIds.length === 0) {
      toast({
        title: "No activities selected",
        description: "Please select at least one activity to delete.",
        variant: "destructive"
      });
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} activities?`)) {
      const success = await removeMultipleActivities(selectedIds);
      
      if (success) {
        toast({
          title: "Activities deleted",
          description: `${selectedIds.length} activities have been removed from your list.`,
        });
      } else {
        toast({
          title: "Error",
          description: "There was a problem deleting the activities. Please try again.",
          variant: "destructive"
        });
      }
      
      // Exit bulk delete mode
      toggleBulkDeleteMode();
    }
  };

  const addTemplateActivity = (type: string) => {
    let template: ActivityInsert = {
      name: '',
      category: '',
      frequency: 5,
      frequencyUnit: 'day',
      duration: 8,
      durationUnit: 'hour',
      lifeImpact: 0,
      color: 'blue'
    };
    
    switch (type) {
      case 'Work':
        template = {
          name: 'Work',
          category: 'Work',
          frequency: 5,
          frequencyUnit: 'day',
          duration: 8,
          durationUnit: 'hour',
          lifeImpact: 0,
          color: 'blue'
        };
        break;
      case 'Exercise':
        template = {
          name: 'Exercise',
          category: 'Health',
          frequency: 4,
          frequencyUnit: 'week',
          duration: 45,
          durationUnit: 'minute',
          lifeImpact: 2.5,
          color: 'green'
        };
        break;
      case 'Family':
        template = {
          name: 'Family Time',
          category: 'Relationships',
          frequency: 2,
          frequencyUnit: 'day',
          duration: 2,
          durationUnit: 'hour',
          lifeImpact: 1.2,
          color: 'purple'
        };
        break;
      case 'Learning':
        template = {
          name: 'Learning',
          category: 'Learning',
          frequency: 3,
          frequencyUnit: 'week',
          duration: 1,
          durationUnit: 'hour',
          lifeImpact: 0.8,
          color: 'yellow'
        };
        break;
    }
    
    addActivity(template);
    toast({
      title: `${type} activity added`,
      description: `${template.name} has been added to your activities.`,
    });
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Activity List */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900">Your Activities</h2>
              <div className="flex space-x-2">
                {isBulkDeleteMode ? (
                  <>
                    <button 
                      onClick={handleBulkDelete} 
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <Trash className="h-5 w-5 mr-1" />
                      Delete Selected
                    </button>
                    <button 
                      onClick={toggleBulkDeleteMode} 
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <X className="h-5 w-5 mr-1" />
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={toggleBulkDeleteMode} 
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <Trash className="h-5 w-5 mr-1" />
                      Bulk Delete
                    </button>
                    <button 
                      onClick={() => setShowAddActivityForm(true)} 
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <Plus className="h-5 w-5 mr-1" />
                      Add Activity
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {/* Activity Cards - Only showing routine activities */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {activities.length > 0 ? (
                activities
                  .filter(activity => activity.frequency > 0) // Only show activities in routine (with frequency)
                  .map((activity, index) => (
                  <div key={index} className="relative bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
                    <div className={`h-2 bg-${activity.color}-500`}></div>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">{activity.name}</h3>
                        <span className="text-xs font-medium text-gray-500">{activity.category}</span>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Frequency</p>
                          <p className="font-medium text-gray-900">
                            {`${activity.frequency} ${activity.frequencyUnit}${activity.frequency > 1 ? 's' : ''}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Duration</p>
                          <p className="font-medium text-gray-900">
                            {`${activity.duration} ${activity.durationUnit}${activity.duration > 1 ? 's' : ''}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Life Impact</p>
                          <p className={`font-medium ${
                            activity.lifeImpact > 0 ? 'text-green-600' : 
                            activity.lifeImpact < 0 ? 'text-red-600' : 
                            'text-gray-600'
                          }`}>
                            {activity.lifeImpact > 0 ? `+${activity.lifeImpact} years` : 
                             activity.lifeImpact < 0 ? `${activity.lifeImpact} years` : 
                             'Neutral'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Lifetime Hours</p>
                          <p className="font-medium text-gray-900">
                            {calculateLifetimeHours(userData, activity).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex justify-end space-x-2">
                        <button 
                          onClick={() => editActivity(index)} 
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </button>
                        <button 
                          onClick={() => handleRemoveActivity(index)} 
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-12">
                  <Clock className="h-12 w-12 mx-auto text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No activities</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating a new activity.</p>
                  <div className="mt-6">
                    <button 
                      onClick={() => setShowAddActivityForm(true)} 
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Add Your First Activity
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Activity Stats */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Activity Summary</h2>
            
            <div className="space-y-4">
              {/* Total Activities */}
              <div>
                <h3 className="text-sm font-medium text-gray-500">Routine Activities</h3>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {activities.filter(activity => activity.frequency > 0).length}
                </p>
              </div>
              
              {/* Total Time Allocated */}
              <div>
                <h3 className="text-sm font-medium text-gray-500">Total Lifetime Hours</h3>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {calculateTotalLifetimeHours(
                    userData, 
                    activities.filter(activity => activity.frequency > 0)
                  ).toLocaleString()}
                </p>
                <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full" 
                    style={{ width: `${calculateAllocatedPercentage(
                      userData, 
                      activities.filter(activity => activity.frequency > 0)
                    )}%` }}
                  ></div>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {calculateAllocatedPercentage(
                    userData, 
                    activities.filter(activity => activity.frequency > 0)
                  )}% of your remaining conscious hours
                </p>
              </div>
              
              {/* Net Life Impact */}
              <div>
                <h3 className="text-sm font-medium text-gray-500">Net Life Impact</h3>
                <p className={`mt-1 text-2xl font-semibold ${
                  calculateNetLifeImpact(activities) > 0 ? 'text-green-600' : 
                  calculateNetLifeImpact(activities) < 0 ? 'text-red-600' : 
                  'text-gray-900'
                }`}>
                  {calculateNetLifeImpact(activities) > 0 ? `+${calculateNetLifeImpact(activities)} years` : 
                   calculateNetLifeImpact(activities) < 0 ? `${calculateNetLifeImpact(activities)} years` : 
                   'Neutral'}
                </p>
                <p className="mt-1 text-sm text-gray-500">Impact on life expectancy</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Add Common Activities</h2>
            
            <div className="space-y-3">
              <button 
                onClick={() => addTemplateActivity('Work')} 
                className="w-full flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <span>Work / Career</span>
              </button>
              
              <button 
                onClick={() => addTemplateActivity('Exercise')} 
                className="w-full flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <div className="h-8 w-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span>Exercise / Health</span>
              </button>
              
              <button 
                onClick={() => addTemplateActivity('Family')} 
                className="w-full flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <span>Family Time</span>
              </button>
              
              <button 
                onClick={() => addTemplateActivity('Learning')} 
                className="w-full flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <div className="h-8 w-8 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <span>Learning / Education</span>
              </button>
              
              <button 
                onClick={() => setShowAddActivityForm(true)} 
                className="w-full flex items-center justify-center px-4 py-2 border border-dashed border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <Plus className="h-5 w-5 mr-2" />
                <span>Custom Activity</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add/Edit Activity Form Modal */}
      {(showAddActivityForm || editingActivityIndex !== null) && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
              onClick={cancelActivityForm}
            ></div>
            
            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  {editingActivityIndex !== null ? 'Edit Activity' : 'Add New Activity'}
                </h3>
                
                <form onSubmit={(e) => { e.preventDefault(); saveActivity(); }}>
                  <div className="space-y-4">
                    {/* Activity Name */}
                    <div>
                      <label htmlFor="activityName" className="block text-sm font-medium text-gray-700">Activity Name</label>
                      <input 
                        type="text" 
                        id="activityName" 
                        value={currentActivity.name}
                        onChange={(e) => setCurrentActivity({...currentActivity, name: e.target.value})}
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" 
                        required 
                      />
                    </div>
                    
                    {/* Category */}
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
                      <select 
                        id="category" 
                        value={currentActivity.category}
                        onChange={(e) => setCurrentActivity({...currentActivity, category: e.target.value})}
                        className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      >
                        <option value="Work">Work</option>
                        <option value="Health">Health</option>
                        <option value="Relationships">Relationships</option>
                        <option value="Learning">Learning</option>
                        <option value="Leisure">Leisure</option>
                        <option value="Personal">Personal</option>
                      </select>
                    </div>
                    
                    {/* Frequency */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="frequency" className="block text-sm font-medium text-gray-700">Frequency</label>
                        <input 
                          type="number" 
                          id="frequency" 
                          value={currentActivity.frequency}
                          onChange={(e) => setCurrentActivity({...currentActivity, frequency: parseInt(e.target.value)})}
                          min="1" 
                          className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" 
                          required 
                        />
                      </div>
                      <div>
                        <label htmlFor="frequencyUnit" className="block text-sm font-medium text-gray-700">Unit</label>
                        <select 
                          id="frequencyUnit" 
                          value={currentActivity.frequencyUnit}
                          onChange={(e) => setCurrentActivity({...currentActivity, frequencyUnit: e.target.value as 'day' | 'week' | 'month' | 'year'})}
                          className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        >
                          <option value="day">Day</option>
                          <option value="week">Week</option>
                          <option value="month">Month</option>
                          <option value="year">Year</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Duration */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="duration" className="block text-sm font-medium text-gray-700">Duration</label>
                        <input 
                          type="number" 
                          id="duration" 
                          value={currentActivity.duration}
                          onChange={(e) => setCurrentActivity({...currentActivity, duration: parseInt(e.target.value)})}
                          min="1" 
                          className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" 
                          required 
                        />
                      </div>
                      <div>
                        <label htmlFor="durationUnit" className="block text-sm font-medium text-gray-700">Unit</label>
                        <select 
                          id="durationUnit" 
                          value={currentActivity.durationUnit}
                          onChange={(e) => setCurrentActivity({...currentActivity, durationUnit: e.target.value as 'minute' | 'hour'})}
                          className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        >
                          <option value="minute">Minute</option>
                          <option value="hour">Hour</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Life Impact */}
                    <div>
                      <label htmlFor="lifeImpact" className="block text-sm font-medium text-gray-700">Life Impact (years)</label>
                      <input 
                        type="number" 
                        id="lifeImpact" 
                        value={currentActivity.lifeImpact}
                        onChange={(e) => setCurrentActivity({...currentActivity, lifeImpact: parseFloat(e.target.value)})}
                        step="0.1" 
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" 
                      />
                      <p className="mt-1 text-xs text-gray-500">Estimated impact on life expectancy (positive extends, negative reduces)</p>
                    </div>
                    
                    {/* Color */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Color</label>
                      <div className="mt-1 grid grid-cols-7 gap-2">
                        {colorOptions.map(color => (
                          <button 
                            key={color}
                            type="button" 
                            onClick={() => setCurrentActivity({...currentActivity, color})}
                            className={`h-8 w-8 rounded-full bg-${color}-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${color}-500 ${currentActivity.color === color ? 'ring-2 ring-offset-2 ring-gray-500' : ''}`}
                          ></button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-end space-x-3">
                    <button 
                      type="button" 
                      onClick={cancelActivityForm}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Save Activity
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Activities;
