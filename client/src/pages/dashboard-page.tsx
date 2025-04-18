import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  FileText, 
  Users, 
  Search, 
  PuzzleIcon, // Using PuzzleIcon instead of PuzzlePiece
  Key,
  Copy,
  RefreshCw,
  CheckCircle
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Policy, Category } from "@shared/schema";
import Sidebar from "@/components/ui/sidebar";
import Header from "@/components/ui/header";
import StatsCard from "@/components/ui/stats-card";
import PolicyTable from "@/components/policy/policy-table";
import PolicyForm from "@/components/policy/policy-form";
import SearchBox from "@/components/search/search-box";
import SearchResult from "@/components/search/search-result";
import ActivityList from "@/components/activity/activity-list";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPolicyFormOpen, setIsPolicyFormOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [isViewPolicyOpen, setIsViewPolicyOpen] = useState(false);
  
  // Extension API key states
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  
  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  
  // Fetch policies
  const { 
    data: policies = [],
    isLoading: isPoliciesLoading,
  } = useQuery<Policy[]>({
    queryKey: ["/api/policies"],
  });
  
  // Fetch search history
  const {
    data: searchHistory = [],
  } = useQuery<any[]>({
    queryKey: ["/api/searches"],
  });
  
  // Fetch activities
  const {
    data: activities = [],
  } = useQuery<any[]>({
    queryKey: ["/api/activities"],
  });
  
  // Create policy mutation
  const createPolicyMutation = useMutation({
    mutationFn: async (policyData: any) => {
      const res = await apiRequest("POST", "/api/policies", policyData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Policy created",
        description: "Policy has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/policies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to create policy",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update policy mutation
  const updatePolicyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/policies/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Policy updated",
        description: "Policy has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/policies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to update policy",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete policy mutation
  const deletePolicyMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/policies/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Policy deleted",
        description: "Policy has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/policies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete policy",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // AI search mutation
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const res = await apiRequest("POST", "/api/search", { query });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/searches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    },
    onError: (error) => {
      toast({
        title: "Search failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Generate API key mutation
  const generateApiKeyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/extension/generate-key");
      return await res.json();
    },
    onSuccess: (data) => {
      setApiKey(data.apiKey);
      setIsApiKeyDialogOpen(true);
      toast({
        title: "API Key Generated",
        description: "Your API key for the browser extension has been generated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to generate API key",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle policy actions
  const handleAddNewPolicy = () => {
    setSelectedPolicy(null);
    setIsPolicyFormOpen(true);
  };
  
  const handleEditPolicy = (policy: Policy) => {
    setSelectedPolicy(policy);
    setIsPolicyFormOpen(true);
  };
  
  const handleViewPolicy = (policy: Policy) => {
    setSelectedPolicy(policy);
    setIsViewPolicyOpen(true);
  };
  
  const handleDeletePolicy = (policy: Policy) => {
    deletePolicyMutation.mutate(policy.id);
  };
  
  const handlePolicySubmit = (data: any) => {
    // Convert categoryId to a number (it comes as a string from the form)
    const processedData = {
      ...data,
      categoryId: parseInt(data.categoryId),
      createdBy: user?.id // Include the current user ID
      // policyRef will be generated on the server
    };
    
    console.log("Submitting policy data:", processedData);
    
    if (selectedPolicy) {
      // Update existing policy
      updatePolicyMutation.mutate({
        id: selectedPolicy.id,
        data: processedData,
      });
    } else {
      // Create new policy
      createPolicyMutation.mutate(processedData);
    }
  };
  
  // Handle AI search
  const handleSearch = (query: string) => {
    searchMutation.mutate(query);
  };

  // Get category color
  const getCategoryColor = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.color : "#6B7280"; // Default gray
  };
  
  // Handle API key generation
  const handleGenerateApiKey = () => {
    generateApiKeyMutation.mutate();
  };
  
  // Handle copying API key to clipboard
  const handleCopyApiKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey).then(() => {
        setApiKeyCopied(true);
        setTimeout(() => setApiKeyCopied(false), 2000);
      });
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Dashboard" />
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Total Policies"
              value={policies.length}
              icon={FileText}
              change={{ value: 12, isIncrease: true }}
              iconBgColor="bg-blue-100"
              iconColor="text-primary"
            />
            
            <StatsCard
              title="Active Users"
              value={1} // Just the current user for MVP
              icon={Users}
              change={{ value: 0, isIncrease: true }}
              iconBgColor="bg-green-100"
              iconColor="text-success"
            />
            
            <StatsCard
              title="AI Searches"
              value={searchHistory.length}
              icon={Search}
              change={{ value: 24, isIncrease: true }}
              iconBgColor="bg-purple-100"
              iconColor="text-purple-600"
            />
            
            <StatsCard
              title="Extension Usage"
              value={0}
              icon={PuzzleIcon}
              change={{ value: 0, isIncrease: false }}
              iconBgColor="bg-amber-100"
              iconColor="text-amber-600"
            />
          </div>
          
          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Policies Section */}
            <div className="lg:col-span-2">
              <PolicyTable
                policies={policies}
                categories={categories}
                onView={handleViewPolicy}
                onEdit={handleEditPolicy}
                onDelete={handleDeletePolicy}
                onAddNew={handleAddNewPolicy}
              />
            </div>
            
            {/* AI Search Section */}
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-200">
                <h2 className="font-semibold">AI Policy Search</h2>
              </div>
              
              <div className="p-6">
                <p className="text-sm text-neutral-500 mb-4">
                  Ask a question about any policy or procedure in your organization.
                </p>
                
                <SearchBox 
                  onSearch={handleSearch} 
                  isLoading={searchMutation.isPending}
                />
                
                {/* Recent searches */}
                {searchHistory.length > 0 && (
                  <>
                    <h3 className="text-sm font-medium mb-3">Recent Searches</h3>
                    <div className="space-y-4">
                      {searchHistory.slice(0, 3).map((search) => (
                        <SearchResult
                          key={search.id}
                          id={search.id}
                          query={search.query}
                          result={search.result}
                          timestamp={search.timestamp}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Extension API Key Section */}
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200">
              <h2 className="font-semibold">Browser Extension</h2>
            </div>
            
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Extension API Key</h3>
                  <p className="text-sm text-neutral-500 mt-1 mb-4 md:mb-0">
                    Generate an API key to use with the browser extension.
                  </p>
                </div>
                <Button 
                  onClick={handleGenerateApiKey}
                  className="flex items-center space-x-2"
                  disabled={generateApiKeyMutation.isPending}
                >
                  {generateApiKeyMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Key className="h-4 w-4 mr-2" />
                  )}
                  Generate API Key
                </Button>
              </div>
            </div>
          </div>
          
          {/* Activities Section */}
          <div className="mt-6">
            <ActivityList activities={activities.slice(0, 5)} />
          </div>
        </main>
      </div>
      
      {/* API Key Dialog */}
      <Dialog open={isApiKeyDialogOpen} onOpenChange={setIsApiKeyDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>API Key</DialogTitle>
            <DialogDescription>
              Use this API key with the browser extension to access policies from anywhere.
            </DialogDescription>
          </DialogHeader>
          
          <div className="border rounded-md p-3 bg-neutral-50 relative">
            <p className="font-mono text-sm break-all pr-8">{apiKey}</p>
            <button
              onClick={handleCopyApiKey}
              className="absolute right-3 top-3 p-1 rounded hover:bg-neutral-200"
              title="Copy to clipboard"
            >
              {apiKeyCopied ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 text-neutral-500" />
              )}
            </button>
          </div>
          
          <DialogFooter className="flex gap-2">
            <DialogClose asChild>
              <Button type="button">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Policy Form Modal */}
      <PolicyForm
        open={isPolicyFormOpen}
        onOpenChange={setIsPolicyFormOpen}
        onSubmit={handlePolicySubmit}
        categories={categories}
        editPolicy={selectedPolicy || undefined}
        mode={selectedPolicy ? "edit" : "create"}
      />
      
      {/* View Policy Modal */}
      <Dialog open={isViewPolicyOpen} onOpenChange={setIsViewPolicyOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPolicy?.title}</DialogTitle>
            {selectedPolicy && (
              <div className="flex items-center mt-1">
                <span 
                  className="px-2 py-1 text-xs rounded-full"
                  style={{ 
                    backgroundColor: `${getCategoryColor(selectedPolicy.categoryId)}20`,
                    color: getCategoryColor(selectedPolicy.categoryId)
                  }}
                >
                  {categories.find(c => c.id === selectedPolicy.categoryId)?.name || 'Unknown Category'}
                </span>
                <span className="text-xs text-neutral-500 ml-4">
                  ID: {selectedPolicy.policyRef}
                </span>
              </div>
            )}
          </DialogHeader>
          
          {selectedPolicy?.description && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-1">Description</h4>
              <p className="text-sm text-neutral-600">{selectedPolicy.description}</p>
            </div>
          )}
          
          <div>
            <h4 className="text-sm font-medium mb-1">Content</h4>
            <div className="border rounded-md p-4 bg-neutral-50 text-sm whitespace-pre-wrap">
              {selectedPolicy?.content}
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
