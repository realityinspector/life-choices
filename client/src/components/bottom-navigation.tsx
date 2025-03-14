import { useLocation } from "wouter";
import { 
  ListChecks, 
  Plus, 
  Calendar, 
  User,
  BarChart2,
  ShoppingCart,
  ArrowDown,
  Home
} from "lucide-react";

export default function BottomNavigation() {
  const [location, navigate] = useLocation();

  // Helper function to determine if a link is active
  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path === "/" && location === "/whats-next") return true;
    return location === path;
  };
  
  // Class for active links
  const activeLinkClass = "flex flex-col items-center py-1 text-primary cursor-pointer";
  // Class for inactive links
  const inactiveLinkClass = "flex flex-col items-center py-1 text-gray-500 hover:text-gray-700 cursor-pointer";

  return (
    <div className="bg-white border-t py-2 px-4 grid grid-cols-6 gap-1 text-center">
      <div 
        onClick={() => navigate("/whats-next")}
        className={isActive("/") || isActive("/whats-next") ? activeLinkClass : inactiveLinkClass}
      >
        <ArrowDown className="h-5 w-5 transform rotate-180" />
        <span className="text-xs mt-1">Next</span>
      </div>
      
      <div 
        onClick={() => navigate("/activities")}
        className={isActive("/activities") ? activeLinkClass : inactiveLinkClass}
      >
        <ListChecks className="h-5 w-5" />
        <span className="text-xs mt-1">Tasks</span>
      </div>
      
      <div 
        onClick={() => navigate("/shop-activities")}
        className={isActive("/shop-activities") ? activeLinkClass : inactiveLinkClass}
      >
        <Plus className="h-5 w-5" />
        <span className="text-xs mt-1">Add</span>
      </div>
      
      <div 
        onClick={() => navigate("/calendar")}
        className={isActive("/calendar") ? activeLinkClass : inactiveLinkClass}
      >
        <Calendar className="h-5 w-5" />
        <span className="text-xs mt-1">Calendar</span>
      </div>
      
      <div 
        onClick={() => navigate("/analytics")}
        className={isActive("/analytics") ? activeLinkClass : inactiveLinkClass}
      >
        <BarChart2 className="h-5 w-5" />
        <span className="text-xs mt-1">Analytics</span>
      </div>
      
      <div 
        onClick={() => navigate("/profile")}
        className={isActive("/profile") ? activeLinkClass : inactiveLinkClass}
      >
        <User className="h-5 w-5" />
        <span className="text-xs mt-1">Profile</span>
      </div>
    </div>
  );
}