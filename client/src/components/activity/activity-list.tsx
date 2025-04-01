import { formatDistance } from "date-fns";
import { 
  FileText, 
  Eye, 
  Search, 
  PenSquare, 
  Trash,
  UserPlus,
  LogIn,
  LogOut
} from "lucide-react";

interface ActivityItem {
  id: number;
  userId: number;
  user: {
    id: number;
    name: string;
    username: string;
  };
  action: string;
  resourceType: string;
  resourceId?: number;
  details: string;
  timestamp: Date;
}

interface ActivityListProps {
  activities: ActivityItem[];
}

export default function ActivityList({ activities }: ActivityListProps) {
  // Get icon based on action and resource type
  const getActivityIcon = (activity: ActivityItem) => {
    const { action, resourceType } = activity;
    
    if (action === "created" && resourceType === "policy") {
      return { icon: FileText, bgColor: "bg-blue-100", textColor: "text-primary" };
    } else if (action === "viewed" && resourceType === "policy") {
      return { icon: Eye, bgColor: "bg-green-100", textColor: "text-green-600" };
    } else if (action === "searched" || action === "extension_search") {
      return { icon: Search, bgColor: "bg-purple-100", textColor: "text-purple-600" };
    } else if (action === "updated" || action === "edited") {
      return { icon: PenSquare, bgColor: "bg-yellow-100", textColor: "text-yellow-600" };
    } else if (action === "deleted") {
      return { icon: Trash, bgColor: "bg-red-100", textColor: "text-red-600" };
    } else if (action === "registered") {
      return { icon: UserPlus, bgColor: "bg-indigo-100", textColor: "text-indigo-600" };
    } else if (action === "logged_in") {
      return { icon: LogIn, bgColor: "bg-blue-100", textColor: "text-blue-600" };
    } else if (action === "logged_out") {
      return { icon: LogOut, bgColor: "bg-orange-100", textColor: "text-orange-600" };
    }
    
    // Default
    return { icon: FileText, bgColor: "bg-gray-100", textColor: "text-gray-600" };
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-200">
        <h2 className="font-semibold">Recent Activity</h2>
      </div>
      
      <div className="p-4 max-h-80 overflow-y-auto">
        {activities.length > 0 ? (
          <ul className="space-y-3">
            {activities.map((activity) => {
              const { icon: Icon, bgColor, textColor } = getActivityIcon(activity);
              const time = formatDistance(new Date(activity.timestamp), new Date(), { addSuffix: true });
              
              return (
                <li key={activity.id} className="flex items-start py-2 border-b border-neutral-100 last:border-0">
                  <div className={`h-8 w-8 rounded-full ${bgColor} flex items-center justify-center mr-3`}>
                    <Icon className={`h-4 w-4 ${textColor}`} />
                  </div>
                  <div>
                    <p className="text-sm">
                      <span className="font-medium">{activity.user.name}</span>{" "}
                      {activity.details}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">{time}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-center py-8 text-neutral-500">
            <p>No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
}
