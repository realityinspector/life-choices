import { useUser } from '@/context/user-context';
import AnalyticsDashboard from '@/components/analytics-dashboard';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import { Activity } from '@shared/schema';
import { Loader2, BarChart3, PieChart, LineChart, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import Header from '@/components/header';

export default function AnalyticsPage() {
  const [, navigate] = useLocation();
  const { userData } = useUser();
  
  // Fetch activities
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['/api/activities'],
    queryFn: getQueryFn<Activity[]>({ on401: 'returnNull' }),
  });

  // If user is not logged in, show login prompt
  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg text-center">
          <h1 className="text-2xl font-bold mb-4">Login Required</h1>
          <p className="mb-6">Please log in to view your analytics.</p>
          <Button onClick={() => navigate('/')}>Go to Home</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
        <Header userData={userData} />
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <Header userData={userData} />
      <div className="bg-white p-2 flex justify-end border-b">
        <h1 className="text-xl font-bold text-black flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          LIFE CHOICES Analytics
        </h1>
      </div>

      {/* Analytics Features */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-black bg-opacity-5 rounded">
                <BarChart3 className="h-5 w-5 text-black" />
              </div>
              <h2 className="ml-3 text-lg font-medium">Activity Statistics</h2>
            </div>
            <p className="text-gray-600 mb-4">Visualize how you spend your time with detailed activity analysis.</p>
            <Button className="w-full border-black text-black bg-white hover:bg-gray-50">
              View Statistics
            </Button>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-black bg-opacity-5 rounded">
                <PieChart className="h-5 w-5 text-black" />
              </div>
              <h2 className="ml-3 text-lg font-medium">Time Distribution</h2>
            </div>
            <p className="text-gray-600 mb-4">See how your time is distributed across different categories of activities.</p>
            <Button className="w-full border-black text-black bg-white hover:bg-gray-50">
              View Distribution
            </Button>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-black bg-opacity-5 rounded">
                <LineChart className="h-5 w-5 text-black" />
              </div>
              <h2 className="ml-3 text-lg font-medium">Progress Tracking</h2>
            </div>
            <p className="text-gray-600 mb-4">Track your progress over time and identify improvement opportunities.</p>
            <Button className="w-full border-black text-black bg-white hover:bg-gray-50">
              View Progress
            </Button>
          </div>
        </div>
      </div>

      {/* Activity Analytics Section */}
      <div className="flex-1 border-t border-gray-200 pt-6">
        <div className="px-4 mb-4">
          <h2 className="text-xl font-bold text-gray-800">Personal Insights</h2>
          <p className="text-gray-600">See analytics for your activities and time management</p>
        </div>
        <AnalyticsDashboard userData={userData} activities={activities} />
      </div>
    </div>
  );
}