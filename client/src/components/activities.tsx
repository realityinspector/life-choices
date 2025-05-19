import React, { useState } from 'react';
import { 
  Clock, 
  Plus, 
  Edit, 
  Trash2, 
  Trash, 
  X, 
  Check, 
  Maximize, 
  Minimize 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { calculateLifetimeHours } from '@/lib/calculations';
import { ActivityInsert, Activity, UserData } from 'shared/schema';
import { useUser } from '@/context/user-context';

interface ActivitiesProps {
  onViewChange: (view: string) => void;
}

const Activities = ({ onViewChange }: ActivitiesProps) => {
  const { toast } = useToast();
  const { 
    userData, 
    activities, 
    addActivity, 
    updateActivity, 
    removeActivity,
    removeMultipleActivities
  } = useUser();

  const [showAddActivityForm, setShowAddActivityForm] = useState(false);
  const [editingActivityIndex, setEditingActivityIndex] = useState<number | null>(null);
  const [activityFormData, setActivityFormData] = useState<ActivityInsert>({
    name: '',
    category: '',
    frequency: 1,
    frequencyUnit: 'day',
    duration: 1,
    durationUnit: 'hour',
    lifeImpact: 0,
    color: 'blue',
  });
  const [isBulkDeleteMode, setIsBulkDeleteMode] = useState(false);
  const [selectedActivities, setSelectedActivities] = useState<{[key: number]: boolean}>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'frequency' || name === 'duration' || name === 'lifeImpact') {
      setActivityFormData({
        ...activityFormData,
        [name]: parseFloat(value),
      });
    } else {
      setActivityFormData({
        ...activityFormData,
        [name]: value,
      });
    }
  };

  const handleAddActivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!activityFormData.name || !activityFormData.category) {
      toast({
        title: "Missing information",
        description: "Please provide a name and category for your activity.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Store the name before we reset the form
      const activityName = activityFormData.name;
      
      // Wait for the activity to be added
      await addActivity(activityFormData);
      
      // Reset form after successful addition
      setActivityFormData({
        name: '',
        category: '',
        frequency: 1,
        frequencyUnit: 'day',
        duration: 1,
        durationUnit: 'hour',
        lifeImpact: 0,
        color: 'blue',
      });
      setShowAddActivityForm(false);
      
      toast({
        title: "Activity added",
        description: `${activityName} has been added to your activities.`,
      });
    } catch (error) {
      console.error("Error in handle add activity:", error);
      toast({
        title: "Error adding activity",
        description: "There was a problem adding your activity. Please try again.",
        variant: "destructive"
      });
    }
  };

  const editActivity = (index: number) => {
    const activity = activities[index];
    setActivityFormData({
      name: activity.name,
      category: activity.category,
      frequency: activity.frequency,
      frequencyUnit: activity.frequencyUnit as 'day' | 'week' | 'month' | 'year',
      duration: activity.duration,
      durationUnit: activity.durationUnit as 'minute' | 'hour',
      lifeImpact: activity.lifeImpact,
      color: activity.color,
    });
    setEditingActivityIndex(index);
    setShowAddActivityForm(true);
  };

  const handleUpdateActivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingActivityIndex === null) return;
    
    if (!activityFormData.name || !activityFormData.category) {
      toast({
        title: "Missing information",
        description: "Please provide a name and category for your activity.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Store the name before we reset the form
      const activityName = activityFormData.name;
      
      // Wait for the activity to be updated
      await updateActivity(editingActivityIndex, activityFormData);
      
      // Reset form after successful update
      setActivityFormData({
        name: '',
        category: '',
        frequency: 1,
        frequencyUnit: 'day',
        duration: 1,
        durationUnit: 'hour',
        lifeImpact: 0,
        color: 'blue',
      });
      setShowAddActivityForm(false);
      setEditingActivityIndex(null);
      
      toast({
        title: "Activity updated",
        description: `${activityName} has been updated.`,
      });
    } catch (error) {
      console.error("Error in handle update activity:", error);
      toast({
        title: "Error updating activity",
        description: "There was a problem updating your activity. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRemoveActivity = async (index: number) => {
    if (window.confirm('Are you sure you want to delete this activity?')) {
      try {
        const activityName = activities[index].name;
        await removeActivity(index);
        
        toast({
          title: "Activity deleted",
          description: `${activityName} has been removed from your activities.`,
        });
      } catch (error) {
        console.error("Error removing activity:", error);
        toast({
          title: "Error deleting activity",
          description: "There was a problem deleting the activity. Please try again.",
          variant: "destructive"
        });
      }
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
  
  const selectAllActivities = () => {
    const routineActivities = activities.filter(activity => activity.frequency > 0);
    const newSelection = { ...selectedActivities };
    
    routineActivities.forEach(activity => {
      newSelection[activity.id] = true;
    });
    
    setSelectedActivities(newSelection);
  };
  
  const deselectAllActivities = () => {
    setSelectedActivities({});
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

  const addTemplateActivity = async (type: string) => {
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
    
    try {
      await addActivity(template);
      toast({
        title: `${type} activity added`,
        description: `${template.name} has been added to your activities.`,
      });
    } catch (error) {
      console.error("Error adding template activity:", error);
      toast({
        title: "Error adding activity",
        description: "There was a problem adding the activity template. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="grid grid-cols-1 gap-6">
        {/* Activity List */}
        <div>
          <div className="bg-white shadow rounded-lg p-6">
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <h2 className="text-lg font-medium text-gray-900">Your Activities</h2>
                  {isBulkDeleteMode && (
                  <>
                    <div className="ml-3 px-2 py-1 bg-gray-100 rounded-md text-sm font-medium text-gray-600">
                      {getSelectedActivityIds().length} selected
                    </div>
                    <div className="ml-3 flex space-x-2">
                      <button 
                        onClick={selectAllActivities}
                        className="text-xs text-primary-600 hover:text-primary-900 font-medium"
                      >
                        Select All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button 
                        onClick={deselectAllActivities}
                        className="text-xs text-gray-600 hover:text-gray-900 font-medium"
                      >
                        Deselect All
                      </button>
                    </div>
                  </>
                )}
              </div>
              <div className="flex space-x-2">
                {isBulkDeleteMode ? (
                  <>
                    <button 
                      onClick={handleBulkDelete} 
                      className={`inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                        getSelectedActivityIds().length > 0 
                          ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                          : 'bg-gray-400 cursor-not-allowed'
                      } focus:outline-none focus:ring-2 focus:ring-offset-2`}
                      disabled={getSelectedActivityIds().length === 0}
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

            {/* Filters and Sort Controls */}
            <div className="flex flex-wrap gap-4 items-center">
              <select 
                className="border border-gray-300 rounded-md text-sm p-2"
                onChange={(e) => setSelectedCategory(e.target.value)}
                value={selectedCategory || ''}
              >
                <option value="">All Categories</option>
                {Array.from(new Set(activities.map(a => a.category))).sort().map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                className="border border-gray-300 rounded-md text-sm p-2"
                onChange={(e) => setSortBy(e.target.value)}
                value={sortBy}
              >
                <option value="name">Sort by Name</option>
                <option value="lifeImpact">Sort by Life Impact</option>
                <option value="frequency">Sort by Frequency</option>
                <option value="duration">Sort by Duration</option>
              </select>

              <button
                onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                {sortDirection === 'asc' ? '↑' : '↓'}
              </button>
            </div>
            
            {/* Activity Cards - Only showing routine activities */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activities.length > 0 ? (
                activities
                  .filter(activity => activity.frequency > 0) // Only show activities in routine (with frequency)
                  .filter(activity => !selectedCategory || activity.category === selectedCategory)
                  .sort((a, b) => {
                    let comparison = 0;
                    switch (sortBy) {
                      case 'name':
                        comparison = a.name.localeCompare(b.name);
                        break;
                      case 'lifeImpact':
                        comparison = (a.lifeImpact || 0) - (b.lifeImpact || 0);
                        break;
                      case 'frequency':
                        comparison = a.frequency - b.frequency;
                        break;
                      case 'duration':
                        comparison = a.duration - b.duration;
                        break;
                    }
                    return sortDirection === 'asc' ? comparison : -comparison;
                  })
                  .map((activity, index) => (
                    <div key={index} className={`relative bg-white border ${selectedActivities[activity.id] ? 'border-primary-500 ring-2 ring-primary-500' : 'border-gray-200'} rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200`}>
                      <div className={`h-2 bg-${activity.color}-500`}></div>
                    {isBulkDeleteMode && (
                      <div className="absolute top-3 left-3 z-10">
                        <div 
                          onClick={() => toggleActivitySelection(activity)}
                          className={`h-6 w-6 rounded-md border-2 flex items-center justify-center cursor-pointer ${
                            selectedActivities[activity.id] 
                              ? 'bg-primary-500 border-primary-600 text-white' 
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          {selectedActivities[activity.id] && <Check className="h-4 w-4" />}
                        </div>
                      </div>
                    )} 
                          onClick={() => toggleActivitySelection(activity)}
                          className={`h-6 w-6 rounded-md border-2 flex items-center justify-center cursor-pointer ${
                            selectedActivities[activity.id] 
                              ? 'bg-primary-500 border-primary-600 text-white' 
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          {selectedActivities[activity.id] && <Check className="h-4 w-4" />}
                        </div>
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <h3 className={`text-lg font-medium text-gray-900 ${isBulkDeleteMode ? 'ml-6' : ''}`}>{activity.name}</h3>
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
                        {isBulkDeleteMode ? (
                          <button 
                            onClick={() => toggleActivitySelection(activity)}
                            className={`inline-flex items-center px-3 py-1.5 border shadow-sm text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                              selectedActivities[activity.id] 
                                ? 'border-primary-500 text-primary-700 bg-primary-50 hover:bg-primary-100 focus:ring-primary-500' 
                                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-gray-500'
                            }`}
                          >
                            {selectedActivities[activity.id] ? (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Selected
                              </>
                            ) : (
                              'Select'
                            )}
                          </button>
                        ) : (
                          <>
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
                          </>
                        )}
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
      </div>
      
      {/* Add/Edit Activity Form */}
      {showAddActivityForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl overflow-hidden w-full max-w-md">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {editingActivityIndex !== null ? 'Edit Activity' : 'Add New Activity'}
              </h3>
              <button 
                onClick={() => {
                  setShowAddActivityForm(false);
                  setEditingActivityIndex(null);
                  setActivityFormData({
                    name: '',
                    category: '',
                    frequency: 1,
                    frequencyUnit: 'day',
                    duration: 1,
                    durationUnit: 'hour',
                    lifeImpact: 0,
                    color: 'blue',
                  });
                }} 
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={editingActivityIndex !== null ? handleUpdateActivitySubmit : handleAddActivitySubmit} className="px-6 py-4 space-y-4">
              {/* Activity Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Activity Name</label>
                <input 
                  type="text" 
                  id="name" 
                  name="name" 
                  value={activityFormData.name} 
                  onChange={handleInputChange} 
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
              
              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
                <input 
                  type="text" 
                  id="category" 
                  name="category" 
                  value={activityFormData.category} 
                  onChange={handleInputChange} 
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
              </div>
              
              {/* Frequency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="frequency" className="block text-sm font-medium text-gray-700">Frequency</label>
                  <input 
                    type="number" 
                    id="frequency" 
                    name="frequency" 
                    min="0"
                    step="0.01"
                    value={activityFormData.frequency} 
                    onChange={handleInputChange} 
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="frequencyUnit" className="block text-sm font-medium text-gray-700">Frequency Unit</label>
                  <select 
                    id="frequencyUnit" 
                    name="frequencyUnit" 
                    value={activityFormData.frequencyUnit} 
                    onChange={handleInputChange} 
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                  >
                    <option value="day">day</option>
                    <option value="week">week</option>
                    <option value="month">month</option>
                    <option value="year">year</option>
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
                    name="duration" 
                    min="0"
                    step="0.01"
                    value={activityFormData.duration} 
                    onChange={handleInputChange} 
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="durationUnit" className="block text-sm font-medium text-gray-700">Duration Unit</label>
                  <select 
                    id="durationUnit" 
                    name="durationUnit" 
                    value={activityFormData.durationUnit} 
                    onChange={handleInputChange} 
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                  >
                    <option value="minute">minute</option>
                    <option value="hour">hour</option>
                  </select>
                </div>
              </div>
              
              {/* Life Impact */}
              <div>
                <label htmlFor="lifeImpact" className="block text-sm font-medium text-gray-700">Life Impact (years)</label>
                <input 
                  type="number" 
                  id="lifeImpact" 
                  name="lifeImpact" 
                  step="0.1"
                  value={activityFormData.lifeImpact} 
                  onChange={handleInputChange} 
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">Negative values reduce life expectancy, positive values increase it</p>
              </div>
              
              {/* Color */}
              <div>
                <label htmlFor="color" className="block text-sm font-medium text-gray-700">Color</label>
                <select 
                  id="color" 
                  name="color" 
                  value={activityFormData.color} 
                  onChange={handleInputChange} 
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                >
                  <option value="blue">Blue</option>
                  <option value="green">Green</option>
                  <option value="red">Red</option>
                  <option value="yellow">Yellow</option>
                  <option value="purple">Purple</option>
                  <option value="pink">Pink</option>
                  <option value="indigo">Indigo</option>
                  <option value="gray">Gray</option>
                </select>
              </div>
              
              <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowAddActivityForm(false);
                    setEditingActivityIndex(null);
                    setActivityFormData({
                      name: '',
                      category: '',
                      frequency: 1,
                      frequencyUnit: 'day',
                      duration: 1,
                      durationUnit: 'hour',
                      lifeImpact: 0,
                      color: 'blue',
                    });
                  }} 
                  className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  {editingActivityIndex !== null ? 'Update Activity' : 'Add Activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Activities;