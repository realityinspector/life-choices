import { useUser } from '@/context/user-context';
import AnalyticsDashboard from '@/components/analytics-dashboard';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import { Activity } from '@shared/schema';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

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
          <p className="mb-6">Please log in to view your analytics dashboard.</p>
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
          <h1 className="text-xl font-bold text-primary">Life Forecast</h1>
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
        <h1 className="text-xl font-bold text-primary">Life Forecast</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <AnalyticsDashboard userData={userData} activities={activities} />
      </div>
    </div>
  );
}