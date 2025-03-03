import { useState } from "react";
import { useUser } from "@/context/user-context";
import { 
  calculateProjectedLifePercentage,
  calculateUsedBCHByAge,
  calculateRemainingBCHByAge,
  formatTimeToBCH,
  calculateProjectedActivityHours,
  calculateProjectedActivityPercentage,
  calculateTotalProjectedPercentage,
  calculateProjectedLifeImpact
} from "@/lib/calculations";

interface TimeMachineProps {}

const TimeMachine = ({}: TimeMachineProps) => {
  const { userData, activities } = useUser();
  const [projectionAge, setProjectionAge] = useState<number>(
    Math.min(Math.max(userData.age + 10, userData.age), userData.lifeExpectancy)
  );

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Time Machine: Future Projections</h2>
        
        <div className="mb-6">
          <label htmlFor="projectionYear" className="block text-sm font-medium text-gray-700 mb-1">Project to Age</label>
          <div className="flex items-center space-x-4">
            <input 
              type="range" 
              id="projectionYear" 
              value={projectionAge}
              onChange={(e) => setProjectionAge(parseInt(e.target.value))}
              min={userData.age} 
              max={userData.lifeExpectancy} 
              className="w-full max-w-md h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" 
            />
            <span className="text-lg font-medium text-gray-900">{projectionAge} years old</span>
          </div>
          <p className="mt-1 text-sm text-gray-500">That's {projectionAge - userData.age} years from now</p>
        </div>
        
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Projected Time Allocation by Age {projectionAge}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Life Statistics */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-base font-medium text-gray-900 mb-4">Life Statistics</h4>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Projected Life Status</p>
                  <div className="mt-1 flex items-center">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-primary-600 h-2.5 rounded-full" 
                        style={{ width: `${calculateProjectedLifePercentage(projectionAge, userData.lifeExpectancy)}%` }}
                      ></div>
                    </div>
                    <span className="ml-3 text-sm font-medium text-gray-900">
                      {calculateProjectedLifePercentage(projectionAge, userData.lifeExpectancy)}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {calculateProjectedLifePercentage(projectionAge, userData.lifeExpectancy)}% of expected life completed
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Years Lived</p>
                    <p className="text-2xl font-bold text-gray-900">{projectionAge}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Years Remaining</p>
                    <p className="text-2xl font-bold text-gray-900">{userData.lifeExpectancy - projectionAge}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Conscious Hours Used</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatTimeToBCH(calculateUsedBCHByAge(projectionAge, userData))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Conscious Hours Left</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatTimeToBCH(calculateRemainingBCHByAge(projectionAge, userData))}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Activity Projections */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-base font-medium text-gray-900 mb-4">Activity Projections</h4>
              
              {activities.length > 0 ? (
                <ul className="space-y-3">
                  {activities.map((activity, index) => (
                    <li key={index} className="flex items-center">
                      <div className={`h-4 w-4 rounded-full mr-3 bg-${activity.color}-500`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{activity.name}</p>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full bg-${activity.color}-500`} 
                            style={{ width: `${calculateProjectedActivityPercentage(activity, projectionAge, userData)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="ml-3 flex-shrink-0 text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {calculateProjectedActivityHours(activity, projectionAge, userData).toLocaleString()} hours
                        </p>
                        <p className="text-xs text-gray-500">
                          {calculateProjectedActivityPercentage(activity, projectionAge, userData)}% of conscious time
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    No activities to project. <button className="text-primary-600 hover:underline">Add activities</button> to see projections.
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Time Allocation Visualization */}
          <div className="mt-6">
            <h4 className="text-base font-medium text-gray-900 mb-4">Allocation of Conscious Hours by Age {projectionAge}</h4>
            
            <div className="bg-gray-50 rounded-lg p-6">
              {activities.length > 0 ? (
                <div className="h-8 w-full rounded-lg overflow-hidden flex">
                  {activities.map((activity, index) => (
                    <div 
                      key={index}
                      className={`bg-${activity.color}-500`} 
                      style={{ width: `${calculateProjectedActivityPercentage(activity, projectionAge, userData)}%` }}
                      title={`${activity.name}: ${calculateProjectedActivityPercentage(activity, projectionAge, userData)}%`}
                    ></div>
                  ))}
                  <div 
                    className="bg-gray-300" 
                    style={{ width: `${100 - calculateTotalProjectedPercentage(activities, projectionAge, userData)}%` }}
                    title="Unallocated time"
                  ></div>
                </div>
              ) : (
                <div className="h-8 w-full rounded-lg overflow-hidden flex">
                  <div className="bg-gray-300 w-full" title="Unallocated time"></div>
                </div>
              )}
              
              <div className="mt-4 flex flex-wrap gap-3">
                {activities.map((activity, index) => (
                  <div key={index} className="flex items-center">
                    <div className={`h-3 w-3 rounded-full mr-1 bg-${activity.color}-500`}></div>
                    <span className="text-xs text-gray-700">
                      {activity.name} ({calculateProjectedActivityPercentage(activity, projectionAge, userData)}%)
                    </span>
                  </div>
                ))}
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full mr-1 bg-gray-300"></div>
                  <span className="text-xs text-gray-700">
                    Unallocated ({100 - calculateTotalProjectedPercentage(activities, projectionAge, userData)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Life Impact Over Time */}
          <div className="mt-6">
            <h4 className="text-base font-medium text-gray-900 mb-4">Life Impact Projection</h4>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-2">Projected Net Life Impact</p>
                  <p className={`text-2xl font-bold ${
                    calculateProjectedLifeImpact(activities, projectionAge, userData) > 0 ? 'text-green-600' : 
                    calculateProjectedLifeImpact(activities, projectionAge, userData) < 0 ? 'text-red-600' : 
                    'text-gray-900'
                  }`}>
                    {calculateProjectedLifeImpact(activities, projectionAge, userData) > 0 ? 
                      `+${calculateProjectedLifeImpact(activities, projectionAge, userData)} years` : 
                      calculateProjectedLifeImpact(activities, projectionAge, userData) < 0 ? 
                      `${calculateProjectedLifeImpact(activities, projectionAge, userData)} years` : 
                      'Neutral'
                    }
                  </p>
                  <p className="mt-1 text-sm text-gray-500">Impact on life expectancy</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 mb-2">Updated Life Expectancy</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {userData.lifeExpectancy + calculateProjectedLifeImpact(activities, projectionAge, userData)} years
                  </p>
                  <p className="mt-1 text-sm text-gray-500">Based on current activities</p>
                </div>
              </div>
              
              {activities.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm font-medium text-gray-700 mb-3">Impact Breakdown</p>
                  
                  <ul className="space-y-3">
                    {activities.filter(a => a.lifeImpact !== 0).map((activity, index) => (
                      <li key={index} className="flex items-center">
                        <div className={`h-4 w-4 rounded-full mr-3 bg-${activity.color}-500`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{activity.name}</p>
                        </div>
                        <div className="ml-3 flex-shrink-0 text-right">
                          <p className={`text-sm font-medium ${
                            activity.lifeImpact > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {activity.lifeImpact > 0 ? `+${activity.lifeImpact} years` : `${activity.lifeImpact} years`}
                          </p>
                        </div>
                      </li>
                    ))}
                    
                    {!activities.some(a => a.lifeImpact !== 0) && (
                      <li className="text-center py-2">
                        <p className="text-gray-500">No activities with life impact.</p>
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeMachine;
