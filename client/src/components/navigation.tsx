import { Link } from "wouter";
import { Calendar, Activity, Clock, User, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavigationProps {
  currentPath: string;
}

const Navigation = ({ currentPath }: NavigationProps) => {
  // Define the main navigation items
  const navItems = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: <Calendar className="h-4 w-4 mr-2" />,
    },
    {
      label: "Activities",
      path: "/activities",
      icon: <Activity className="h-4 w-4 mr-2" />,
    },
    {
      label: "Time Machine",
      path: "/time-machine",
      icon: <Clock className="h-4 w-4 mr-2" />,
    },
    {
      label: "Life Events",
      path: "/life-events",
      icon: <ShoppingBag className="h-4 w-4 mr-2" />,
    },
    {
      label: "Profile",
      path: "/profile",
      icon: <User className="h-4 w-4 mr-2" />,
    },
  ];

  return (
    <nav className="flex flex-wrap items-center space-x-1 md:space-x-2">
      {navItems.map((item) => (
        <Link key={item.path} href={item.path}>
          <Button
            variant={currentPath === item.path ? "default" : "ghost"}
            size="sm"
            className="text-sm"
          >
            {item.icon}
            {item.label}
          </Button>
        </Link>
      ))}
    </nav>
  );
};

export default Navigation;