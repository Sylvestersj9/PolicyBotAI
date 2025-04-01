import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Policy, Category } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/ui/sidebar";
import Header from "@/components/ui/header";
import PolicyTable from "@/components/policy/policy-table";
import PolicyForm from "@/components/policy/policy-form";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogClose,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function PoliciesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPolicyFormOpen, setIsPolicyFormOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [isViewPolicyOpen, setIsViewPolicyOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
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
  
  // Filter policies by search query
  const filteredPolicies = searchQuery 
    ? policies.filter(policy => 
        policy.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (policy.description && policy.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        policy.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        policy.policyRef.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : policies;
  
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
    },
    onError: (error) => {
      toast({
        title: "Failed to delete policy",
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
    // Convert categoryId from string to number for API
    const processedData = {
      ...data,
      categoryId: parseInt(data.categoryId)
    };
    
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
  
  // Handle search
  const handleSearchPolicies = (query: string) => {
    setSearchQuery(query);
  };

  // Get category color
  const getCategoryColor = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.color : "#6B7280"; // Default gray
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Policies" 
          onSearchPolicies={handleSearchPolicies}
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          <PolicyTable
            policies={filteredPolicies}
            categories={categories}
            onView={handleViewPolicy}
            onEdit={handleEditPolicy}
            onDelete={handleDeletePolicy}
            onAddNew={handleAddNewPolicy}
          />
        </main>
      </div>
      
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
