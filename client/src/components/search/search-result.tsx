import { formatDistance } from "date-fns";
import { MessageCircleQuestion } from "lucide-react";

interface SearchResultProps {
  id: number;
  query: string;
  result: {
    answer: string;
    policyId?: number;
    policyTitle?: string;
    confidence: number;
  };
  timestamp: Date;
}

export default function SearchResult({ id, query, result, timestamp }: SearchResultProps) {
  const formattedTime = formatDistance(new Date(timestamp), new Date(), { addSuffix: true });
  
  return (
    <div className="border border-neutral-200 rounded p-3 mb-4">
      <div className="flex items-start">
        <div className="bg-primary-light bg-opacity-10 p-1.5 rounded text-primary">
          <MessageCircleQuestion className="h-4 w-4" />
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium">{query}</p>
          <p className="text-xs text-neutral-500 mt-1">{formattedTime}</p>
        </div>
      </div>
      <div className="mt-2 pl-9">
        <p className="text-sm text-neutral-600">{result.answer}</p>
        {result.policyTitle && (
          <p className="text-xs text-primary mt-1">
            Source: {result.policyTitle}
          </p>
        )}
      </div>
    </div>
  );
}
