import { useUser } from '@/context/user-context';
import AnalyticsDashboard from '@/components/analytics-dashboard';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import { Activity } from '@shared/schema';
import { Loader2, ListChecks, Plus, Calendar, ShoppingCart, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation, Link } from 'wouter';

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
        <Header />
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
      <div className="min-h-screen bg-gray-100">
        <Header userData={userData} />
        <div className="flex justify-center items-center h-[calc(100vh-100px)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Simple header */}
      <div className="bg-white p-4 flex items-center justify-between border-b">
        <h1 className="text-xl font-bold text-teal-600">Life Choices</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <AnalyticsDashboard userData={userData} activities={activities} />
      </div>

      {/* Bottom Nav */}
      <div className="bg-white border-t py-2 px-4 grid grid-cols-6 gap-1 text-center">
        <Link href="/" className="flex flex-col items-center py-1 text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-xs mt-1">Next</span>
        </Link>
        
        <Link href="/activities" className="flex flex-col items-center py-1 text-gray-500">
          <ListChecks className="h-6 w-6" />
          <span className="text-xs mt-1">Tasks</span>
        </Link>
        
        <Link href="/shop-activities" className="flex flex-col items-center py-1 text-gray-500">
          <Plus className="h-6 w-6" />
          <span className="text-xs mt-1">Add</span>
        </Link>
        
        <Link href="/calendar" className="flex flex-col items-center py-1 text-gray-500">
          <Calendar className="h-6 w-6" />
          <span className="text-xs mt-1">Calendar</span>
        </Link>
        
        <Link href="/cart" className="flex flex-col items-center py-1 text-gray-500">
          <ShoppingCart className="h-6 w-6" />
          <span className="text-xs mt-1">Cart</span>
        </Link>
        
        <Link href="/profile" className="flex flex-col items-center py-1 text-gray-500">
          <User className="h-6 w-6" />
          <span className="text-xs mt-1">Profile</span>
        </Link>
      </div>
      
      {/* Spacer for fixed bottom navigation */}
      <div className="h-16 md:h-0"></div>
    </div>
  );
}