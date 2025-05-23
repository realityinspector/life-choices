import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Zap, Share2, Plus } from "lucide-react";
import { ActivityInsert } from "../../../shared/schema";
import { useUser } from "../context/user-context";
import { useToast } from "@/hooks/use-toast";

export default function SharedActivityPage() {
  const [, params] = useRoute("/share/:token");
  const [activity, setActivity] = useState<ActivityInsert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { userData, isUserSetup, addActivity } = useUser();

  useEffect(() => {
    const fetchSharedActivity = async () => {
      if (!params?.token) {
        setError("No activity token provided");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/activities/shared/${params.token}`);
        if (!response.ok) {
          throw new Error("Activity not found or expired");
        }
        const data = await response.json();
        setActivity(data.activity);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load shared activity");
      } finally {
        setLoading(false);
      }
    };

    fetchSharedActivity();
  }, [params?.token]);

  const handleAddActivity = async () => {
    if (!activity || !isUserSetup) return;

    try {
      await addActivity(activity);
      toast({
        title: "Activity Added",
        description: `"${activity.name}" has been added to your activities!`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add activity. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getImpactColor = (impact: number | undefined) => {
    if (impact === undefined) return "bg-gray-200";
    if (impact >= 5) return "bg-green-500";
    if (impact >= 3) return "bg-yellow-500";
    if (impact >= 1) return "bg-orange-500";
    return "bg-red-500";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading shared activity...</p>
        </div>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Activity Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              {error || "This shared activity link is invalid or has expired."}
            </p>
            <Button onClick={() => window.location.href = "/"}>
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Shared Activity</h1>
          <p className="text-gray-600">Someone shared this activity with you!</p>
        </div>

        <Card className="overflow-hidden">
          <div className={`h-2 ${getImpactColor(activity.lifeImpact)}`} />
          
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <CardTitle className="text-xl">{activity.name}</CardTitle>
              <Badge className="text-sm">{activity.category}</Badge>
            </div>
            <CardDescription className="text-base">
              {activity.frequency} x {activity.frequencyUnit}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{activity.duration} {activity.durationUnit}{activity.duration > 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center">
                <Zap className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>Life Impact: {activity.lifeImpact > 0 ? '+' : ''}{activity.lifeImpact}</span>
              </div>
            </div>

            {!isUserSetup ? (
              <div className="text-center space-y-4 bg-blue-50 p-4 rounded-lg">
                <p className="text-blue-800">
                  To add this activity to your personal collection, you need to create an account first.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => window.location.href = "/login"}>
                    Sign Up / Login
                  </Button>
                  <Button variant="outline" onClick={() => window.location.href = "/"}>
                    Learn More
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleAddActivity} className="flex-1">
                  <Plus className="h-4 w-4 mr-2" />
                  Add to My Activities
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: `Check out this activity: ${activity.name}`,
                        url: window.location.href
                      });
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      toast({
                        title: "Link Copied",
                        description: "Share link copied to clipboard",
                      });
                    }
                  }}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <p className="text-gray-600 mb-4">
            Want to discover more activities and build your personal routine?
          </p>
          <Button variant="outline" onClick={() => window.location.href = "/"}>
            Explore LIFE CHOICES
          </Button>
        </div>
      </div>
    </div>
  );
} 