import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Key, Bell, Shield } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "../components/ui/sidebar";

// Profile form schema
const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  company: z.string().min(2, { message: "Company name must be at least 2 characters." }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);

  // Get user initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  // Initialize profile form with user data
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      company: user?.company || "",
    },
  });

  // Handle profile form submission
  const onSubmit = async (data: ProfileFormValues) => {
    // In a real app, this would update the user's profile
    // For now, we'll just show a success toast
    toast({
      title: "Profile updated",
      description: "Your profile has been updated successfully.",
    });
  };

  // Generate API key for browser extension
  const handleGenerateApiKey = async () => {
    setIsGeneratingKey(true);
    try {
      const res = await apiRequest("POST", "/api/extension/generate-key");
      const data = await res.json();
      setApiKey(data.apiKey);
      toast({
        title: "API Key Generated",
        description: "You can now use this key with the browser extension.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to generate API Key",
        description: "Please try again later.",
      });
    } finally {
      setIsGeneratingKey(false);
    }
  };

  if (!user) {
    return <div className="flex items-center justify-center h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="container py-10">
          <div className="mb-10">
            <h1 className="text-3xl font-bold">Account Settings</h1>
            <p className="text-gray-500 mt-2">Manage your account settings and preferences</p>
          </div>

          <Tabs defaultValue="profile">
            <TabsList className="mb-8">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User size={16} />
                <span>Profile</span>
              </TabsTrigger>
              <TabsTrigger value="api" className="flex items-center gap-2">
                <Key size={16} />
                <span>API Access</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell size={16} />
                <span>Notifications</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Profile Tab */}
            <TabsContent value="profile">
              <div className="grid gap-8 md:grid-cols-[1fr_2fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>Your Profile</CardTitle>
                    <CardDescription>This is your public profile information.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center text-center">
                    <Avatar className="h-24 w-24 mb-4">
                      <AvatarFallback className="text-xl bg-primary text-white">
                        {user.name ? getInitials(user.name) : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="text-xl font-bold">{user.name}</h3>
                    <p className="text-gray-500">{user.email}</p>
                    <Badge className="mt-2" variant="outline">{user.role || "User"}</Badge>
                    <p className="mt-4 text-sm">Company: {user.company}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Edit Profile</CardTitle>
                    <CardDescription>Update your personal information</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input placeholder="John Doe" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address</FormLabel>
                              <FormControl>
                                <Input placeholder="john@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="company"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company</FormLabel>
                              <FormControl>
                                <Input placeholder="Acme Inc." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit">Save Changes</Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* API Access Tab */}
            <TabsContent value="api">
              <Card>
                <CardHeader>
                  <CardTitle>API Access</CardTitle>
                  <CardDescription>Manage your API key for browser extension integration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold">Browser Extension API Key</h3>
                        <p className="text-sm text-gray-500">
                          This key is used for authenticating the browser extension.
                        </p>
                      </div>
                      <Button 
                        onClick={handleGenerateApiKey} 
                        disabled={isGeneratingKey}
                      >
                        {isGeneratingKey ? 
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : 
                          "Generate New Key"}
                      </Button>
                    </div>
                    
                    {apiKey && (
                      <div className="mt-4">
                        <Label>Your API Key</Label>
                        <div className="flex mt-1.5">
                          <Input readOnly value={apiKey} className="font-mono text-sm" />
                          <Button 
                            variant="outline" 
                            className="ml-2" 
                            onClick={() => {
                              navigator.clipboard.writeText(apiKey);
                              toast({
                                title: "Copied!",
                                description: "API key copied to clipboard",
                              });
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                        <p className="text-sm text-yellow-600 mt-2">
                          Please copy this key and keep it secure. It won't be shown again.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">API Usage Guidelines</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                      <li>Do not share your API key with others</li>
                      <li>If your key is compromised, generate a new one immediately</li>
                      <li>API rate limits: 100 requests per minute</li>
                      <li>All API usage is logged and monitored</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Configure how you receive notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="email-notifications" className="font-medium">Email Notifications</Label>
                        <p className="text-sm text-gray-500">Receive email notifications about your account</p>
                      </div>
                      <Switch id="email-notifications" defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="policy-update" className="font-medium">Policy Updates</Label>
                        <p className="text-sm text-gray-500">Get notified when policies are updated</p>
                      </div>
                      <Switch id="policy-update" defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="browser-notifications" className="font-medium">Browser Notifications</Label>
                        <p className="text-sm text-gray-500">Show browser notifications for important events</p>
                      </div>
                      <Switch id="browser-notifications" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="extension-updates" className="font-medium">Extension Updates</Label>
                        <p className="text-sm text-gray-500">Receive updates about new extension features</p>
                      </div>
                      <Switch id="extension-updates" defaultChecked />
                    </div>
                  </div>
                  
                  <Button>Save Preferences</Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}