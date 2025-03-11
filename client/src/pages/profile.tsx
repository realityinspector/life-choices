import { useState } from 'react';
import { useUser } from '@/context/user-context';
import { ListChecks, Plus, Calendar, ShoppingCart, User, Settings } from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import Profile from '@/components/profile';

export default function ProfilePage() {
  const { userData, isAdmin } = useUser();
  const { toast } = useToast();

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg text-center">
          <h1 className="text-2xl font-bold mb-4">Login Required</h1>
          <p className="mb-6">Please log in to view your profile.</p>
          <Link href="/login">
            <button className="bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 rounded-lg">
              Go to Login
            </button>
          </Link>
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
      <div className="flex-1 overflow-auto p-4">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Your Profile</h2>
        <Profile />
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
        
        <Link href="/profile" className="flex flex-col items-center py-1 text-teal-600">
          <User className="h-6 w-6" />
          <span className="text-xs mt-1">Profile</span>
        </Link>
      </div>
      
      {/* Spacer for fixed bottom navigation */}
      <div className="h-16 md:h-0"></div>
    </div>
  );
}