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
          <p className="mb-6">Please log in to view the community space.</p>
          <Button onClick={() => navigate('/login')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Simple header */}
        <div className="bg-white p-4 flex items-center justify-between border-b">
          <h1 className="text-xl font-bold text-primary">Community Space</h1>
        </div>
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Simple header */}
      <div className="bg-white p-4 flex items-center justify-between border-b">
        <h1 className="text-xl font-bold text-primary flex items-center">
          <Triangle className="h-5 w-5 mr-2 transform rotate-90" />
          Community Space
        </h1>
      </div>

      {/* Community Features */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-black bg-opacity-5 rounded">
                <Users className="h-5 w-5 text-black" />
              </div>
              <h2 className="ml-3 text-lg font-medium">Co-working Spaces</h2>
            </div>
            <p className="text-gray-600 mb-4">Connect with others in shared working environments.</p>
            <Button className="w-full border-black text-black bg-white hover:bg-gray-50">
              Browse Spaces
            </Button>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-black bg-opacity-5 rounded">
                <Triangle className="h-5 w-5 text-black" />
              </div>
              <h2 className="ml-3 text-lg font-medium">Co-learning Activities</h2>
            </div>
            <p className="text-gray-600 mb-4">Participate in knowledge-sharing and learning events.</p>
            <Button className="w-full border-black text-black bg-white hover:bg-gray-50">
              Discover Classes
            </Button>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-black bg-opacity-5 rounded">
                <Share2 className="h-5 w-5 text-black" />
              </div>
              <h2 className="ml-3 text-lg font-medium">Shared Activities</h2>
            </div>
            <p className="text-gray-600 mb-4">Share your activities and discover what others are doing.</p>
            <Button className="w-full border-black text-black bg-white hover:bg-gray-50">
              Share Activity
            </Button>
          </div>
        </div>
      </div>

      {/* Activity Analytics Section */}
      <div className="flex-1 border-t border-gray-200 pt-6">
        <div className="px-4 mb-4">
          <h2 className="text-xl font-bold text-gray-800">Community Insights</h2>
          <p className="text-gray-600">See how your activities connect with the wider community</p>
        </div>
        <AnalyticsDashboard userData={userData} activities={activities} />
      </div>
    </div>
  );
}