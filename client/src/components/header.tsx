import { useLocation } from "wouter";
import { UserData } from "@shared/schema";
import Navigation from "./navigation";

interface HeaderProps {
  userData?: UserData;
}

const Header = ({ userData }: HeaderProps) => {
  const [location] = useLocation();

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4">
          <div className="flex items-center mb-4 md:mb-0">
            {/* App Logo */}
            <div className="flex-shrink-0">
              <div className="text-primary font-serif font-bold text-3xl">
                Sundial
              </div>
            </div>
            
            {/* User greeting if available */}
            {userData && userData.name && (
              <div className="ml-4 text-sm text-muted-foreground">
                Welcome, <span className="font-medium text-foreground">{userData.name}</span>
              </div>
            )}
          </div>
          
          {/* Navigation */}
          <Navigation currentPath={location} />
        </div>
      </div>
    </header>
  );
};

export default Header;