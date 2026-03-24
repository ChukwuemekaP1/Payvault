import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { loginUser } from "../../lib/api";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";

interface AdminLoginForm {
  email: string;
  password: string;
}

export default function AdminLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginForm>();

  const onSubmit = async (data: AdminLoginForm) => {
    setIsLoading(true);
    
    try {
      const response = await loginUser({
        email: data.email,
        password: data.password,
      });
      
      // Store the user info including role
      login(response);
      
      // Check if user has admin role before redirecting
      // The backend should validate this on protected routes
      toast.success("Admin login successful!");
      navigate("/admin/dashboard", { replace: true });
    } catch (error: any) {
      console.error("Admin login error:", error);
      toast.error(
        error.response?.data?.error || 
        "Invalid credentials"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Admin Access
          </CardTitle>
          <CardDescription className="text-center">
            Sign in with your administrator credentials
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@payvault.com"
                disabled={isLoading}
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address",
                  },
                })}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                disabled={isLoading}
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters",
                  },
                })}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In as Admin"}
            </Button>
            
            <div className="text-center text-sm">
              <Link to="/auth/login" className="text-blue-600 hover:underline">
                Back to regular login
              </Link>
            </div>
            
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800 text-center">
                <strong>Demo Credentials:</strong><br />
                Email: admin@payvault.com<br />
                Password: Admin123!
              </p>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
