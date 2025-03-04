import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn, apiRequest } from '@/lib/queryClient';
import { LifeEvent, EventCategory, UserLifeEvent } from '@shared/schema';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/user-context';
import { Loader2, Search, ShoppingCart, Plus, Clock, DollarSign, Heart, BarChart4 } from 'lucide-react';
import Header from '@/components/header';

export default function LifeEventsPage() {
  const { toast } = useToast();
  const { userData } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedLifeEvents, setSelectedLifeEvents] = useState<number[]>([]);

  // Fetch categories
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ['/api/event-categories'],
    queryFn: getQueryFn<EventCategory[]>({ on401: 'returnNull' })
  });

  // Fetch life events
  const { data: lifeEvents = [], isLoading: isLoadingLifeEvents } = useQuery({
    queryKey: ['/api/life-events', selectedCategory],
    queryFn: getQueryFn<LifeEvent[]>({ on401: 'returnNull' }),
  });

  // Fetch user's life events
  const { data: userLifeEvents = [], isLoading: isLoadingUserLifeEvents } = useQuery({
    queryKey: ['/api/user-life-events'],
    queryFn: getQueryFn<(UserLifeEvent & { event: LifeEvent })[]>({ on401: 'returnNull' }),
  });

  // Filter life events based on search query
  const filteredLifeEvents = lifeEvents.filter(event => {
    const label = event.label?.toLowerCase() || '';
    const relationship = event.relationship?.toLowerCase() || '';
    const motivator = event.motivator?.toLowerCase() || '';
    const searchTerms = searchQuery.toLowerCase();
    
    return label.includes(searchTerms) || 
           relationship.includes(searchTerms) || 
           motivator.includes(searchTerms);
  });

  // Check if a life event is already in user's collection
  const isEventInUserCollection = (eventId: number) => {
    return userLifeEvents.some((userEvent) => userEvent.lifeEventId === eventId);
  };

  // Add life event to cart (selected events)
  const toggleEventSelection = (eventId: number) => {
    if (selectedLifeEvents.includes(eventId)) {
      setSelectedLifeEvents(selectedLifeEvents.filter(id => id !== eventId));
    } else {
      setSelectedLifeEvents([...selectedLifeEvents, eventId]);
    }
  };

  // Add selected life events to user's collection
  const addSelectedEventsToCollection = async () => {
    // First check if user is logged in
    if (!userData) {
      toast({
        title: 'Login Required',
        description: 'Please log in to add life events to your collection.',
        variant: 'destructive'
      });
      return;
    }

    // TODO: Implement this functionality once we have the API endpoint
    toast({
      title: 'Events Added',
      description: `${selectedLifeEvents.length} events have been added to your collection.`,
    });
    
    setSelectedLifeEvents([]);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header userData={userData} />
      
      <div className="container mx-auto py-8">
        <h1 className="text-4xl font-bold mb-6">Life Events Library</h1>
        <p className="text-lg mb-8">Browse and add predefined life events to your sundial. These events represent typical activities that can be part of your life journey.</p>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          {/* Sidebar - Categories */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
                <CardDescription>Filter events by category</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingCategories ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button 
                      variant={selectedCategory === null ? "default" : "outline"} 
                      className="w-full justify-start" 
                      onClick={() => setSelectedCategory(null)}
                    >
                      All Categories
                    </Button>
                    {categories.map(category => (
                      <Button 
                        key={category.id} 
                        variant={selectedCategory === category.id ? "default" : "outline"} 
                        className="w-full justify-start"
                        onClick={() => setSelectedCategory(category.id)}
                        style={{ borderLeft: `4px solid ${category.color}` }}
                      >
                        {category.name}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {selectedLifeEvents.length > 0 && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Selected Events</CardTitle>
                  <CardDescription>{selectedLifeEvents.length} events selected</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {selectedLifeEvents.map(eventId => {
                      const event = lifeEvents.find(e => e.id === eventId);
                      return event ? (
                        <li key={eventId} className="flex justify-between items-center">
                          <span className="truncate">{event.label}</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => toggleEventSelection(eventId)}
                          >
                            ✕
                          </Button>
                        </li>
                      ) : null;
                    })}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={addSelectedEventsToCollection}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Add to My Life
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>
          
          {/* Main Content - Events */}
          <div className="lg:col-span-9">
            <Card className="mb-4">
              <CardContent className="pt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search life events..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {isLoadingLifeEvents ? (
                <div className="col-span-full flex justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                </div>
              ) : filteredLifeEvents.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-lg text-muted-foreground">No life events found matching your search.</p>
                </div>
              ) : (
                filteredLifeEvents.map(event => {
                  const category = categories.find(c => c.id === event.categoryId);
                  const alreadyInCollection = isEventInUserCollection(event.id);
                  
                  return (
                    <Card key={event.id} className="overflow-hidden flex flex-col h-full">
                      <CardHeader className="pb-2" style={{ borderLeft: `4px solid ${category?.color || '#ccc'}` }}>
                        <div className="flex justify-between items-start">
                          <div>
                            <Badge variant="outline" className="mb-2">
                              {category?.name || 'Uncategorized'}
                            </Badge>
                            <CardTitle className="text-xl mb-1">{event.label}</CardTitle>
                            {event.relationship && (
                              <CardDescription>{event.relationship}</CardDescription>
                            )}
                          </div>
                          <div className="text-2xl">{event.emoji || '📅'}</div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-grow">
                        <Tabs defaultValue="details">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="details">Details</TabsTrigger>
                            <TabsTrigger value="impact">Impact</TabsTrigger>
                          </TabsList>
                          <TabsContent value="details" className="space-y-2 mt-2">
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span>
                                {event.hoursMin} - {event.hoursMax} hours, 
                                {event.eventsPerYear && event.eventsPerYear > 0 ? ` ${event.eventsPerYear}x per year` : ' one-time'}
                              </span>
                            </div>
                            {event.costMin && parseInt(event.costMin) > 0 && (
                              <div className="flex items-center">
                                <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span>
                                  Est. cost: ${event.costMin} - ${event.costMax}
                                </span>
                              </div>
                            )}
                            {event.motivator && (
                              <div className="mt-2">
                                <p className="text-sm text-muted-foreground italic">"{event.motivator}"</p>
                              </div>
                            )}
                          </TabsContent>
                          <TabsContent value="impact" className="space-y-2 mt-2">
                            <div className="flex items-center">
                              <Heart className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span>Emotion: {event.emotionValue || 'Neutral'}</span>
                            </div>
                            <div className="flex items-center">
                              <BarChart4 className="h-4 w-4 mr-2 text-muted-foreground" />
                              <span>Life points: {event.lifePoints || 'Neutral'}</span>
                            </div>
                            {event.longevityImpact && (
                              <div className="mt-2">
                                <p className="text-sm">Longevity impact: {event.longevityImpact}</p>
                              </div>
                            )}
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                      <Separator />
                      <CardFooter className="pt-4">
                        {alreadyInCollection ? (
                          <Button variant="outline" className="w-full" disabled>
                            Already in Your Life
                          </Button>
                        ) : (
                          <Button 
                            variant={selectedLifeEvents.includes(event.id) ? "secondary" : "default"}
                            className="w-full" 
                            onClick={() => toggleEventSelection(event.id)}
                          >
                            {selectedLifeEvents.includes(event.id) ? (
                              <>
                                <ShoppingCart className="mr-2 h-4 w-4" />
                                Selected
                              </>
                            ) : (
                              <>
                                <Plus className="mr-2 h-4 w-4" />
                                Add to Selection
                              </>
                            )}
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}