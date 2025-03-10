import { useLocation } from "wouter";
import { UserData } from "@shared/schema";
import Navigation from "./navigation";
import { CheckCircle2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface HeaderProps {
  userData?: UserData;
}

const Header = ({ userData }: HeaderProps) => {
  const [location] = useLocation();
  const isMobile = useIsMobile();

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4">
          <div className="flex items-center mb-4 md:mb-0">
            {/* App Logo */}
            <div className="flex-shrink-0">
              <div className="text-teal-600 font-sans font-bold text-2xl flex items-center">
                <CheckCircle2 className="h-6 w-6 mr-2" />
                Life Choices
              </div>
            </div>
            
            {/* User greeting if available */}
            {userData && userData.name && (
              <div className="ml-4 text-sm text-gray-500">
                Welcome, <span className="font-medium text-gray-700">{userData.name}</span>
              </div>
            )}
          </div>
          
          {/* Navigation - only show on desktop (mobile uses bottom navigation) */}
          <div className="hidden md:block">
            <Navigation currentPath={location} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;