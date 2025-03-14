import { useLocation } from "wouter";
import { UserData } from "@shared/schema";
import Navigation from "./navigation";
import { CheckCircle2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import aotLogo from "../images/aot-logo.png";

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
              <div className="flex items-center">
                <div className="bg-black rounded-md p-1 mr-2">
                  <img src={aotLogo} alt="Life Choices Logo" className="h-8 w-8" />
                </div>
                <div className="text-black font-sans font-bold text-2xl">
                  LIFE CHOICES
                </div>
              </div>
            </div>
            
            {/* User greeting removed as requested */}
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