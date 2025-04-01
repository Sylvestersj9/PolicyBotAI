import { Card, CardContent } from "@/components/ui/card";
import { ArrowUp, ArrowDown, LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: {
    value: number;
    isIncrease: boolean;
  };
  iconBgColor: string;
  iconColor: string;
}

export default function StatsCard({
  title,
  value,
  icon: Icon,
  change,
  iconBgColor,
  iconColor,
}: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-neutral-500 text-sm">{title}</p>
            <p className="text-2xl font-semibold mt-1">{value}</p>
          </div>
          <div className={`${iconBgColor} h-10 w-10 rounded-lg flex items-center justify-center`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
        
        {change && (
          <div className="mt-4 flex items-center text-xs">
            <span className={`flex items-center ${change.isIncrease ? 'text-success' : 'text-warning'}`}>
              {change.isIncrease ? (
                <ArrowUp className="h-3 w-3 mr-1" />
              ) : (
                <ArrowDown className="h-3 w-3 mr-1" />
              )}
              {change.value}%
            </span>
            <span className="text-neutral-500 ml-2">since last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
