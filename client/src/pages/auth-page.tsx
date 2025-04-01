import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useAuth, registerFormSchema, RegisterData } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Eye, EyeOff, FileText, Search, ShieldCheck, Lock, User } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

export default function AuthPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoginForm, setIsLoginForm] = useState(true);
  const { loginMutation, registerMutation, user } = useAuth();
  const [_, navigate] = useLocation();
  
  // Login form setup
  const loginForm = useForm<{ username: string; password: string }>({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form setup
  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      name: "",
      email: "",
      company: "",
      role: "admin",
    },
  });
  
  // Redirect if user is already logged in
  // Using useEffect to handle navigation after render
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Handle login form submission
  const onLoginSubmit = (data: { username: string; password: string }) => {
    loginMutation.mutate(data);
  };

  // Handle register form submission
  const onRegisterSubmit = (data: RegisterData) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 relative">
      {/* Background pattern with soft gradient overlay */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMzYjgyZjYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptNiA2djZoNnYtNmgtNnptLTEyIDBoNnY2aC02di02em0wLTEyaDZ2Nmg2djZoNnYtMTJoLTZ2LTZoLTZ2LTZoLTZ2MTJoLTZ2Nmg2di02em0tNiAwdi02aC02djZoNnptLTYgMGgtNnY2aDZ2LTZ6TTYgMTh2Nmg2di02SDZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-60"></div>
      </div>
      
      {/* Left side - Form */}
      <div className="relative z-10 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 min-h-[100vh] overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="mb-6 sm:mb-8 flex items-center justify-center lg:justify-start">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center mr-3 shadow-md">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <span className="font-bold text-2xl sm:text-3xl bg-gradient-to-r from-primary to-primary/80 text-transparent bg-clip-text">Pro Policy AI</span>
              <div className="text-xs text-neutral-500">Intelligent Policy Management</div>
            </div>
          </div>
          
          <Tabs defaultValue="login" onValueChange={(value) => setIsLoginForm(value === "login")}>
            <TabsList className="grid w-full grid-cols-2 mb-6 shadow-sm bg-white/80 backdrop-blur-sm">
              <TabsTrigger value="login" className="data-[state=active]:shadow-md data-[state=active]:font-medium">
                <User className="h-4 w-4 mr-2" />
                Login
              </TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:shadow-md data-[state=active]:font-medium">
                <Lock className="h-4 w-4 mr-2" />
                Register
              </TabsTrigger>
            </TabsList>
            
            {/* Login Form */}
            <TabsContent value="login">
              <Card className="backdrop-blur-sm border-none shadow-lg overflow-hidden">
                <div className="absolute h-2 bg-gradient-to-r from-primary to-blue-400 w-full top-0 left-0"></div>
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold flex items-center">
                    <User className="h-5 w-5 mr-2 text-primary" />
                    Login to your account
                  </CardTitle>
                  <CardDescription>
                    Enter your credentials to access the Pro Policy AI platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium">Username</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                                <Input 
                                  placeholder="Enter your username" 
                                  {...field} 
                                  className="pl-10 bg-white/70 backdrop-blur-sm hover:bg-white/90 transition-colors"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium">Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Enter your password"
                                  {...field}
                                  className="pl-10 bg-white/70 backdrop-blur-sm hover:bg-white/90 transition-colors"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-0 top-0 h-full"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full transition-all mt-6 shadow-md bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary" 
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent border-current"></div>
                            Logging in...
                          </>
                        ) : (
                          "Sign In"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="bg-neutral-50/80 py-3 px-6 text-xs text-neutral-500 flex justify-between">
                  <div>Need help? Contact IT support</div>
                  <div>v2.0.4</div>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* Register Form */}
            <TabsContent value="register">
              <Card className="backdrop-blur-sm border-none shadow-lg overflow-hidden">
                <div className="absolute h-2 bg-gradient-to-r from-primary to-blue-400 w-full top-0 left-0"></div>
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold flex items-center">
                    <Lock className="h-5 w-5 mr-2 text-primary" />
                    Create an account
                  </CardTitle>
                  <CardDescription>
                    Join Pro Policy AI to start managing your company documents
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-medium">Full Name</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <User className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                                  <Input 
                                    placeholder="John Doe" 
                                    {...field} 
                                    className="pl-10 bg-white/70 backdrop-blur-sm hover:bg-white/90 transition-colors"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={registerForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-medium">Username</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <User className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                                  <Input 
                                    placeholder="johndoe" 
                                    {...field} 
                                    className="pl-10 bg-white/70 backdrop-blur-sm hover:bg-white/90 transition-colors"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium">Email</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <div className="absolute left-3 top-3 h-4 w-4 text-neutral-400">@</div>
                                <Input 
                                  type="email" 
                                  placeholder="john@example.com" 
                                  {...field} 
                                  className="pl-10 bg-white/70 backdrop-blur-sm hover:bg-white/90 transition-colors"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="company"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium">Company Name</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <FileText className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                                <Input 
                                  placeholder="Acme Inc." 
                                  {...field} 
                                  className="pl-10 bg-white/70 backdrop-blur-sm hover:bg-white/90 transition-colors"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium">Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Create a password"
                                  {...field}
                                  className="pl-10 bg-white/70 backdrop-blur-sm hover:bg-white/90 transition-colors"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-0 top-0 h-full"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-medium">Confirm Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                                <Input
                                  type={showConfirmPassword ? "text" : "password"}
                                  placeholder="Confirm your password"
                                  {...field}
                                  className="pl-10 bg-white/70 backdrop-blur-sm hover:bg-white/90 transition-colors"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-0 top-0 h-full"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                  {showConfirmPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full transition-all mt-6 shadow-md bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary" 
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent border-current"></div>
                            Creating account...
                          </>
                        ) : (
                          "Create Account"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="bg-neutral-50/80 py-3 px-6 text-xs text-neutral-500 flex justify-between">
                  <div>By signing up, you agree to our terms and privacy policy</div>
                  <div></div>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Right side - Hero */}
      <div className="hidden lg:flex flex-col justify-center relative overflow-hidden">
        {/* Background with gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary z-0">
          {/* Abstract pattern background */}
          <div className="absolute inset-0 opacity-10" style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
            backgroundSize: '24px 24px'
          }}></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 max-w-lg p-16 text-white">
          <div className="flex items-center mb-6">
            <div className="h-12 w-12 rounded-lg bg-white bg-opacity-20 backdrop-blur-sm shadow-lg flex items-center justify-center mr-4">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Pro Policy AI</h2>
          </div>
          
          <h1 className="text-4xl font-bold mb-6 leading-tight text-white">
            Smarter Policy <br />Management for<br />Modern Teams
          </h1>
          
          <p className="text-lg mb-10 text-white/90">
            Our AI-powered platform helps companies streamline policy management, enhance compliance, and provide instant access to critical information.
          </p>
          
          <div className="space-y-6 backdrop-blur-sm bg-white/10 p-6 rounded-lg">
            <div className="text-xl font-medium mb-4 flex items-center text-white">
              <ShieldCheck className="mr-2 h-6 w-6 text-white" />
              Key Features
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="h-8 w-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center mr-3 mt-0.5 shadow-sm">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <div>
                  <span className="font-medium text-white">Centralized Repository</span>
                  <p className="text-sm text-white/80 mt-1">Store all company policies in one secure, searchable location</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="h-8 w-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center mr-3 mt-0.5 shadow-sm">
                  <Search className="h-4 w-4 text-white" />
                </div>
                <div>
                  <span className="font-medium text-white">AI-Powered Search</span>
                  <p className="text-sm text-white/80 mt-1">Find the right policy content instantly with advanced AI search</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="h-8 w-8 rounded-full bg-white bg-opacity-20 flex items-center justify-center mr-3 mt-0.5 shadow-sm">
                  <Eye className="h-4 w-4 text-white" />
                </div>
                <div>
                  <span className="font-medium text-white">Usage Analytics</span>
                  <p className="text-sm text-white/80 mt-1">Track policy engagement and compliance across your organization</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
