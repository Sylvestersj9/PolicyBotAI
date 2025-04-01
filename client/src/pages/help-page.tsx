import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle, FileText, MessageSquare, PhoneCall, Mail, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "../components/ui/sidebar";

// Support form schema
const supportFormSchema = z.object({
  subject: z.string().min(2, { message: "Subject must be at least 2 characters." }),
  message: z.string().min(10, { message: "Message must be at least 10 characters." }),
  email: z.string().email({ message: "Please enter a valid email." })
});

type SupportFormValues = z.infer<typeof supportFormSchema>;

export default function HelpPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize support form with user data
  const form = useForm<SupportFormValues>({
    resolver: zodResolver(supportFormSchema),
    defaultValues: {
      subject: "",
      message: "",
      email: user?.email || "",
    },
  });

  // Handle support form submission
  const onSubmit = async (data: SupportFormValues) => {
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      form.reset({
        subject: "",
        message: "",
        email: user?.email || "",
      });
      toast({
        title: "Support request submitted",
        description: "We'll get back to you as soon as possible.",
      });
    }, 1500);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="container py-10">
          <div className="mb-10">
            <h1 className="text-3xl font-bold">Help & Support</h1>
            <p className="text-gray-500 mt-2">Find answers or contact our support team</p>
          </div>

          <Tabs defaultValue="faq">
            <TabsList className="mb-8">
              <TabsTrigger value="faq" className="flex items-center gap-2">
                <HelpCircle size={16} />
                <span>FAQs</span>
              </TabsTrigger>
              <TabsTrigger value="docs" className="flex items-center gap-2">
                <FileText size={16} />
                <span>Documentation</span>
              </TabsTrigger>
              <TabsTrigger value="contact" className="flex items-center gap-2">
                <MessageSquare size={16} />
                <span>Contact Support</span>
              </TabsTrigger>
            </TabsList>
            
            {/* FAQ Tab */}
            <TabsContent value="faq">
              <Card>
                <CardHeader>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                  <CardDescription>Find answers to common questions about PolicyHub</CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>How do I create a new policy?</AccordionTrigger>
                      <AccordionContent>
                        To create a new policy, navigate to the Policies page and click the "Add New Policy" button. 
                        Fill out the required information including title, content, and category. You can also upload
                        PDF files as policy documents.
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="item-2">
                      <AccordionTrigger>How does the AI search functionality work?</AccordionTrigger>
                      <AccordionContent>
                        Our AI search uses advanced natural language processing to understand your questions and find
                        relevant policies. It analyzes the semantic meaning of your query and matches it with the most
                        appropriate policies in your organization's database. The AI can also extract specific
                        sections from policies that directly answer your questions.
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="item-3">
                      <AccordionTrigger>How do I set up the browser extension?</AccordionTrigger>
                      <AccordionContent>
                        <p>To set up the browser extension:</p>
                        <ol className="list-decimal list-inside mt-2 space-y-1">
                          <li>Install the extension from your browser's extension store</li>
                          <li>Go to Settings &gt; API Access in PolicyHub</li>
                          <li>Generate a new API key</li>
                          <li>Copy the key and paste it in the extension's settings</li>
                          <li>Click "Connect" to authenticate the extension</li>
                        </ol>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="item-4">
                      <AccordionTrigger>Can I customize policy categories?</AccordionTrigger>
                      <AccordionContent>
                        Yes, administrators can create custom categories to organize policies. Go to Policies &gt; Categories
                        to manage your organization's policy categories. Each category can have a name, description, and color
                        for easy identification.
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="item-5">
                      <AccordionTrigger>How do I manage user permissions?</AccordionTrigger>
                      <AccordionContent>
                        User permissions are managed through roles. Administrators can assign roles to users that determine
                        what actions they can perform in the system. To manage roles, go to the Administration &gt; Users section
                        and edit the user's profile to change their role.
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="item-6">
                      <AccordionTrigger>Is my policy data secure?</AccordionTrigger>
                      <AccordionContent>
                        Yes, PolicyHub takes security seriously. All data is encrypted both in transit and at rest.
                        We use industry-standard security protocols and regular security audits to ensure your policy
                        data remains confidential and protected.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Documentation Tab */}
            <TabsContent value="docs">
              <Card>
                <CardHeader>
                  <CardTitle>Documentation</CardTitle>
                  <CardDescription>Comprehensive guides and resources</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card className="overflow-hidden">
                      <div className="p-6">
                        <FileText className="h-8 w-8 text-primary mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Getting Started Guide</h3>
                        <p className="text-sm text-gray-500 mb-4">
                          Learn the basics of using PolicyHub with our comprehensive onboarding guide.
                        </p>
                        <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                          <span>View Guide</span>
                          <ExternalLink size={14} />
                        </Button>
                      </div>
                    </Card>
                    
                    <Card className="overflow-hidden">
                      <div className="p-6">
                        <FileText className="h-8 w-8 text-primary mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Administrator Manual</h3>
                        <p className="text-sm text-gray-500 mb-4">
                          Detailed instructions for platform administrators on user management and configurations.
                        </p>
                        <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                          <span>View Manual</span>
                          <ExternalLink size={14} />
                        </Button>
                      </div>
                    </Card>
                    
                    <Card className="overflow-hidden">
                      <div className="p-6">
                        <FileText className="h-8 w-8 text-primary mb-4" />
                        <h3 className="text-lg font-semibold mb-2">API Documentation</h3>
                        <p className="text-sm text-gray-500 mb-4">
                          Technical documentation for developers integrating with the PolicyHub API.
                        </p>
                        <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                          <span>View API Docs</span>
                          <ExternalLink size={14} />
                        </Button>
                      </div>
                    </Card>
                    
                    <Card className="overflow-hidden">
                      <div className="p-6">
                        <FileText className="h-8 w-8 text-primary mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Extension Guide</h3>
                        <p className="text-sm text-gray-500 mb-4">
                          Learn how to use and configure the PolicyHub browser extension.
                        </p>
                        <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                          <span>View Guide</span>
                          <ExternalLink size={14} />
                        </Button>
                      </div>
                    </Card>
                    
                    <Card className="overflow-hidden">
                      <div className="p-6">
                        <FileText className="h-8 w-8 text-primary mb-4" />
                        <h3 className="text-lg font-semibold mb-2">AI Search Tutorial</h3>
                        <p className="text-sm text-gray-500 mb-4">
                          Get the most out of PolicyHub's AI search capabilities with expert tips.
                        </p>
                        <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                          <span>View Tutorial</span>
                          <ExternalLink size={14} />
                        </Button>
                      </div>
                    </Card>
                    
                    <Card className="overflow-hidden">
                      <div className="p-6">
                        <FileText className="h-8 w-8 text-primary mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Video Tutorials</h3>
                        <p className="text-sm text-gray-500 mb-4">
                          Watch step-by-step tutorials on key PolicyHub features and functionalities.
                        </p>
                        <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                          <span>Watch Videos</span>
                          <ExternalLink size={14} />
                        </Button>
                      </div>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Contact Support Tab */}
            <TabsContent value="contact">
              <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Support</CardTitle>
                    <CardDescription>Send a message to our support team</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address</FormLabel>
                              <FormControl>
                                <Input placeholder="your@email.com" {...field} />
                              </FormControl>
                              <FormDescription>
                                We'll use this email to respond to your inquiry.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="subject"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Subject</FormLabel>
                              <FormControl>
                                <Input placeholder="Brief description of your issue" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="message"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Message</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Please provide as much detail as possible about your issue..." 
                                  className="min-h-[150px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? "Submitting..." : "Submit Support Request"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
                
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Contact Information</CardTitle>
                      <CardDescription>Other ways to reach our support team</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-start gap-3">
                        <PhoneCall className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium">Phone Support</p>
                          <p className="text-sm text-gray-500">Available 9am-5pm, Monday-Friday:</p>
                          <p className="text-sm font-medium">+1 (800) 123-4567</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium">Email Support</p>
                          <p className="text-sm text-gray-500">24/7 support via email:</p>
                          <p className="text-sm font-medium">support@policyhub.example.com</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium">Live Chat</p>
                          <p className="text-sm text-gray-500">Available during business hours:</p>
                          <Button variant="link" className="h-auto p-0 text-sm">Start a chat session</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Response Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">
                        We aim to respond to all support requests within 24 hours. 
                        Premium support customers receive priority response within 4 hours.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}