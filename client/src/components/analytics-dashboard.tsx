import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { UserData, Activity } from '@shared/schema';
import { 
  Clock, 
  Calendar, 
  BarChart2, 
  PieChart as PieChartIcon, 
  Activity as ActivityIcon,
  TrendingUp,
  Heart,
  Hourglass,
  Sun,
  Moon
} from 'lucide-react';
import {
  calculatePercentageLived,
  calculateTotalBCH,
  calculateUsedBCH,
  calculateRemainingBCH,
  formatTimeToBCH,
  calculateTotalLifetimeHours,
  calculateNetLifeImpact
} from '@/lib/calculations';

interface AnalyticsDashboardProps {
  userData: UserData;
  activities: Activity[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

const AnalyticsDashboard = ({ userData, activities }: AnalyticsDashboardProps) => {
  const [activeTab, setActiveTab] = useState('forecast');
  
  // Calculate key metrics
  const percentageLived = calculatePercentageLived(userData);
  const totalBCH = calculateTotalBCH(userData);
  const usedBCH = calculateUsedBCH(userData);
  const remainingBCH = calculateRemainingBCH(userData);
  const totalActivityHours = calculateTotalLifetimeHours(userData, activities);
  const percentageAllocated = totalBCH > 0 ? (totalActivityHours / totalBCH) * 100 : 0;
  
  // Use lifeImpact instead of impact for activities
  const netImpact = (!activities || activities.length === 0) 
    ? 0
    : activities.reduce((sum, activity) => sum + activity.lifeImpact, 0) / activities.length;
  
  // Calculate days remaining based on life expectancy
  const daysRemaining = Math.round(((userData.lifeExpectancy || 85) - (userData.age || 30)) * 365.25);
  
  // Calculate sleep metrics
  const sleepHoursLifetime = (userData.sleepHours || 8) * 365.25 * ((userData.lifeExpectancy || 85) - (userData.age || 30));
  const awakeHoursPerDay = 24 - (userData.sleepHours || 8);
  const totalAwakeHoursRemaining = awakeHoursPerDay * 365.25 * ((userData.lifeExpectancy || 85) - (userData.age || 30));
  
  // Sundial time calculations
  const sundialTimeOfDay = '3:59:41 PM'; // From CSV
  const sundialHoursLeft = '7:00:19'; // From CSV
  const sundialSunrise = '7:00:00 AM'; // From CSV
  const sundialSunset = '11:00:00 PM'; // From CSV
  
  // Events calculations
  const eventsInForecast = 307844; // From CSV
  const percentOnAutoPilot = 100; // From CSV
  
  // Ideal self profile
  const idealSelfHoursRequired = 122860; // From CSV
  const idealSelfSundialTimeRequired = '6:49:29'; // From CSV
  const idealSelfAgeRequired = 141; // From CSV

  // Overview data
  const overviewData = [
    { name: 'Journey Complete', value: percentageLived },
    { name: 'Journey Remaining', value: 100 - percentageLived }
  ];
  
  // Time allocation data
  const timeAllocationData = [
    { name: 'Sleep', hours: sleepHoursLifetime },
    { name: 'Conscious Hours', hours: totalAwakeHoursRemaining }
  ];
  
  // Activity allocation data
  const activityAllocationData = (!activities || activities.length === 0) 
    ? []
    : activities.map(activity => ({
        name: activity.name,
        hours: activity.frequency * activity.duration * ((userData.lifeExpectancy || 85) - (userData.age || 30)) * (activity.frequencyUnit === 'week' ? 52 : activity.frequencyUnit === 'month' ? 12 : activity.frequencyUnit === 'year' ? 1 : 365)
      })).sort((a, b) => b.hours - a.hours);
  
  // Life quality projection data
  const generateProjectionData = () => {
    const data = [];
    const currentAge = userData.age || 30;
    const projectionYears = Math.min(30, (userData.lifeExpectancy || 85) - currentAge);
    
    for (let i = 0; i <= projectionYears; i++) {
      const projectedAge = currentAge + i;
      const percentComplete = (projectedAge / (userData.lifeExpectancy || 85)) * 100;
      let qualityScore = 100 - (percentComplete * 0.5); // Base quality that decreases with age
      
      // Add some variation and impact from activities
      if (activities && activities.length > 0) {
        const positiveImpact = activities.reduce((sum, activity) => 
          sum + (activity.lifeImpact > 0 ? activity.lifeImpact : 0), 0) / activities.length;
        qualityScore += positiveImpact * 2 * (1 - i/projectionYears); // Impact decreases over time
      }
      
      // Ensure score is between 0 and 100
      qualityScore = Math.max(0, Math.min(100, qualityScore));
      
      data.push({
        age: projectedAge,
        quality: Math.round(qualityScore),
        bcHoursRemaining: Math.round(remainingBCH * (1 - i/projectionYears))
      });
    }
    
    return data;
  };
  
  const lifeQualityProjectionData = generateProjectionData();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-2">Life Forecast</h1>
      <p className="text-lg mb-8">See the projected impact of your choices on your life journey</p>
      
      <Tabs defaultValue="forecast" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="hidden">
          <TabsTrigger value="forecast">
            <TrendingUp className="mr-2 h-4 w-4" />
            Life Forecast
          </TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Life Journey</CardTitle>
                <CardDescription>Your progress through life</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{percentageLived.toFixed(1)}%</div>
                <Progress value={percentageLived} className="mt-2" />
                <p className="text-sm text-muted-foreground mt-2">Completed out of 100%</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Time Remaining</CardTitle>
                <CardDescription>Days left in your journey</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{daysRemaining.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground mt-2">Based on average life expectancy</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Conscious Hours</CardTitle>
                <CardDescription>Waking hours remaining</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatTimeToBCH(remainingBCH)}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  {percentageAllocated.toFixed(1)}% allocated to activities
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Net Life Impact</CardTitle>
                <CardDescription>Quality of time allocation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{netImpact > 0 ? '+' : ''}{netImpact.toFixed(1)}</div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={netImpact > 0 ? "default" : "destructive"}>
                    {netImpact > 0 ? "Positive" : "Needs Improvement"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="h-[400px]">
              <CardHeader>
                <CardTitle>Life Journey Visualization</CardTitle>
                <CardDescription>Visual representation of your life progress</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={overviewData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                    >
                      {overviewData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#0088FE' : '#FFBB28'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card className="h-[400px]">
              <CardHeader>
                <CardTitle>Time Allocation</CardTitle>
                <CardDescription>How your remaining time is allocated</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={timeAllocationData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="hours"
                      label={({ name, hours }) => `${name}: ${Math.round(hours).toLocaleString()} hrs`}
                    >
                      {timeAllocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => Math.round(value).toLocaleString() + ' hours'} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Sundial Status</CardTitle>
              <CardDescription>Your position in the day of life</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
                  <Sun className="h-8 w-8 mb-2 text-yellow-500" />
                  <div className="text-sm font-medium">Sundial Sunrise</div>
                  <div className="text-2xl font-bold">{sundialSunrise}</div>
                </div>
                
                <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
                  <Clock className="h-8 w-8 mb-2 text-blue-500" />
                  <div className="text-sm font-medium">Current Time</div>
                  <div className="text-2xl font-bold">{sundialTimeOfDay}</div>
                </div>
                
                <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
                  <Moon className="h-8 w-8 mb-2 text-purple-500" />
                  <div className="text-sm font-medium">Sundial Sunset</div>
                  <div className="text-2xl font-bold">{sundialSunset}</div>
                </div>
                
                <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
                  <Hourglass className="h-8 w-8 mb-2 text-red-500" />
                  <div className="text-sm font-medium">Hours Left</div>
                  <div className="text-2xl font-bold">{sundialHoursLeft}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Time Analytics Tab */}
        <TabsContent value="time" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total Budget</CardTitle>
                <CardDescription>Lifetime conscious hours</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalBCH.toLocaleString()}</div>
                <Progress 
                  value={(usedBCH / totalBCH) * 100} 
                  className="mt-2" 
                />
                <p className="text-sm text-muted-foreground mt-2">
                  {usedBCH.toLocaleString()} hours used ({((usedBCH / totalBCH) * 100).toFixed(1)}%)
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Daily Waking Hours</CardTitle>
                <CardDescription>Hours awake each day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{awakeHoursPerDay}</div>
                <div className="mt-2 grid grid-cols-24 gap-1">
                  {Array.from({length: 24}).map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-2 rounded-full ${
                        i >= 24 - awakeHoursPerDay ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {userData.sleepHours || 8} hours of sleep per day
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Sleep Budget</CardTitle>
                <CardDescription>Lifetime sleep hours</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{Math.round(sleepHoursLifetime).toLocaleString()}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  {((sleepHoursLifetime / (sleepHoursLifetime + totalAwakeHoursRemaining)) * 100).toFixed(1)}% of remaining lifetime
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Card className="h-[400px]">
            <CardHeader>
              <CardTitle>Lifetime Hours Distribution</CardTitle>
              <CardDescription>Breakdown of how your lifetime hours are distributed</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { name: 'Used', hours: usedBCH },
                    { name: 'Remaining', hours: remainingBCH },
                    { name: 'Remaining Sleep', hours: sleepHoursLifetime }
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => Math.round(value).toLocaleString() + ' hours'} />
                  <Bar dataKey="hours" fill="#8884d8">
                    <Cell fill="#FF8042" />
                    <Cell fill="#00C49F" />
                    <Cell fill="#0088FE" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Ideal Self Projection</CardTitle>
                <CardDescription>Gap between current and ideal self</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Ideal Self Hours Required:</span>
                  <span className="font-bold">{idealSelfHoursRequired.toLocaleString()} hours</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Current Budget:</span>
                  <span className="font-bold">{totalBCH.toLocaleString()} hours</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Deficit:</span>
                  <span className="font-bold text-red-500">
                    {(idealSelfHoursRequired - totalBCH).toLocaleString()} hours
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Required Age to Achieve:</span>
                  <span className="font-bold">{idealSelfAgeRequired} years</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span>Sundial Time Required:</span>
                  <span className="font-bold">{idealSelfSundialTimeRequired}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Time Efficiency Metrics</CardTitle>
                <CardDescription>How efficiently your time is being used</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Events in Forecast:</span>
                  <span className="font-bold">{eventsInForecast.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Time on Autopilot:</span>
                  <span className="font-bold">{percentOnAutoPilot}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Conscious Decision Opportunity:</span>
                  <span className="font-bold">{100 - percentOnAutoPilot}%</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span>Time Investment in Planning:</span>
                  <span className="font-bold">8 hours</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Planning ROI (est.):</span>
                  <span className="font-bold text-green-500">
                    +{Math.round(8 * 10).toLocaleString()} hours
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total Activities</CardTitle>
                <CardDescription>Number of defined activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{(!activities || activities.length === 0) ? 0 : activities.length}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  {(!activities || activities.length === 0) ? 0 : activities.filter(a => a.lifeImpact > 0).length} positive impact activities
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Time Allocated</CardTitle>
                <CardDescription>Hours assigned to activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatTimeToBCH(totalActivityHours)}</div>
                <Progress value={percentageAllocated} className="mt-2" />
                <p className="text-sm text-muted-foreground mt-2">
                  {percentageAllocated.toFixed(1)}% of total budget allocated
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Average Impact</CardTitle>
                <CardDescription>Per activity impact score</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {(!activities || activities.length === 0) 
                    ? '0.0'
                    : (activities.reduce((sum, act) => sum + act.lifeImpact, 0) / activities.length).toFixed(1)
                  }
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  On a scale from -10 to +10
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Card className="h-[500px]">
            <CardHeader>
              <CardTitle>Activity Hours Distribution</CardTitle>
              <CardDescription>Hours allocated to each activity over lifetime</CardDescription>
            </CardHeader>
            <CardContent>
              {(!activityAllocationData || activityAllocationData.length === 0) ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No activity data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={activityAllocationData.slice(0, 10)} // Top 10 activities by hours
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={100}
                      tick={{ fontSize: 12 }} 
                    />
                    <Tooltip formatter={(value: any) => Math.round(value).toLocaleString() + ' hours'} />
                    <Bar dataKey="hours" fill="#8884d8">
                      {activityAllocationData.slice(0, 10).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Impact Distribution</CardTitle>
                <CardDescription>Activities by impact level</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={(!activities || activities.length === 0) ? [
                        { name: 'High Positive (6-10)', value: 0 },
                        { name: 'Medium Positive (3-5)', value: 0 },
                        { name: 'Low Positive (0-2)', value: 0 },
                        { name: 'Negative', value: 0 }
                      ] : [
                        { name: 'High Positive (6-10)', value: activities.filter(a => a.lifeImpact >= 6).length },
                        { name: 'Medium Positive (3-5)', value: activities.filter(a => a.lifeImpact >= 3 && a.lifeImpact < 6).length },
                        { name: 'Low Positive (0-2)', value: activities.filter(a => a.lifeImpact >= 0 && a.lifeImpact < 3).length },
                        { name: 'Negative', value: activities.filter(a => a.lifeImpact < 0).length }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      <Cell fill="#00C49F" />
                      <Cell fill="#FFBB28" />
                      <Cell fill="#0088FE" />
                      <Cell fill="#FF8042" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Top Activities by Impact</CardTitle>
                <CardDescription>Highest impact activities in your routine</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(!activities || activities.length === 0) ? (
                    <div className="text-center text-muted-foreground py-4">
                      No activities defined yet
                    </div>
                  ) : (
                    activities
                      .sort((a, b) => b.lifeImpact - a.lifeImpact)
                      .slice(0, 5)
                      .map((activity, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div 
                              className="w-2 h-10 mr-3 rounded-full" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <div>
                              <div className="font-medium">{activity.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {activity.frequency} x {activity.frequencyUnit}, {activity.duration} {activity.durationUnit}
                              </div>
                            </div>
                          </div>
                          <Badge 
                            variant={activity.lifeImpact > 5 ? "default" : activity.lifeImpact > 0 ? "outline" : "destructive"}
                          >
                            {activity.lifeImpact > 0 ? '+' : ''}{activity.lifeImpact}
                          </Badge>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">View All Activities</Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        {/* Forecast Tab */}
        <TabsContent value="forecast" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Life Quality Score</CardTitle>
                <CardDescription>Current estimate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {lifeQualityProjectionData[0]?.quality || 0}/100
                </div>
                <Progress 
                  value={lifeQualityProjectionData[0]?.quality || 0} 
                  className="mt-2" 
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Based on activity impact and allocation
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Projected Peak</CardTitle>
                <CardDescription>Age of highest quality</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {lifeQualityProjectionData.sort((a, b) => b.quality - a.quality)[0]?.age || userData.age}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {lifeQualityProjectionData.sort((a, b) => b.quality - a.quality)[0]?.quality || 0}/100 projected quality
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Ideal vs. Reality</CardTitle>
                <CardDescription>Gap to ideal self</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {idealSelfAgeRequired - (userData.lifeExpectancy || 85)} years
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Additional years needed to achieve ideal self
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Card className="h-[500px]">
            <CardHeader>
              <CardTitle>Life Quality Forecast</CardTitle>
              <CardDescription>Projected quality of life over time</CardDescription>
            </CardHeader>
            <CardContent>
              {(!lifeQualityProjectionData || lifeQualityProjectionData.length === 0) ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No projection data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart
                    data={lifeQualityProjectionData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="age" />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="quality"
                      name="Quality Score"
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="bcHoursRemaining"
                      name="Conscious Hours Remaining"
                      stroke="#82ca9d"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Life Expectancy Factors</CardTitle>
                <CardDescription>Key factors affecting life expectancy</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Exercise</span>
                    <span className="text-sm font-medium">+3.5 years</span>
                  </div>
                  <Progress value={70} />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Diet</span>
                    <span className="text-sm font-medium">+2.8 years</span>
                  </div>
                  <Progress value={60} />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Stress Management</span>
                    <span className="text-sm font-medium">+2.1 years</span>
                  </div>
                  <Progress value={50} />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Social Connections</span>
                    <span className="text-sm font-medium">+1.9 years</span>
                  </div>
                  <Progress value={65} />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Sleep Quality</span>
                    <span className="text-sm font-medium">+1.5 years</span>
                  </div>
                  <Progress value={55} />
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">Optimize Life Factors</Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recommendation Engine</CardTitle>
                <CardDescription>AI-driven recommendations for optimal life quality</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Heart className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Increase High-Impact Activities</h4>
                      <p className="text-sm text-muted-foreground">
                        Adding 2 hours weekly to your highest-impact activities could improve quality score by 8%.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <BarChart2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Optimize Sleep Schedule</h4>
                      <p className="text-sm text-muted-foreground">
                        Adjusting sleep pattern could add an estimated 1.2 years to your life expectancy.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Add Key Life Events</h4>
                      <p className="text-sm text-muted-foreground">
                        5 life events from your recommended list could significantly enhance life satisfaction.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full">View Detailed Recommendations</Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;