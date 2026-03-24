import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { api, getApiErrorMessage } from "../../lib/api";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

interface User {
  id: string;
  email: string;
  role: string;
  is_verified: boolean;
  created_at: string;
  wallet_id?: string;
  balance_kobo?: number;
  account_number?: string;
}

interface Wallet {
  id: string;
  user_id: string;
  balance_kobo: number;
  account_number: string;
  is_frozen: boolean;
}

interface CreditForm {
  amount_naira: number;
  reason: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { logout, accessToken } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWallet, setSelectedWallet] = useState<string>("");
  const [crediting, setCrediting] = useState(false);
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreditForm>();

  // Fetch all users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get("/admin/users?page=1&limit=50");
      setUsers(response.data.users || []);
    } catch (error: any) {
      console.error("Failed to fetch users:", error);
      toast.error(getApiErrorMessage(error));
      if (error.response?.status === 403) {
        toast.error("Admin access required");
        navigate("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreditWallet = async (data: CreditForm) => {
    if (!selectedWallet) {
      toast.error("Please select a user to credit");
      return;
    }

    // Check if selected user has a wallet
    const user = users.find(u => u.wallet_id === selectedWallet);
    if (!user?.wallet_id) {
      toast.error("Selected user does not have a wallet");
      return;
    }

    setCrediting(true);
    try {
      // Convert Naira to Kobo (₦1 = 100 kobo)
      const amountKobo = Math.round(data.amount_naira * 100);
      
      const response = await api.post(`/admin/wallets/${selectedWallet}/credit`, {
        amount_kobo: amountKobo,
        reason: data.reason,
      });

      const wallet: Wallet = response.data;
      
      toast.success(
        `Successfully credited ₦${(wallet.balance_kobo / 100).toLocaleString()} to ${wallet.account_number}`
      );
      
      reset();
      fetchUsers(); // Refresh the list
    } catch (error: any) {
      console.error("Credit failed:", error);
      toast.error(getApiErrorMessage(error));
    } finally {
      setCrediting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-600">Bank Operations Panel</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* User List */}
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                Select a user to credit their wallet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedWallet === user.wallet_id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => user.wallet_id && setSelectedWallet(user.wallet_id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{user.email}</p>
                        <p className="text-sm text-gray-600">
                          Account: {user.account_number || 'No wallet'}
                        </p>
                        {user.balance_kobo !== undefined && (
                          <p className="text-xs text-green-600 font-medium">
                            Balance: ₦{(user.balance_kobo / 100).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={user.role === "admin" ? "error" : "default"}>
                          {user.role}
                        </Badge>
                        {user.is_verified && (
                          <Badge variant="outline">Verified</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Credit Wallet Form */}
          <Card>
            <CardHeader>
              <CardTitle>Credit User Wallet</CardTitle>
              <CardDescription>
                Add funds from bank's operating account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedWallet ? (
                <form onSubmit={handleSubmit(handleCreditWallet)} className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>Selected User:</strong><br />
                      {users.find(u => u.wallet_id === selectedWallet)?.email}
                      {users.find(u => u.wallet_id === selectedWallet)?.account_number && (
                        <><br />Account: {users.find(u => u.wallet_id === selectedWallet)?.account_number}</>
                      )}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (₦)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="1"
                      placeholder="1000"
                      disabled={crediting}
                      {...register("amount_naira", {
                        required: "Amount is required",
                        min: {
                          value: 1,
                          message: "Minimum amount is ₦1",
                        },
                        valueAsNumber: true,
                      })}
                    />
                    {errors.amount_naira && (
                      <p className="text-sm text-red-600">
                        {errors.amount_naira.message}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Example: Enter 1000 for ₦1,000
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason for Credit</Label>
                    <textarea
                      id="reason"
                      className="w-full min-h-[100px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Manual deposit, promotional bonus, refund..."
                      disabled={crediting}
                      {...register("reason", {
                        required: "Reason is required",
                      })}
                    />
                    {errors.reason && (
                      <p className="text-sm text-red-600">
                        {errors.reason.message}
                      </p>
                    )}
                  </div>

                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800">
                      <strong>How Banks Work:</strong><br />
                      When you credit this account, the system performs double-entry bookkeeping:
                      <br />
                      • <strong>DEBIT:</strong> Bank Operating Account (₦{selectedWallet ? (users.find(u => u.id === selectedWallet)?.role === "system" ? "Internal" : "Reserve") : ""})
                      <br />
                      • <strong>CREDIT:</strong> User Wallet ({users.find(u => u.id === selectedWallet)?.email})
                      <br />
                      This maintains accounting balance and creates an audit trail.
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={crediting}
                  >
                    {crediting ? "Processing..." : `Credit ₦{(register("amount_kobo").onChange as any)?.target?.value || 0}`}
                  </Button>
                </form>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Select a user from the list to credit their wallet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
