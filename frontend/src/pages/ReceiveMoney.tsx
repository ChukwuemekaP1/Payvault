import * as React from "react";
import { Copy, CheckCircle2, Building2, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../store/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";

// Nigerian banks list
const NIGERIAN_BANKS = [
  { name: "PayVault", code: "PAYVAULT" },
  { name: "Access Bank", code: "ACCESS" },
  { name: "Ecobank Nigeria", code: "ECOBANK" },
  { name: "Fidelity Bank", code: "FIDELITY" },
  { name: "First Bank of Nigeria", code: "FIRSTBANK" },
  { name: "First City Monument Bank", code: "FCMB" },
  { name: "Guaranty Trust Bank", code: "GTBANK" },
  { name: "Heritage Bank", code: "HERITAGE" },
  { name: "Keystone Bank", code: "KEYSTONE" },
  { name: "Polaris Bank", code: "POLARIS" },
  { name: "Providus Bank", code: "PROVIDUS" },
  { name: "Stanbic IBTC Bank", code: "STANBIC" },
  { name: "Standard Chartered", code: "STANDARD_CHARTERED" },
  { name: "Sterling Bank", code: "STERLING" },
  { name: "Suntrust Bank Nigeria", code: "SUNTRUST" },
  { name: "Union Bank of Nigeria", code: "UNIONBANK" },
  { name: "United Bank for Africa", code: "UBA" },
  { name: "Unity Bank", code: "UNITY" },
  { name: "Wema Bank", code: "WEMA" },
  { name: "Zenith Bank", code: "ZENITH" },
];

interface CopyButtonProps {
  text: string;
  label: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ text, label }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied!", {
        description: `${label} copied to clipboard`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy", {
        description: "Please try again manually",
      });
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      disabled={copied}
      className={cn(
        "flex items-center gap-2 h-9 px-3 transition-all duration-200",
        copied && "bg-success/10 border-success/30 text-success"
      )}
    >
      {copied ? (
        <>
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" aria-hidden="true" />
          <span>Copy</span>
        </>
      )}
    </Button>
  );
};

const ReceiveMoney: React.FC = () => {
  const { user } = useAuthStore();
  const [selectedBank, setSelectedBank] = React.useState<string>("PAYVAULT");

  // Get user account details
  const accountNumber = user?.accountNumber || "Loading...";
  const accountName = user?.fullName || "Loading...";
  const email = user?.email || "";

  const selectedBankData = NIGERIAN_BANKS.find(b => b.code === selectedBank);

  return (
    <div className="min-h-screen bg-background text-text font-sans antialiased">
      {/* Header */}
      <div className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="font-serif text-2xl text-text">Receive Money</h1>
              <p className="font-sans text-sm text-muted mt-0.5">
                Share your account details to receive payments
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Your Account Details */}
          <Card className="border-border bg-surface shadow-card">
            <CardHeader>
              <CardTitle className="font-serif text-xl flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
                Your PayVault Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Account Number */}
              <div className="space-y-2">
                <Label htmlFor="account-number" className="text-sm font-medium text-muted">
                  Account Number
                </Label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center px-4 py-3 bg-surface/60 border border-border rounded-xl">
                    <span className="font-mono text-lg font-semibold text-text tracking-wide">
                      {accountNumber}
                    </span>
                  </div>
                  <CopyButton text={accountNumber} label="Account number" />
                </div>
              </div>

              {/* Account Name */}
              <div className="space-y-2">
                <Label htmlFor="account-name" className="text-sm font-medium text-muted">
                  Account Name
                </Label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center px-4 py-3 bg-surface/60 border border-border rounded-xl">
                    <span className="font-sans text-base font-medium text-text">
                      {accountName}
                    </span>
                  </div>
                  <CopyButton text={accountName} label="Account name" />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-muted">
                  Email Address
                </Label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center px-4 py-3 bg-surface/60 border border-border rounded-xl">
                    <span className="font-sans text-sm text-text">{email}</span>
                  </div>
                  <CopyButton text={email} label="Email address" />
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-4 border-t border-border">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() => {
                      const details = `Account Number: ${accountNumber}\nAccount Name: ${accountName}\nBank: PayVault`;
                      navigator.clipboard.writeText(details);
                      toast.success("All details copied!", {
                        description: "Account information copied to clipboard",
                      });
                    }}
                  >
                    Copy All Details
                  </Button>
                </div>
              </div>

              {/* Security Notice */}
              <div className="flex items-start gap-3 p-4 bg-primary/8 border border-primary/20 rounded-xl">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-sans text-sm text-primary font-medium">
                    Secure Transfer
                  </p>
                  <p className="font-sans text-xs text-muted mt-1 leading-relaxed">
                    Only share your account details with trusted sources. PayVault transfers are instant and irreversible.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nigerian Banks List */}
          <Card className="border-border bg-surface shadow-card">
            <CardHeader>
              <CardTitle className="font-serif text-xl">
                Supported Banks in Nigeria
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-sans text-sm text-muted">
                    You can receive transfers from any of these banks
                  </p>
                  <span className="font-sans text-xs font-medium text-primary bg-primary/8 px-2 py-1 rounded-full">
                    {NIGERIAN_BANKS.length} Banks
                  </span>
                </div>

                {/* Bank Selector */}
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                  {NIGERIAN_BANKS.map((bank) => (
                    <button
                      key={bank.code}
                      onClick={() => setSelectedBank(bank.code)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all duration-200",
                        "font-sans text-sm",
                        selectedBank === bank.code
                          ? "bg-primary/10 border-primary/30 text-primary font-medium"
                          : "bg-surface/60 border-border text-text hover:bg-surface hover:border-primary/20"
                      )}
                    >
                      <span>{bank.name}</span>
                      {selectedBank === bank.code && (
                        <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Selected Bank Info */}
                <div className="p-4 bg-surface/80 border border-border rounded-xl">
                  <p className="font-sans text-xs text-muted mb-2">
                    Currently selected:
                  </p>
                  <p className="font-sans text-sm font-semibold text-text">
                    {selectedBankData?.name}
                  </p>
                </div>

                {/* Help Text */}
                <div className="flex items-start gap-3 p-4 bg-info/8 border border-info/20 rounded-xl">
                  <Info className="h-5 w-5 text-info shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-sans text-sm text-info font-medium">
                      How to Receive Money
                    </p>
                    <ol className="font-sans text-xs text-muted mt-2 space-y-1 leading-relaxed list-decimal list-inside">
                      <li>Share your PayVault account details above</li>
                      <li>The sender can transfer from any bank in Nigeria</li>
                      <li>Funds arrive instantly in your wallet</li>
                      <li>You'll receive an email confirmation</li>
                    </ol>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Information */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Instant Transfers */}
          <Card className="border-border bg-surface shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 border border-success/30">
                  <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
                </div>
                <h3 className="font-serif text-base font-semibold text-text">Instant Transfers</h3>
              </div>
              <p className="font-sans text-sm text-muted leading-relaxed">
                Receive money instantly from any bank in Nigeria. Funds are available immediately.
              </p>
            </CardContent>
          </Card>

          {/* 24/7 Availability */}
          <Card className="border-border bg-surface shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/30">
                  <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <h3 className="font-serif text-base font-semibold text-text">24/7 Available</h3>
              </div>
              <p className="font-sans text-sm text-muted leading-relaxed">
                Receive transfers anytime, including weekends and public holidays.
              </p>
            </CardContent>
          </Card>

          {/* Secure & Insured */}
          <Card className="border-border bg-surface shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-info/10 border border-info/30">
                  <Info className="h-5 w-5 text-info" aria-hidden="true" />
                </div>
                <h3 className="font-serif text-base font-semibold text-text">Secure & Insured</h3>
              </div>
              <p className="font-sans text-sm text-muted leading-relaxed">
                Your funds are protected with bank-grade security and insurance coverage.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ReceiveMoney;
