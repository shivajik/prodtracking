import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sprout, Phone, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import logoUrl from "@assets/nbil-logo-a_1762228411331.png";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginData = z.infer<typeof loginSchema>;

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const [, setLocation] = useLocation();

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Redirect if already logged in
  if (user) {
    if (user.role === "admin") {
      setLocation("/admin");
    } else {
      setLocation("/");
    }
    return null;
  }

  const onLogin = (data: LoginData) => {
    loginMutation.mutate(data, {
      onSuccess: (user) => {
        if (user.role === "admin") {
          setLocation("/admin");
        } else {
          setLocation("/");
        }
      },
    });
  };

  const handleDemoLogin = (credentials: LoginData) => {
    loginForm.setValue("username", credentials.username);
    loginForm.setValue("password", credentials.password);
    onLogin(credentials);
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-yellow-50 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <img src={logoUrl} alt="Nath Seeds Logo" className="h-20 w-auto object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Nath Seeds</h1>
          <p className="text-muted-foreground mt-2">Product Tracking System</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Access Your Account</CardTitle>
            <CardDescription>Sign in to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4" data-testid="form-login">
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your username" {...field} data-testid="input-username" />
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter your password" {...field} data-testid="input-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            </Form>
            
            {/* <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-muted-foreground text-center mb-4">Quick Demo Access</p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleDemoLogin({ username: "admin", password: "admin123" })}
                  disabled={loginMutation.isPending}
                  data-testid="button-demo-admin"
                  className="text-sm"
                >
                  Demo Admin Login
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDemoLogin({ username: "op2", password: "test123" })}
                  disabled={loginMutation.isPending}
                  data-testid="button-demo-operator"
                  className="text-sm"
                >
                  Demo Operator Login
                </Button>
              </div>
            </div> */}
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground mt-6">
          <div className="mb-4">
            <p className="font-semibold text-foreground">Registered Office</p>
            <p>Nath House, Nath Road,</p>
            <p>Chhatrapati Sambhajinagar-431005, Maharashtra</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <Phone className="h-3 w-3" />
              <span>+91-240-3502421 to 25, +91-0240-6645555</span>
            </div>
            <div className="flex items-center justify-center gap-1 mt-1">
              <Mail className="h-3 w-3" />
              <span>info@nathseeds.com</span>
            </div>
          </div>
          <div>
            <p className="font-semibold text-foreground">Corporate Office</p>
            <p>1 Chateau Windsor, 86 Veer Nariman Road,</p>
            <p>Churchgate, Mumbai- 400020, Maharashtra</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <Phone className="h-3 w-3" />
              <span>+91-22- 22875652 to 55</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
