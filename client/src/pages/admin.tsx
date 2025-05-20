import { useState, useEffect } from "react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Database, 
  Image as ImageIcon, 
  Settings, 
  Save, 
  FileText, 
  Cpu, 
  BarChart, 
  AlertTriangle,
  User,
  Info
} from "lucide-react";

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const res = await apiRequest('/api/auth/admin-check');
        const data = await res.json();
        setIsAdmin(data.isAdmin === true);
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto py-12 flex justify-center">
        <div className="animate-pulse text-2xl">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-12">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to access the admin dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const adminModules = [
    {
      title: "Activity Management",
      description: "Create, edit and delete activities",
      icon: <Database className="h-8 w-8 text-green-500" />,
      route: "/admin/activities",
    },
    {
      title: "CSV Import",
      description: "Import activities from CSV with AI-generated images and details",
      icon: <FileText className="h-8 w-8 text-yellow-500" />,
      route: "/admin/csv-import",
      badge: "New"
    },
    {
      title: "AI Image Generation",
      description: "Generate images for activities using AI models and process uploaded images",
      icon: <Cpu className="h-8 w-8 text-indigo-500" />,
      route: "/admin/llm",
      badge: "New"
    },
    {
      title: "Activity Image Management",
      description: "Upload, associate, and manage images for activities",
      icon: <ImageIcon className="h-8 w-8 text-blue-500" />,
      route: "/admin/images",
    },
    {
      title: "Backup & Restore",
      description: "Backup and restore database content",
      icon: <Save className="h-8 w-8 text-green-500" />,
      route: "/admin/backup",
    },
    {
      title: "Analytics & Reporting",
      description: "View system-wide analytics and usage statistics",
      icon: <BarChart className="h-8 w-8 text-purple-500" />,
      route: "/admin/analytics",
      disabled: true
    },
    {
      title: "User Management",
      description: "Manage user accounts and permissions",
      icon: <User className="h-8 w-8 text-orange-500" />,
      route: "/admin/users",
      disabled: true
    },
    {
      title: "System Configuration",
      description: "Configure system settings and preferences",
      icon: <Settings className="h-8 w-8 text-gray-500" />,
      route: "/admin/settings",
      disabled: true
    }
  ];

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            System management and administrative tools
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/">Return to App</Link>
        </Button>
      </div>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertTitle>Administrator Access</AlertTitle>
        <AlertDescription>
          You have access to system administration features. Please use these tools responsibly.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminModules.map((module, index) => (
          <Card key={index} className={module.disabled ? "opacity-70" : ""}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="p-2 bg-slate-100 rounded-lg inline-block">
                  {module.icon}
                </div>
                {module.badge && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                    {module.badge}
                  </span>
                )}
              </div>
              <CardTitle>{module.title}</CardTitle>
              <CardDescription>{module.description}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button 
                className="w-full" 
                asChild={!module.disabled}
                disabled={module.disabled}
              >
                {module.disabled ? (
                  <span>Coming Soon</span>
                ) : (
                  <Link href={module.route}>Access Module</Link>
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}