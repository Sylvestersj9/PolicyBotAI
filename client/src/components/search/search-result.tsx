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
    error?: string;
  };
  timestamp: Date;
}

export default function SearchResult({ id, query, result, timestamp }: SearchResultProps) {
  const formattedTime = formatDistance(new Date(timestamp), new Date(), { addSuffix: true });
  
  // Handle potential null/undefined result
  const answer = result?.answer || "No answer available";
  const confidence = result?.confidence || 0;
  const errorType = result?.error;

  // Determine error state based on either the error field or the answer content
  const isError = errorType || answer.includes("Error") || answer.includes("error occurred");
  
  // Get error styling based on error type
  let errorStyle = 'border-red-200 bg-red-100 text-red-500';
  let errorIcon = <MessageCircleQuestion className="h-4 w-4" />;
  
  if (errorType === 'rate_limit') {
    errorStyle = 'border-amber-200 bg-amber-100 text-amber-500';
  }
  
  // Format confidence score as percentage
  const confidencePercent = Math.round(confidence * 100);
  
  return (
    <div className={`border ${isError ? errorStyle.split(' ')[0] : 'border-neutral-200'} rounded p-3 mb-4`}>
      <div className="flex items-start">
        <div className={`p-1.5 rounded ${isError ? errorStyle.split(' ').slice(1, 3).join(' ') : 'bg-primary/10 text-primary'}`}>
          {errorIcon}
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium">{query}</p>
          <p className="text-xs text-neutral-500 mt-1">{formattedTime}</p>
        </div>
      </div>
      <div className="mt-2 pl-9">
        <p className={`text-sm ${isError ? errorStyle.split(' ')[2] : 'text-neutral-600'}`}>{answer}</p>
        
        {/* Show a contact admin message for specific errors */}
        {errorType === 'rate_limit' && (
          <p className="text-xs mt-1 text-amber-600 font-medium">
            AI quota exceeded. Contact administrator to renew subscription.
          </p>
        )}
        
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
