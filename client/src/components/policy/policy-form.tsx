import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Category, Policy, insertPolicySchema } from "@shared/schema";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Extend the policy schema for the form
const policyFormSchema = insertPolicySchema.pick({
  title: true,
  description: true,
  content: true,
  categoryId: true,
}).extend({
  categoryId: z.string(), // For form handling we use string
});

type PolicyFormValues = z.infer<typeof policyFormSchema>;

interface PolicyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PolicyFormValues) => void;
  categories: Category[];
  editPolicy?: Policy;
  mode: 'create' | 'edit';
}

export default function PolicyForm({
  open,
  onOpenChange,
  onSubmit,
  categories,
  editPolicy,
  mode
}: PolicyFormProps) {
  const { toast } = useToast();
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  
  // Initialize form with default values or edit values
  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(policyFormSchema),
    defaultValues: mode === 'edit' && editPolicy 
      ? {
          title: editPolicy.title,
          description: editPolicy.description || '',
          content: editPolicy.content,
          categoryId: editPolicy.categoryId.toString(),
        }
      : {
          title: '',
          description: '',
          content: '',
          categoryId: '',
        },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      
      // For demonstration, we'll just read the file content as text
      // In a real app, you might want to parse docx/pdf or send to server
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          form.setValue('content', event.target.result as string);
          toast({
            title: "File uploaded",
            description: `${file.name} has been uploaded.`,
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const clearUploadedFile = () => {
    setUploadedFileName(null);
    form.setValue('content', '');
  };

  const handleSubmit = (data: PolicyFormValues) => {
    // Convert categoryId back to number
    const processedData = {
      ...data,
      categoryId: parseInt(data.categoryId)
    };
    
    onSubmit(processedData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create New Policy' : 'Edit Policy'}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Policy Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter policy title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem 
                            key={category.id} 
                            value={category.id.toString()}
                          >
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter a brief description" 
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Policy Content</FormLabel>
                  <FormControl>
                    <>
                      {!uploadedFileName ? (
                        <div className="border-2 border-dashed border-neutral-300 rounded-md p-6 text-center">
                          <Upload className="h-6 w-6 text-neutral-400 mx-auto mb-2" />
                          <p className="text-sm text-neutral-500">Drag & drop your file here or</p>
                          <div className="mt-1">
                            <Button 
                              type="button" 
                              variant="link" 
                              className="text-primary text-sm font-medium"
                              onClick={() => document.getElementById('file-upload')?.click()}
                            >
                              browse files
                            </Button>
                          </div>
                          <Input 
                            id="file-upload" 
                            type="file" 
                            className="hidden" 
                            accept=".pdf,.docx,.doc,.txt"
                            onChange={handleFileChange}
                          />
                          <p className="mt-1 text-xs text-neutral-400">
                            Or enter content directly by typing in this field
                          </p>
                          <Textarea 
                            placeholder="Enter policy content here" 
                            rows={8}
                            className="mt-4"
                            {...field} 
                          />
                        </div>
                      ) : (
                        <div className="border rounded-md p-4">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-primary mr-2" />
                            <span className="text-sm">{uploadedFileName}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="ml-auto h-8 w-8 text-neutral-500"
                              onClick={clearUploadedFile}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">
                {mode === 'create' ? 'Create Policy' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
