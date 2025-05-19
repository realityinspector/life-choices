
import { togetherAIService } from '../server/services/together-ai';
import { storage } from '../server/storage';
import { ActivityInsert } from '../shared/schema';

async function testImageGeneration() {
  try {
    // Get activity 1014
    const activity = await storage.getActivity(1014);
    if (!activity) {
      console.error('Activity 1014 not found');
      return;
    }

    console.log('Found activity:', activity);

    // Convert to ActivityInsert format
    const activityInsert: ActivityInsert = {
      name: activity.name,
      category: activity.category,
      frequency: activity.frequency,
      frequencyUnit: activity.frequencyUnit,
      duration: activity.duration,
      durationUnit: activity.durationUnit,
      lifeImpact: activity.lifeImpact,
      color: activity.color,
      priority: activity.priority,
      emoji: activity.emoji,
      exportToCalendar: activity.exportToCalendar,
      clusterId: activity.clusterId
    };

    // Generate image
    console.log('Generating image for activity...');
    const imageData = await togetherAIService.generateImageForActivity(activityInsert);
    
    if (!imageData) {
      console.error('Failed to generate image');
      return;
    }

    console.log('Generated image data:', imageData);

    // Associate image with activity
    const savedImage = await storage.createActivityImage({
      activityId: activity.id,
      filename: imageData.filename,
      originalFilename: imageData.originalFilename,
      path: imageData.path,
      mimeType: imageData.mimeType
    });

    console.log('Successfully associated image:', savedImage);
  } catch (error) {
    console.error('Error in test:', error);
  }
}

// Run the test
testImageGeneration().then(() => process.exit(0));
