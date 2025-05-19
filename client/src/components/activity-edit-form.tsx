
import React from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "./ui/card";
import { ActivityInsert } from '@shared/schema';

interface ActivityEditFormProps {
  activity: ActivityInsert;
  imageData: any;
  onSave: (activity: ActivityInsert, imageData: any) => void;
  onCancel: () => void;
}

export function ActivityEditForm({ activity, imageData, onSave, onCancel }: ActivityEditFormProps) {
  const [formData, setFormData] = React.useState(activity);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData, imageData);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Edit Generated Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <Input 
              value={formData.name} 
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <Select 
              value={formData.category}
              onValueChange={value => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {["Health & Fitness", "Learning & Development", "Family & Relationships", 
                  "Career & Finance", "Recreation & Leisure", "Creativity & Expression",
                  "Service & Contribution", "Spirituality & Mindfulness"].map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Frequency</label>
              <Input 
                type="number"
                value={formData.frequency}
                onChange={e => setFormData(prev => ({ ...prev, frequency: parseInt(e.target.value) }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Frequency Unit</label>
              <Select 
                value={formData.frequencyUnit}
                onValueChange={value => setFormData(prev => ({ ...prev, frequencyUnit: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["day", "week", "month", "year"].map(unit => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Duration</label>
              <Input 
                type="number"
                value={formData.duration}
                onChange={e => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Duration Unit</label>
              <Select 
                value={formData.durationUnit}
                onValueChange={value => setFormData(prev => ({ ...prev, durationUnit: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["minute", "hour"].map(unit => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Life Impact (1-10)</label>
            <Input 
              type="number"
              min="1"
              max="10"
              value={formData.lifeImpact}
              onChange={e => setFormData(prev => ({ ...prev, lifeImpact: parseInt(e.target.value) }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Emoji</label>
            <Input 
              value={formData.emoji || ''}
              onChange={e => setFormData(prev => ({ ...prev, emoji: e.target.value }))}
            />
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit}>Save Activity</Button>
      </CardFooter>
    </Card>
  );
}
