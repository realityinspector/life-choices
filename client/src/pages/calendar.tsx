import { useState, useEffect } from 'react';
import { useUser } from '@/context/user-context';
import { 
  Calendar as CalendarIcon, 
  Loader2, 
  Check, 
  ExternalLink, 
  Download, 
  FileDown,
  FileText,
  MoreHorizontal,
  DownloadCloud
} from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/header';
import { SiGooglecalendar, SiApple } from 'react-icons/si';
import { Activity } from '@shared/schema';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function CalendarPage() {
  const { userData, activities, updateActivity } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [selectedActivities, setSelectedActivities] = useState<number[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    if (activities.length > 0) {
      setFilteredActivities(activities);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [activities]);

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedActivities([]);
    } else {
      setSelectedActivities(filteredActivities.map(activity => activity.id));
    }
    setSelectAll(!selectAll);
  };

  const toggleActivitySelection = (activityId: number) => {
    if (selectedActivities.includes(activityId)) {
      setSelectedActivities(selectedActivities.filter(id => id !== activityId));
    } else {
      setSelectedActivities([...selectedActivities, activityId]);
    }
  };

  const toggleExportToCalendar = async (activity: Activity) => {
    try {
      const updatedActivity = {
        ...activity,
        exportToCalendar: !activity.exportToCalendar
      };
      await updateActivity(activity.id, updatedActivity);
      toast({
        title: updatedActivity.exportToCalendar ? 'Added to calendar exports' : 'Removed from calendar exports',
        description: `"${activity.name}" will ${updatedActivity.exportToCalendar ? 'now' : 'no longer'} be exported to calendar`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error updating activity:', error);
      toast({
        title: 'Error',
        description: 'Failed to update calendar export setting',
        variant: 'destructive',
      });
    }
  };

  const generateICalendar = (activities: Activity[]) => {
    // Generate iCalendar (.ics) format for selected activities
    let icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LIFE CHOICES//Calendar Export//EN'
    ];

    activities.forEach(activity => {
      // Calculate next due date if available, otherwise use current date
      const startDate = activity.nextDue ? new Date(activity.nextDue) : new Date();
      const endDate = new Date(startDate.getTime());
      
      // Add duration to end date (convert minutes to milliseconds)
      if (activity.durationUnit === 'minute') {
        endDate.setMinutes(endDate.getMinutes() + activity.duration);
      } else if (activity.durationUnit === 'hour') {
        endDate.setHours(endDate.getHours() + activity.duration);
      }

      // Format dates for iCalendar (YYYYMMDDTHHMMSSZ)
      const formatDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/g, '');
      };

      icalContent.push(
        'BEGIN:VEVENT',
        `UID:${activity.id}@lifechoices.app`,
        `SUMMARY:${activity.name}`,
        `DESCRIPTION:${activity.category} - Impact: ${activity.lifeImpact}`,
        `DTSTART:${formatDate(startDate)}`,
        `DTEND:${formatDate(endDate)}`,
        `CATEGORIES:${activity.category}`,
        'END:VEVENT'
      );
    });

    icalContent.push('END:VCALENDAR');
    return icalContent.join('\r\n');
  };

  const downloadCalendarExport = (format: 'ical' | 'google' | 'outlook' | 'apple') => {
    const activitiesToExport = selectedActivities.length > 0 
      ? filteredActivities.filter(a => selectedActivities.includes(a.id))
      : filteredActivities.filter(a => a.exportToCalendar);

    if (activitiesToExport.length === 0) {
      toast({
        title: 'No activities selected',
        description: 'Please select activities to export or mark them for calendar export',
        variant: 'destructive',
      });
      return;
    }

    if (format === 'ical') {
      // Download as iCalendar file
      const icalData = generateICalendar(activitiesToExport);
      const blob = new Blob([icalData], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'life-choices-activities.ics';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Calendar exported',
        description: `${activitiesToExport.length} activities exported to iCalendar format`,
        variant: 'default',
      });
    } else if (format === 'google') {
      // Generate Google Calendar export links
      // For simplicity, we'll just create one event for demo purposes
      // In a real implementation, you'd want to handle multiple events or create an import URL
      
      const activity = activitiesToExport[0];
      const startDate = activity.nextDue ? new Date(activity.nextDue) : new Date();
      const endDate = new Date(startDate.getTime());
      
      if (activity.durationUnit === 'minute') {
        endDate.setMinutes(endDate.getMinutes() + activity.duration);
      } else if (activity.durationUnit === 'hour') {
        endDate.setHours(endDate.getHours() + activity.duration);
      }
      
      const formatGoogleDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/g, '');
      };
      
      const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(activity.name)}&details=${encodeURIComponent(activity.category)}&dates=${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`;
      
      // Open Google Calendar in new tab
      window.open(googleUrl, '_blank');
      
      toast({
        title: 'Google Calendar',
        description: 'Opening Google Calendar in a new tab',
        variant: 'default',
      });
    } else {
      // For Outlook and Apple calendar, we'll download the ICS file which works with both
      const icalData = generateICalendar(activitiesToExport);
      const blob = new Blob([icalData], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `life-choices-activities-${format}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: `${format === 'outlook' ? 'Outlook' : 'Apple'} Calendar export`,
        description: `${activitiesToExport.length} activities exported to ${format === 'outlook' ? 'Outlook' : 'Apple'} Calendar format`,
        variant: 'default',
      });
    }
  };

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg text-center">
          <h1 className="text-2xl font-bold mb-4">Login Required</h1>
          <p className="mb-6">Please log in to view your calendar.</p>
          <Link href="/login">
            <button className="bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 rounded-lg">
              Go to Login
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
        <Header userData={userData} />
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
      <Header userData={userData} />

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Calendar Export</h2>
          
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <DownloadCloud className="h-4 w-4 mr-2" />
                  Export To
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Choose Format</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => downloadCalendarExport('ical')}>
                  <FileDown className="h-4 w-4 mr-2" />
                  <span>iCalendar (.ics)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadCalendarExport('google')}>
                  <SiGooglecalendar className="h-4 w-4 mr-2" />
                  <span>Google Calendar</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadCalendarExport('outlook')}>
                  <SiMicrosoftoffice className="h-4 w-4 mr-2" />
                  <span>Outlook Calendar</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadCalendarExport('apple')}>
                  <SiApple className="h-4 w-4 mr-2" />
                  <span>Apple Calendar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle>Calendar Integration</CardTitle>
            <CardDescription>
              Export your activities to your preferred calendar application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Select activities to export or toggle the "Export to Calendar" option to include them in all future exports.
            </p>
            
            <div className="flex items-center space-x-2 mb-4">
              <Checkbox id="select-all" checked={selectAll} onCheckedChange={toggleSelectAll} />
              <Label htmlFor="select-all" className="text-sm font-medium">
                Select All Activities ({filteredActivities.length})
              </Label>
            </div>
          </CardContent>
        </Card>
        
        <div className="space-y-3">
          {filteredActivities.length > 0 ? (
            filteredActivities.map(activity => (
              <div 
                key={activity.id} 
                className="bg-white rounded-lg border border-gray-200 p-4 flex justify-between items-center"
              >
                <div className="flex items-center gap-3">
                  <Checkbox 
                    id={`select-${activity.id}`} 
                    checked={selectedActivities.includes(activity.id)}
                    onCheckedChange={() => toggleActivitySelection(activity.id)}
                  />
                  <div>
                    <h3 className="font-medium">{activity.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="inline-block px-2 py-1 rounded-full text-xs" 
                        style={{ 
                          backgroundColor: `${activity.color}20`, 
                          color: activity.color
                        }}
                      >
                        {activity.category}
                      </span>
                      <span>•</span>
                      <span>
                        {activity.frequency} {activity.frequencyUnit}{activity.frequency > 1 ? 's' : ''}
                      </span>
                      <span>•</span>
                      <span>
                        {activity.duration} {activity.durationUnit}{activity.duration > 1 ? 's' : ''}
                      </span>
                      {activity.nextDue && (
                        <>
                          <span>•</span>
                          <span>Next: {new Date(activity.nextDue).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`export-${activity.id}`}
                      checked={activity.exportToCalendar}
                      onCheckedChange={() => toggleExportToCalendar(activity)}
                    />
                    <Label htmlFor={`export-${activity.id}`} className="sr-only">
                      Export to Calendar
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {activity.exportToCalendar ? 'Exporting' : 'Not exporting'}
                    </span>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => downloadCalendarExport('google')}>
                        <SiGooglecalendar className="h-4 w-4 mr-2" />
                        <span>Google Calendar</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => downloadCalendarExport('outlook')}>
                        <SiMicrosoftoutlook className="h-4 w-4 mr-2" />
                        <span>Outlook Calendar</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => downloadCalendarExport('apple')}>
                        <SiApple className="h-4 w-4 mr-2" />
                        <span>Apple Calendar</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => downloadCalendarExport('ical')}>
                        <FileDown className="h-4 w-4 mr-2" />
                        <span>Download .ics</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <CalendarIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">No Activities Found</h3>
              <p className="text-gray-500 mb-4">
                Add some activities to your schedule to export them to your calendar.
              </p>
              <Link href="/shop-activities">
                <Button>
                  Add Activities
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}