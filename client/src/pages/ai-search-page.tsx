import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/ui/sidebar";
import Header from "@/components/ui/header";
import SearchBox from "@/components/search/search-box";
import SearchResult from "@/components/search/search-result";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info, History, MessageCircleQuestion } from "lucide-react";

export default function AISearchPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("search");
  
  // Fetch search history
  const {
    data: searchHistory = [],
    isLoading: isHistoryLoading,
  } = useQuery<any[]>({
    queryKey: ["/api/searches"],
  });
  
  // AI search mutation
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const res = await apiRequest("POST", "/api/search", { query });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/searches"] });
      toast({
        title: "Search completed",
        description: "Found relevant information in your policies.",
      });
    },
    onError: (error) => {
      toast({
        title: "Search failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle search
  const handleSearch = (query: string) => {
    searchMutation.mutate(query);
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="AI Policy Search" />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <Tabs 
              defaultValue={activeTab} 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="mb-6"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="search">Search</TabsTrigger>
                <TabsTrigger value="history">Search History</TabsTrigger>
              </TabsList>
              
              {/* Search Tab */}
              <TabsContent value="search" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>AI Policy Search</CardTitle>
                    <CardDescription>
                      Ask questions about your policies and get accurate answers powered by AI
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6">
                      <div className="bg-blue-50 p-4 rounded-md border border-blue-100 text-sm text-blue-800 mb-6 flex items-start">
                        <Info className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium mb-1">How to use AI Search:</p>
                          <p>Ask specific questions about your policies and procedures. The AI will analyze your documents and provide the most relevant answer.</p>
                          <p className="mt-1">Example questions:</p>
                          <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>What is the procedure for reporting a safety incident?</li>
                            <li>How should I handle a data breach?</li>
                            <li>What are the emergency evacuation steps?</li>
                          </ul>
                        </div>
                      </div>
                      
                      <SearchBox 
                        onSearch={handleSearch} 
                        isLoading={searchMutation.isPending}
                      />
                      
                      {searchMutation.data && (
                        <div className="mt-6">
                          <h3 className="text-sm font-medium mb-3">Search Result</h3>
                          <SearchResult
                            id={searchMutation.data.id}
                            query={searchMutation.data.query}
                            result={searchMutation.data.result}
                            timestamp={searchMutation.data.timestamp}
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* History Tab */}
              <TabsContent value="history" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Search History</CardTitle>
                    <CardDescription>
                      View your previous policy searches and results
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isHistoryLoading ? (
                      <div className="text-center py-8 text-neutral-500">
                        Loading search history...
                      </div>
                    ) : searchHistory.length > 0 ? (
                      <div className="space-y-4">
                        {searchHistory.map((search) => (
                          <SearchResult
                            key={search.id}
                            id={search.id}
                            query={search.query}
                            result={search.result}
                            timestamp={search.timestamp}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-neutral-500">
                        <MessageCircleQuestion className="h-10 w-10 mx-auto mb-3 text-neutral-300" />
                        <p>No search history yet</p>
                        <p className="text-sm mt-1">Search for policy information to see your history here</p>
                        <Button 
                          className="mt-4" 
                          variant="outline" 
                          onClick={() => setActiveTab("search")}
                        >
                          Try a search
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
