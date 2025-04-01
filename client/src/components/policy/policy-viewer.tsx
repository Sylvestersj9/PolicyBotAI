import { Policy } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Download, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface PolicyViewerProps {
  policy: Policy;
  onBack: () => void;
}

export default function PolicyViewer({ policy, onBack }: PolicyViewerProps) {
  const { toast } = useToast();

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a blob with the policy content
    const blob = new Blob([policy.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link element
    const a = document.createElement("a");
    a.href = url;
    a.download = `${policy.policyRef} - ${policy.title}.txt`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(policy.content).then(() => {
      toast({
        title: "Content copied",
        description: "Policy content has been copied to clipboard",
      });
    }).catch(err => {
      console.error("Failed to copy content: ", err);
      toast({
        title: "Copy failed",
        description: "Failed to copy content to clipboard",
        variant: "destructive",
      });
    });
  };

  return (
    <div className="policy-viewer">
      {/* Header with controls */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onBack}
          className="flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCopyContent}
            className="flex items-center gap-1"
          >
            <Copy className="h-4 w-4" />
            Copy
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownload}
            className="flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrint}
            className="flex items-center gap-1"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>
      
      {/* Document content */}
      <div className="policy-document bg-white p-8 rounded-lg border border-gray-200 shadow-sm print:border-none print:shadow-none">
        {/* Document header */}
        <div className="mb-8 border-b pb-4">
          <div className="flex justify-between">
            <h1 className="text-2xl font-bold">{policy.title}</h1>
            <div className="text-right">
              <div className="text-sm text-gray-500">Reference</div>
              <div className="font-mono text-sm">{policy.policyRef}</div>
            </div>
          </div>
          
          {policy.description && (
            <p className="text-gray-600 mt-2">{policy.description}</p>
          )}
          
          <div className="grid grid-cols-2 gap-4 mt-4 text-sm text-gray-600">
            <div>
              <span className="font-semibold">Created:</span> {policy.createdAt ? format(new Date(policy.createdAt), "PPP") : 'N/A'}
            </div>
            <div>
              <span className="font-semibold">Last Updated:</span> {policy.updatedAt ? format(new Date(policy.updatedAt), "PPP") : 'N/A'}
            </div>
          </div>
        </div>
        
        {/* Document body - format with proper paragraphs */}
        <div className="policy-content whitespace-pre-wrap">
          {policy.content.split('\n\n').map((paragraph, i) => (
            <p key={i} className={cn("mb-4", { "text-justify": paragraph.length > 100 })}>
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}