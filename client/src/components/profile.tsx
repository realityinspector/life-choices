import { useState } from "react";
import { useUser } from "@/context/user-context";
import { useToast } from "@/hooks/use-toast";
import { Download, Trash2, ShieldCheck, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProfileProps {}

const Profile = ({}: ProfileProps) => {
  const { userData, updateUserData, resetData, isAdmin } = useUser();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: userData.name,
    username: userData.username,
    email: userData.email || '',
    age: userData.age || 0
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    const fieldName = id.replace('profile', '').toLowerCase();
    
    // Only convert age to number, keep other fields as string
    const fieldValue = fieldName === 'age' ? Number(value) : value;
    
    setFormData({
      ...formData,
      [fieldName]: fieldValue
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Update all editable fields
    updateUserData({
      ...userData,  // Preserve all existing fields
      name: formData.name,
      username: formData.username,
      email: formData.email,
      age: formData.age
    });
    toast({
      title: "Profile updated",
      description: "Your profile has been successfully updated.",
    });
  };

  const handleExportData = () => {
    const data = {
      userData,
      activities: useUser().activities
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sundial-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Data exported",
      description: "Your data has been successfully exported to a JSON file.",
    });
  };

  const handleResetData = () => {
    if (window.confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
      resetData();
      toast({
        title: "Data reset",
        description: "All your data has been reset. You'll be redirected to the setup page.",
      });
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Your Profile</h2>
              <p className="mt-1 text-sm text-gray-500">Update your personal details</p>
            </div>
            {isAdmin && (
              <Badge variant="secondary" className="flex items-center gap-1 bg-primary-100 text-primary-800">
                <ShieldCheck className="h-4 w-4" />
                Admin
              </Badge>
            )}
          </div>
        </div>
        <div className="border-t border-gray-200">
          <form onSubmit={handleSubmit}>
            <div className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="profileName" className="block text-sm font-medium text-gray-700">Your Name</label>
                  <input 
                    type="text" 
                    id="profileName" 
                    value={formData.name}
                    onChange={handleChange}
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" 
                    required 
                  />
                </div>
                
                <div>
                  <label htmlFor="profileUsername" className="block text-sm font-medium text-gray-700">Username</label>
                  <input 
                    type="text" 
                    id="profileUsername" 
                    value={formData.username}
                    onChange={handleChange}
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" 
                    required 
                  />
                </div>
                
                <div>
                  <label htmlFor="profileEmail" className="block text-sm font-medium text-gray-700">Email Address</label>
                  <input 
                    type="email" 
                    id="profileEmail" 
                    value={formData.email}
                    onChange={handleChange}
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" 
                  />
                </div>
                
                <div>
                  <label htmlFor="profileAge" className="block text-sm font-medium text-gray-700">Your Age</label>
                  <input 
                    type="number" 
                    id="profileAge" 
                    value={formData.age || ''}
                    onChange={handleChange}
                    min="1" 
                    max="120" 
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" 
                    required 
                  />
                </div>
              </div>
            </div>
            <div className="px-4 py-5 bg-gray-50 text-right sm:px-6 border-t border-gray-200">
              <button 
                type="submit" 
                className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {isAdmin && (
        <div className="mt-6 bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <div className="flex items-center">
              <h2 className="text-lg font-medium text-gray-900">Admin Access</h2>
              <div className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                Admin
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-500">Special privileges for administrators</p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <p className="text-sm text-gray-600 mb-4">
              You have administrator privileges. You can access admin features to manage assets, activities, and system settings.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a 
                href="/admin/images" 
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <ShieldCheck className="h-5 w-5 mr-2" />
                Image Management
              </a>
              <a 
                href="/admin" 
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Settings className="h-5 w-5 mr-2" />
                Admin Panel
              </a>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-6 bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">Data Management</h2>
          <p className="mt-1 text-sm text-gray-500">Export or reset your data</p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:space-x-4">
            <button 
              onClick={handleExportData}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mb-3 sm:mb-0"
            >
              <Download className="h-5 w-5 mr-2" />
              Export Your Data
            </button>
            
            <button 
              onClick={handleResetData}
              className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <Trash2 className="h-5 w-5 mr-2" />
              Reset All Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
