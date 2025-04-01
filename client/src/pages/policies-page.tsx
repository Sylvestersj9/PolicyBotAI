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
import PolicyViewer from "@/components/policy/policy-viewer";
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
      try {
        if (!user || !user.id) {
          throw new Error("User authentication required to create policy");
        }
        
        // Process the policy data before sending
        const processedData = {
          ...policyData,
          categoryId: parseInt(policyData.categoryId),
          createdBy: user.id // Include the current user ID
          // policyRef will be generated on the server
        };
        
        console.log("Sending policy data to server:", processedData);
        const res = await apiRequest("POST", "/api/policies", processedData);
        
        if (!res.ok) {
          // Try to extract error details from response
          const errorText = await res.text();
          let errorMessage = `Server error: ${res.status}`;
          
          try {
            // Try to parse as JSON
            const errorData = JSON.parse(errorText);
            if (errorData.message) {
              errorMessage = errorData.message;
            }
            if (errorData.errors) {
              errorMessage += `: ${JSON.stringify(errorData.errors)}`;
            }
          } catch (e) {
            // Not JSON, use as text
            if (errorText) {
              errorMessage = errorText;
            }
          }
          
          throw new Error(errorMessage);
        }
        
        return await res.json();
      } catch (error) {
        console.error("Create policy error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Policy created",
        description: "Policy has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/policies"] });
    },
    onError: (error: any) => {
      console.error("Create policy error details:", error);
      toast({
        title: "Failed to create policy",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Update policy mutation
  const updatePolicyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      try {
        console.log("Updating policy:", id, "with data:", data);
        const res = await apiRequest("PUT", `/api/policies/${id}`, data);
        
        if (!res.ok) {
          // Try to extract error details from response
          const errorText = await res.text();
          let errorMessage = `Server error: ${res.status}`;
          
          try {
            // Try to parse as JSON
            const errorData = JSON.parse(errorText);
            if (errorData.message) {
              errorMessage = errorData.message;
            }
            if (errorData.errors) {
              errorMessage += `: ${JSON.stringify(errorData.errors)}`;
            }
          } catch (e) {
            // Not JSON, use as text
            if (errorText) {
              errorMessage = errorText;
            }
          }
          
          throw new Error(errorMessage);
        }
        
        return await res.json();
      } catch (error) {
        console.error("Update policy error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Policy updated",
        description: "Policy has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/policies"] });
    },
    onError: (error: any) => {
      console.error("Update policy error details:", error);
      toast({
        title: "Failed to update policy",
        description: error.message || "Unknown error occurred",
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
    if (!user || !user.id) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to manage policies.",
        variant: "destructive"
      });
      return;
    }
    
    // Convert categoryId from string to number for API
    const processedData = {
      ...data,
      categoryId: parseInt(data.categoryId),
      createdBy: user.id // This is required by the schema
    };
    
    // Log the processed data to console for debugging
    console.log("Submitting policy data:", processedData);
    
    if (selectedPolicy) {
      // Update existing policy
      updatePolicyMutation.mutate({
        id: selectedPolicy.id,
        data: processedData,
      });
    } else {
      // We don't need to add policyRef here since it's generated on the server
      // and we already include it in the API endpoint
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
      
      <div className="flex-1 flex flex-col overflow-hidden ml-0 lg:ml-0 transition-all duration-300">
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
      
      {/* View Policy Modal - Enhanced Document Viewer */}
      <Dialog open={isViewPolicyOpen} onOpenChange={setIsViewPolicyOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto p-6">
          {selectedPolicy && (
            <PolicyViewer 
              policy={selectedPolicy} 
              onBack={() => setIsViewPolicyOpen(false)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
