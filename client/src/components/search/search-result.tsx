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
  
  // Handle potential null/undefined result
  const answer = result?.answer || "No answer available";
  const confidence = result?.confidence || 0;
  
  // Check if result contains an error message
  const isError = answer.includes("Error") || answer.includes("error occurred");
  
  // Format confidence score as percentage
  const confidencePercent = Math.round(confidence * 100);
  
  return (
    <div className={`border ${isError ? 'border-red-200' : 'border-neutral-200'} rounded p-3 mb-4`}>
      <div className="flex items-start">
        <div className={`p-1.5 rounded ${isError ? 'bg-red-100 text-red-500' : 'bg-primary/10 text-primary'}`}>
          <MessageCircleQuestion className="h-4 w-4" />
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium">{query}</p>
          <p className="text-xs text-neutral-500 mt-1">{formattedTime}</p>
        </div>
      </div>
      <div className="mt-2 pl-9">
        <p className={`text-sm ${isError ? 'text-red-600' : 'text-neutral-600'}`}>{answer}</p>
        {result?.policyTitle && (
          <div className="flex flex-col mt-1">
            <p className="text-xs text-primary">
              Source: {result.policyTitle}
            </p>
            {confidencePercent > 0 && (
              <p className="text-xs text-neutral-500 mt-0.5">
                Confidence: {confidencePercent}%
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
