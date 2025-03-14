import { useState } from 'react';
import { useUser } from '@/context/user-context';
import { ListChecks, Plus, Calendar, ShoppingCart, User, Loader2 } from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import Activities from '@/components/activities';
import Header from '@/components/header';

export default function TasksPage() {
  const { userData } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleViewChange = (view: string) => {
    // This function is passed to the Activities component
    // but is handled here at the page level
  };

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg text-center">
          <h1 className="text-2xl font-bold mb-4">Login Required</h1>
          <p className="mb-6">Please log in to view your tasks.</p>
          <Link href="/login">
            <button className="bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 rounded-lg">
              Go to Login
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
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

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <Activities onViewChange={handleViewChange} />
      </div>

      {/* Bottom navigation removed as we use centralized bottom navigation in App.tsx */}
    </div>
  );
}