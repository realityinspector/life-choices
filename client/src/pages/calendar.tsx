import { useState } from 'react';
import { useUser } from '@/context/user-context';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/header';

export default function CalendarPage() {
  const { userData } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg text-center">
          <h1 className="text-2xl font-bold mb-4">Login Required</h1>
          <p className="mb-6">Please log in to view your calendar.</p>
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
      <div className="min-h-screen bg-gray-50 flex flex-col">
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
      <div className="flex-1 overflow-auto p-4">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Calendar</h2>
        
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <CalendarIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Calendar Integration COMING SOON</h3>
          <p className="text-gray-500 mb-4">
            Export your scheduled activities to your favorite calendar app to keep track of everything in one place.
          </p>
          <button className="bg-primary hover:bg-primary/90 text-white py-2 px-4 rounded-md font-medium">
            COMING SOON
          </button>
        </div>
      </div>

      {/* Bottom navigation removed as we use centralized bottom navigation in App.tsx */}
    </div>
  );
}