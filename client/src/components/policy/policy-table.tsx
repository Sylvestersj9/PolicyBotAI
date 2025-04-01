import { useState } from "react";
import { Edit, Eye, Trash, FileText, Plus } from "lucide-react";
import { Policy, Category } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

interface PolicyTableProps {
  policies: Policy[];
  categories: Category[];
  onView: (policy: Policy) => void;
  onEdit: (policy: Policy) => void;
  onDelete: (policy: Policy) => void;
  onAddNew: () => void;
}

export default function PolicyTable({
  policies,
  categories,
  onView,
  onEdit,
  onDelete,
  onAddNew
}: PolicyTableProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [currentPage, setCurrentPage] = useState(1);
  const [policyToDelete, setPolicyToDelete] = useState<Policy | null>(null);
  const policiesPerPage = 5;

  // Filter policies by category
  const filteredPolicies = selectedCategory === "all"
    ? policies
    : policies.filter(policy => policy.categoryId.toString() === selectedCategory);

  // Sort policies
  const sortedPolicies = [...filteredPolicies].sort((a, b) => {
    if (sortBy === "recent") {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA;
    } else if (sortBy === "alphabetical") {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  // Pagination
  const indexOfLastPolicy = currentPage * policiesPerPage;
  const indexOfFirstPolicy = indexOfLastPolicy - policiesPerPage;
  const currentPolicies = sortedPolicies.slice(indexOfFirstPolicy, indexOfLastPolicy);
  const totalPages = Math.ceil(sortedPolicies.length / policiesPerPage);

  // Get category by ID
  const getCategoryById = (id: number) => {
    return categories.find(category => category.id === id);
  };

  const handleDeleteClick = (policy: Policy) => {
    setPolicyToDelete(policy);
  };

  const confirmDelete = () => {
    if (policyToDelete) {
      onDelete(policyToDelete);
      setPolicyToDelete(null);
    }
  };

  const cancelDelete = () => {
    setPolicyToDelete(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-neutral-200 overflow-hidden interactive-card gradient-border">
      <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
        <h2 className="font-semibold">Policies</h2>
        <Button 
          variant="default" 
          size="sm"
          className="text-white hover:text-white border border-primary rounded-md font-medium flex items-center btn-animated pulse-on-hover bg-gradient-to-r from-primary to-primary/90"
          onClick={onAddNew}
        >
          <Plus className="h-4 w-4 mr-1 animate-pulse" /> New Policy
        </Button>
      </div>
      
      {/* Filters */}
      <div className="px-6 py-3 bg-neutral-50 border-b border-neutral-200 flex flex-wrap gap-3 items-center">
        <div className="flex items-center text-sm">
          <span className="text-neutral-500 mr-2">Filter by:</span>
          <Select 
            value={selectedCategory} 
            onValueChange={setSelectedCategory}
          >
            <SelectTrigger className="w-[180px] h-8">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center ml-auto">
          <span className="text-neutral-500 text-sm">Sort by:</span>
          <Select 
            value={sortBy} 
            onValueChange={setSortBy}
          >
            <SelectTrigger className="w-[140px] h-8 border-0 bg-transparent">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recent</SelectItem>
              <SelectItem value="alphabetical">Alphabetical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Policy</TableHead>
              <TableHead className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Category</TableHead>
              <TableHead className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Last Updated</TableHead>
              <TableHead className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentPolicies.length > 0 ? (
              currentPolicies.map((policy) => {
                const category = getCategoryById(policy.categoryId);
                return (
                  <TableRow key={policy.id} className="hover:bg-neutral-50/80 transition-colors duration-200 cursor-pointer group">
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-neutral-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium">{policy.title}</div>
                          <div className="text-xs text-neutral-500">ID: {policy.policyRef}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      {category && (
                        <span 
                          className="px-2 py-1 text-xs rounded-full"
                          style={{ 
                            backgroundColor: `${category.color}20`,
                            color: category.color 
                          }}
                        >
                          {category.name}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                      {policy.updatedAt 
                        ? format(typeof policy.updatedAt === 'string' ? new Date(policy.updatedAt) : policy.updatedAt, 'MMM dd, yyyy')
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-neutral-400 hover:text-primary opacity-70 hover:opacity-100 hover:bg-primary/10 group-hover:scale-110 transition-all duration-200"
                          onClick={() => onEdit(policy)}
                          title="Edit Policy"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-neutral-400 hover:text-success opacity-70 hover:opacity-100 hover:bg-success/10 group-hover:scale-110 transition-all duration-200"
                          onClick={() => onView(policy)}
                          title="View Policy"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-neutral-400 hover:text-error opacity-70 hover:opacity-100 hover:bg-error/10 group-hover:scale-110 transition-all duration-200"
                          onClick={() => handleDeleteClick(policy)}
                          title="Delete Policy"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-neutral-500">
                  No policies found. Add a new policy to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination */}
      {sortedPolicies.length > 0 && (
        <div className="px-6 py-3 border-t border-neutral-200 flex items-center justify-between">
          <div className="text-sm text-neutral-500">
            Showing <span className="font-medium">{indexOfFirstPolicy + 1}</span> to{" "}
            <span className="font-medium">
              {Math.min(indexOfLastPolicy, sortedPolicies.length)}
            </span>{" "}
            of <span className="font-medium">{sortedPolicies.length}</span> results
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            {[...Array(Math.min(totalPages, 3))].map((_, index) => {
              const pageNumber = index + 1;
              return (
                <Button
                  key={pageNumber}
                  variant={currentPage === pageNumber ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNumber)}
                >
                  {pageNumber}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!policyToDelete} onOpenChange={() => !policyToDelete && cancelDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the policy "{policyToDelete?.title}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
