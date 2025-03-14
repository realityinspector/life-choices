import { Link, useLocation } from "wouter";
import { 
  ListChecks, 
  Calendar, 
  User, 
  ShoppingCart, 
  Store, 
  Share2, 
  Home,
  LogOut,
  Settings,
  Triangle,
  CheckCircle2,
  BarChart2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/user-context";
import { useToast } from "@/hooks/use-toast";

interface NavigationProps {
  currentPath: string;
}

const Navigation = ({ currentPath }: NavigationProps) => {
  const { logout, isAdmin } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
      setLocation("/login");
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout error",
        description: "There was a problem logging out",
        variant: "destructive",
      });
    }
  };
  
  // Define the main navigation items
  const navItems = [
    {
      label: "Next",
      path: "/",
      icon: <Home className="h-4 w-4 mr-2" />,
    },
    {
      label: "Tasks",
      path: "/activities",
      icon: <ListChecks className="h-4 w-4 mr-2" />,
    },
    {
      label: "Calendar",
      path: "/calendar",
      icon: <Calendar className="h-4 w-4 mr-2" />,
    },
    {
      label: "Browse",
      path: "/shop-activities",
      icon: <Store className="h-4 w-4 mr-2" />,
    },
    {
      label: "Analytics",
      path: "/analytics",
      icon: <BarChart2 className="h-4 w-4 mr-2" />,
    },
    {
      label: "Profile",
      path: "/profile",
      icon: <User className="h-4 w-4 mr-2" />,
    },
  ];

  // Define utility buttons that appear separately
  const utilityButtons = [
    {
      label: "Cart",
      path: "/cart",
      icon: <ShoppingCart className="h-4 w-4 mr-2" />,
    }
  ];
  
  // Add admin button if user is admin
  if (isAdmin) {
    utilityButtons.push({
      label: "Admin",
      path: "/admin/images",
      icon: <Settings className="h-4 w-4 mr-2" />,
    });
  }

  return (
    <div className="flex justify-between w-full">
      <nav className="flex items-center space-x-2">
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

      <div className="flex items-center space-x-2">
        {utilityButtons.map((item) => (
          <Link key={item.path} href={item.path}>
            <Button
              variant={currentPath === item.path ? "default" : "outline"}
              size="sm"
              className="text-sm"
            >
              {item.icon}
              {item.label}
            </Button>
          </Link>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="text-sm text-gray-500"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
};

export default Navigation;