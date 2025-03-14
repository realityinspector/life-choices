import { useState } from 'react';
import { useUser } from '@/context/user-context';
import { LogOut, Settings } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import Profile from '@/components/profile';
import Header from '@/components/header';

export default function ProfilePage() {
  const { userData, isAdmin, logout } = useUser();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg text-center">
          <h1 className="text-2xl font-bold mb-4">Login Required</h1>
          <p className="mb-6">Please log in to view your profile.</p>
          <Link href="/login">
            <button className="bg-primary hover:bg-primary/90 text-white py-2 px-4 rounded-lg">
              Go to Login
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Use consistent header with branding */}
      <Header userData={userData} />

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Your Profile</h2>
          <button 
            onClick={handleLogout} 
            className="flex items-center text-red-600 hover:text-red-800"
          >
            <LogOut className="h-5 w-5 mr-1" />
            <span>Logout</span>
          </button>
        </div>
        <Profile />
      </div>
      
      {/* Admin link if user is admin */}
      {isAdmin && (
        <div className="p-4 bg-white border-t">
          <Link href="/admin">
            <button className="flex items-center text-gray-700 hover:text-gray-900">
              <Settings className="h-5 w-5 mr-1" />
              <span>Admin Dashboard</span>
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}