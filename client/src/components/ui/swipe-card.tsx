import React, { useState, useRef, useEffect } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Activity } from '@shared/schema';
import { CheckCircle, X, ShoppingBag, Info, Calendar } from 'lucide-react';

interface SwipeCardProps {
  activity: Activity;
  onComplete?: (activity: Activity) => void;
  onSkip?: (activity: Activity) => void;
  onAddToCart?: (activity: Activity) => void;
  onInfo?: (activity: Activity) => void;
  onToggleCalendarExport?: (activity: Activity) => void;
  isActive?: boolean;
  userActivities?: Activity[]; // Add user activities to check if this activity exists
}

export function SwipeCard({
  activity,
  onComplete,
  onSkip,
  onAddToCart,
  onInfo,
  onToggleCalendarExport,
  isActive = true,
  userActivities = [],
}: SwipeCardProps) {
  const [exitX, setExitX] = useState<number | null>(null);
  const [exitY, setExitY] = useState<number | null>(null);
  const [actionType, setActionType] = useState<'complete' | 'skip' | 'cart' | null>(null);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const cardWidth = useRef(0);
  const cardHeight = useRef(0);
  
  useEffect(() => {
    if (cardRef.current) {
      cardWidth.current = cardRef.current.offsetWidth;
      cardHeight.current = cardRef.current.offsetHeight;
    }
  }, []);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-30, 0, 30]);
  
  const completeOpacity = useTransform(x, [0, 75], [0, 1]);
  const skipOpacity = useTransform(x, [-75, 0], [1, 0]);
  const cartOpacity = useTransform(y, [-75, 0], [1, 0]);
  
  const panConstraints = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };
  
  // Check if this activity already exists in the user's collection
  const activityExists = userActivities.some(a => a.name === activity.name);
  
  const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const xOffset = info.offset.x;
    const yOffset = info.offset.y;
    
    if (xOffset > 100) {
      // Swiped right - complete
      setExitX(cardWidth.current + 200);
      setActionType('complete');
      setTimeout(() => onComplete?.(activity), 200);
    } else if (xOffset < -100) {
      // Swiped left - skip
      setExitX(-cardWidth.current - 200);
      setActionType('skip');
      setTimeout(() => onSkip?.(activity), 200);
    } else if (yOffset < -100) {
      // Swiped up - add to cart if not already in collection, otherwise complete
      setExitY(-cardHeight.current - 200);
      setActionType('cart');
      setTimeout(() => {
        if (activityExists) {
          onComplete?.(activity);
        } else {
          onAddToCart?.(activity);
        }
      }, 200);
    } else {
      // Reset position
      x.set(0);
      y.set(0);
    }
  };
  
  const getBackgroundColor = () => {
    switch (activity.category.toLowerCase()) {
      case 'work':
        return 'bg-cyan-50';
      case 'health':
        return 'bg-yellow-50';
      case 'personal':
        return 'bg-blue-50';
      case 'learning':
        return 'bg-indigo-50';
      case 'family':
        return 'bg-purple-50';
      default:
        return 'bg-gray-50';
    }
  };
  
  if (!isActive && (exitX !== null || exitY !== null)) {
    return null;
  }
  
  return (
    <motion.div
      ref={cardRef}
      className="absolute w-full max-w-md"
      style={{
        x,
        y, 
        rotate,
        top: 0,
        left: 0,
        right: 0,
        margin: 'auto',
        zIndex: isActive ? 10 : 5,
      }}
      drag={isActive}
      dragConstraints={panConstraints}
      onDragEnd={handleDragEnd}
      initial={false}
      animate={
        exitX !== null
          ? { x: exitX }
          : exitY !== null
          ? { y: exitY }
          : { x: 0, y: 0 }
      }
      transition={{ type: 'spring', damping: 40, stiffness: 300 }}
    >
      <div className={cn(
        "relative rounded-xl overflow-hidden shadow-lg min-h-[420px] flex flex-col",
        getBackgroundColor()
      )}>
        {/* Action Hints - these fade in/out based on drag direction */}
        <motion.div 
          className="absolute top-4 right-4 bg-green-500 text-white p-3 rounded-full z-20"
          style={{ opacity: completeOpacity }}
        >
          <CheckCircle size={28} />
        </motion.div>
        
        <motion.div 
          className="absolute top-4 left-4 bg-red-500 text-white p-3 rounded-full z-20"
          style={{ opacity: skipOpacity }}
        >
          <X size={28} />
        </motion.div>
        
        <motion.div 
          className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white p-3 rounded-full z-20"
          style={{ opacity: cartOpacity }}
        >
          <ShoppingBag size={28} />
        </motion.div>
        
        {/* Activity Content */}
        <div className="p-6 flex-1 flex flex-col">
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2 text-gray-800">{activity.name}</h2>
            <div className="mb-4 inline-block px-3 py-1 rounded-full text-sm font-medium" 
              style={{ 
                backgroundColor: `${activity.color}20`, 
                color: activity.color
              }}
            >
              {activity.category}
            </div>
            
            <div className="mb-6 space-y-4">
              <div className="flex items-center text-gray-700">
                <span className="font-medium">Frequency:</span>
                <span className="ml-2">
                  {activity.frequency} {activity.frequencyUnit}{activity.frequency > 1 ? 's' : ''}
                </span>
              </div>
              
              <div className="flex items-center text-gray-700">
                <span className="font-medium">Duration:</span>
                <span className="ml-2">
                  {activity.duration} {activity.durationUnit}{activity.duration > 1 ? 's' : ''}
                </span>
              </div>
              
              <div className="flex items-center text-gray-700">
                <span className="font-medium">Impact:</span>
                <span className={cn(
                  "ml-2 px-2 py-1 rounded-full text-xs font-medium",
                  activity.lifeImpact > 0 
                    ? "bg-green-100 text-green-800" 
                    : activity.lifeImpact < 0 
                    ? "bg-red-100 text-red-800" 
                    : "bg-gray-100 text-gray-800"
                )}>
                  {activity.lifeImpact > 0 
                    ? "Positive" 
                    : activity.lifeImpact < 0 
                    ? "Negative" 
                    : "Neutral"}
                </span>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="grid grid-cols-4 gap-2 mt-auto">
            <button 
              onClick={() => onSkip?.(activity)}
              className="flex flex-col items-center justify-center py-3 bg-white rounded-xl shadow-sm hover:bg-gray-50 transition-colors"
            >
              <X size={20} className="text-red-500" />
              <span className="text-xs mt-1 text-gray-600">Skip</span>
            </button>
            
            <button 
              onClick={() => onInfo?.(activity)}
              className="flex flex-col items-center justify-center py-3 bg-white rounded-xl shadow-sm hover:bg-gray-50 transition-colors"
            >
              <Info size={20} className="text-blue-500" />
              <span className="text-xs mt-1 text-gray-600">Info</span>
            </button>
            
            <button 
              onClick={() => onToggleCalendarExport?.(activity)}
              className="flex flex-col items-center justify-center py-3 bg-white rounded-xl shadow-sm hover:bg-gray-50 transition-colors"
            >
              <Calendar size={20} className={activity.exportToCalendar ?? false ? "text-purple-500" : "text-gray-400"} />
              <span className="text-xs mt-1 text-gray-600">
                {activity.exportToCalendar ?? false ? "In Calendar" : "Add to Cal"}
              </span>
            </button>
            
            <button 
              onClick={() => {
                if (onComplete) {
                  onComplete(activity);
                }
              }}
              className="flex flex-col items-center justify-center py-3 bg-white rounded-xl shadow-sm hover:bg-gray-50 transition-colors"
            >
              <CheckCircle size={20} className="text-green-500" />
              <span className="text-xs mt-1 text-gray-600">Complete</span>
            </button>
          </div>
          
          {/* Action Button - Conditional based on whether activity already exists */}
          {activityExists ? (
            <button 
              onClick={() => onComplete?.(activity)}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-xl hover:bg-green-600 transition-colors"
            >
              <CheckCircle size={18} />
              <span>Complete</span>
            </button>
          ) : (
            <button 
              onClick={() => onAddToCart?.(activity)}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-blue-500 text-white py-3 rounded-xl hover:bg-blue-600 transition-colors"
            >
              <ShoppingBag size={18} />
              <span>Add to Cart</span>
            </button>
          )}
          
          {/* Swipe Instructions */}
          <div className="mt-3 text-center text-xs text-gray-500">
            <p>Swipe right to complete, left to skip, up to {activityExists ? 'complete' : 'add to cart'}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}