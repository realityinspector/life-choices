import { Link, useLocation } from "wouter";
import { 
  Home, 
  ListChecks, 
  PlusCircle, 
  Calendar, 
  ShoppingCart,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";

const BottomNavigation = () => {
  const [location] = useLocation();
  
  const navItems = [
    {
      label: "Next",
      path: "/",
      icon: Home,
    },
    {
      label: "Tasks",
      path: "/activities",
      icon: ListChecks,
    },
    {
      label: "Add",
      path: "/shop-activities",
      icon: PlusCircle,
    },
    {
      label: "Calendar",
      path: "/calendar",
      icon: Calendar,
    },
    {
      label: "Cart",
      path: "/cart",
      icon: ShoppingCart,
      badge: true
    },
    {
      label: "Profile",
      path: "/profile",
      icon: User,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 px-2 z-50">
      <div className="max-w-screen-md mx-auto">
        <div className="flex justify-between">
          {navItems.map((item) => {
            const isActive = location === item.path;
            const IconComponent = item.icon;
            
            return (
              <Link key={item.path} href={item.path}>
                <a className="flex flex-col items-center justify-center w-16">
                  <div className={cn(
                    "p-1 rounded-full relative",
                    isActive ? "text-primary-600" : "text-gray-500"
                  )}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <span className={cn(
                    "text-xs mt-1",
                    isActive ? "text-primary-600 font-medium" : "text-gray-500"
                  )}>
                    {item.label}
                  </span>
                </a>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BottomNavigation;