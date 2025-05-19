import { useQuery } from "@tanstack/react-query";
import { useBook } from "@/context/book-context";
import { useUser } from "@/context/user-context";
import { Activity, ActivityImage } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookOpen, ArrowLeft } from "lucide-react";
import { useRouter } from "next/router";

export default function BookReportPage() {
  const router = useRouter();
  const { userData } = useUser();
  const { currentBook, bookActivities } = useBook();

  // Fetch all activities with images
  const { data: activitiesWithImages = [] } = useQuery<(Activity & { images: ActivityImage[] })[]>({
    queryKey: ['/api/activities/shop/with-images'],
    queryFn: async ({ signal }) => {
      try {
        const res = await apiRequest('/api/activities/shop/with-images', { signal });
        return res.json();
      } catch (error) {
        console.error('Error fetching activities with images:', error);
        return [];
      }
    },
    staleTime: 30000
  });

  // Extract all images for easier reference
  const allActivityImages = activitiesWithImages.flatMap(a => a.images);

  // Get activities in the current book
  const bookActivityIds = currentBook ? bookActivities.get(currentBook.id) || new Set() : new Set();
  const bookActivitiesList = activitiesWithImages.filter(activity => bookActivityIds.has(activity.id));

  if (!userData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Please log in to view book reports</h1>
        <Button onClick={() => window.location.href = "/"}>
          Go to Home
        </Button>
      </div>
    );
  }

  if (!currentBook) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">No book selected</h1>
        <Button onClick={() => router.push("/book")}>
          Go to Books
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <Header userData={userData} />

      <main className="flex-1 max-w-7xl w-full mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => router.push("/book")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Books
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <BookOpen className="h-6 w-6 mr-2" />
            {currentBook.name}
          </h1>
          <p className="text-gray-500 mt-1">
            {bookActivitiesList.length} activities in this collection
          </p>
        </div>

        {/* Activity Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookActivitiesList.map((activity) => {
            const activityImage = allActivityImages.find(img => img.activityId === activity.id);

            return (
              <Card key={activity.id} className="overflow-hidden">
                <div className="aspect-video relative">
                  {activityImage ? (
                    <img
                      src={activityImage.path}
                      alt={activity.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-400">No image</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-medium mb-2">{activity.name}</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p><span className="font-medium">Category:</span> {activity.category}</p>
                    <p><span className="font-medium">Frequency:</span> {activity.frequency}</p>
                    <p><span className="font-medium">Duration:</span> {activity.duration}</p>
                    <p><span className="font-medium">Life Impact:</span> {activity.lifeImpact}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {bookActivitiesList.length === 0 && (
          <div className="text-center p-10 bg-muted rounded-lg">
            <BookOpen className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">No activities in this book</h3>
            <p className="text-muted-foreground">
              Add some activities to your book to see them here.
            </p>
            <Button
              className="mt-4"
              onClick={() => router.push("/book")}
            >
              Add Activities
            </Button>
          </div>
        )}
      </main>
    </div>
  );
} 