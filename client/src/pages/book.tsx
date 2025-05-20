import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useBook } from "@/context/book-context";
import { useUser } from "@/context/user-context";
import { Link } from "wouter";
import { Activity, ActivityImage } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, BookOpen, Trash2, Edit2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function BookPage() {
  const { userData } = useUser();
  const { toast } = useToast();
  const {
    books,
    currentBook,
    selectedActivities,
    bookActivities,
    isLoading: booksLoading,
    error: booksError,
    createBook,
    updateBook,
    deleteBook,
    selectBook,
    addActivityToBook,
    removeActivityFromBook,
    toggleActivitySelection,
    clearSelectedActivities
  } = useBook();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showNewBookDialog, setShowNewBookDialog] = useState(false);
  const [newBookName, setNewBookName] = useState("");
  const [editingBook, setEditingBook] = useState<{ id: number; name: string } | null>(null);

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

  // Filter activities based on search and category
  const filteredActivities = activitiesWithImages.filter(activity => {
    const query = searchQuery.toLowerCase();
    const nameMatch = activity.name.toLowerCase().includes(query);
    const categoryMatch = activity.category.toLowerCase().includes(query);
    const matchesSearch = searchQuery === "" || nameMatch || categoryMatch;
    const matchesCategory = selectedCategory === null || activity.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateBook = async () => {
    if (!newBookName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a book name",
        variant: "destructive"
      });
      return;
    }

    try {
      const newBook = await createBook(newBookName.trim());
      setNewBookName("");
      setShowNewBookDialog(false);
      selectBook(newBook);
      toast({
        title: "Success",
        description: "Book created successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create book",
        variant: "destructive"
      });
    }
  };

  const handleUpdateBook = async () => {
    if (!editingBook || !editingBook.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a book name",
        variant: "destructive"
      });
      return;
    }

    try {
      await updateBook(editingBook.id, editingBook.name.trim());
      setEditingBook(null);
      toast({
        title: "Success",
        description: "Book updated successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update book",
        variant: "destructive"
      });
    }
  };

  const handleDeleteBook = async (bookId: number) => {
    try {
      await deleteBook(bookId);
      toast({
        title: "Success",
        description: "Book deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete book",
        variant: "destructive"
      });
    }
  };

  const handleAddSelectedToBook = async () => {
    if (!currentBook) {
      toast({
        title: "Error",
        description: "Please select a book first",
        variant: "destructive"
      });
      return;
    }

    try {
      for (const activityId of selectedActivities) {
        await addActivityToBook(currentBook.id, activityId);
      }
      clearSelectedActivities();
      toast({
        title: "Success",
        description: "Activities added to book successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add activities to book",
        variant: "destructive"
      });
    }
  };

  if (!userData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Please log in to create books</h1>
        <Button onClick={() => window.location.href = "/"}>
          Go to Home
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
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <BookOpen className="h-6 w-6 mr-2" />
            Create Activity Book
          </h1>
          <p className="text-gray-500 mt-1">
            Select activities to create a curated collection
          </p>
        </div>

        {/* Book Management */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Select
                value={currentBook?.id.toString()}
                onValueChange={(value) => {
                  const book = books.find(b => b.id.toString() === value);
                  if (book) {
                    selectBook(book);
                  }
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select a book" />
                </SelectTrigger>
                <SelectContent>
                  {books.map(book => (
                    <SelectItem key={book.id} value={book.id.toString()}>
                      {book.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                variant="secondary"
                onClick={() => {
                  if (currentBook) {
                    selectBook(currentBook);
                    toast({
                      title: "Success",
                      description: `Loaded book: ${currentBook.name}`
                    });
                  }
                }}
                disabled={!currentBook}
              >
                Load Book
              </Button>
            </div>

            <Dialog open={showNewBookDialog} onOpenChange={setShowNewBookDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  New Book
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Book</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Input
                    placeholder="Enter book name"
                    value={newBookName}
                    onChange={(e) => setNewBookName(e.target.value)}
                  />
                  <Button onClick={handleCreateBook} className="w-full">
                    Create Book
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {currentBook && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setEditingBook({ id: currentBook.id, name: currentBook.name })}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDeleteBook(currentBook.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
          </div>

          {currentBook && (
            <>
              {selectedActivities.size > 0 && (
                <Button onClick={handleAddSelectedToBook}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add {selectedActivities.size} to Book
                </Button>
              )}
              {bookActivities.get(currentBook.id)?.size > 0 && (
                <Button
                  asChild
                  variant="outline"
                  className="ml-2"
                >
                  <Link to="/book-report">
                    <BookOpen className="h-4 w-4 mr-2" />
                    View Book Report
                  </Link>
                </Button>
              )}
            </>
          )}
        </div>

        {/* Edit Book Dialog */}
        <Dialog open={!!editingBook} onOpenChange={() => setEditingBook(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Book</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                placeholder="Enter book name"
                value={editingBook?.name || ""}
                onChange={(e) => setEditingBook(prev => prev ? { ...prev, name: e.target.value } : null)}
              />
              <Button onClick={handleUpdateBook} className="w-full">
                Update Book
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Search and Filter */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              className="pl-10"
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="bg-white p-3 rounded-lg shadow-sm">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={selectedCategory === null ? "default" : "outline"}
                onClick={() => setSelectedCategory(null)}
              >
                All
              </Button>
              {Array.from(new Set(activitiesWithImages.map(a => a.category))).map((category) => (
                <Button
                  key={category}
                  size="sm"
                  variant={selectedCategory === category ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredActivities.map((activity) => {
            const isSelected = selectedActivities.has(activity.id);
            const isInBook = currentBook ? bookActivities.get(currentBook.id)?.has(activity.id) : false;
            const activityImage = allActivityImages.find(img => img.activityId === activity.id);

            const handleRemoveFromBook = async (e: React.MouseEvent) => {
              e.stopPropagation();
              if (!currentBook) return;
              try {
                await removeActivityFromBook(currentBook.id, activity.id);
                toast({
                  title: "Success",
                  description: "Activity removed from book"
                });
              } catch (error) {
                toast({
                  title: "Error",
                  description: "Failed to remove activity from book",
                  variant: "destructive"
                });
              }
            };

            return (
              <Card
                key={activity.id}
                className={`relative cursor-pointer transition-all ${
                  isSelected ? "ring-2 ring-blue-500" :
                  isInBook ? "ring-2 ring-green-500" :
                  "hover:ring-2 hover:ring-gray-300"
                }`}
                onClick={() => toggleActivitySelection(activity.id)}
              >
                <div className="aspect-square relative">
                  {activityImage ? (
                    <img
                      src={activityImage.path}
                      alt={activity.name}
                      className="w-full h-full object-cover rounded-t-lg"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-t-lg">
                      <span className="text-gray-400">No image</span>
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                      <Check className="h-4 w-4" />
                    </div>
                  )}
                  {isInBook && (
                    <>
                      <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute bottom-2 right-2"
                        onClick={handleRemoveFromBook}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
                <div className="p-2">
                  <h3 className="text-sm font-medium truncate">{activity.name}</h3>
                </div>
              </Card>
            );
          })}
        </div>

        {filteredActivities.length === 0 && (
          <div className="text-center p-10 bg-muted rounded-lg">
            <Search className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-2">No activities found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filters to find activities.
            </p>
          </div>
        )}
      </main>
    </div>
  );
} 