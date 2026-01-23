import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, Copy, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatVND } from "@/lib/pricing";
import { useToast } from "@/hooks/use-toast";

export interface QRData {
  qr_url: string;
  bank_name: string;
  bank_account: string;
  account_name: string;
  amount: number;
  description: string;
  expire_on: string;
}

interface PaymentQRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrData: QRData | null;
  orderId: string | null;
  onPaymentSuccess: () => void;
}

export function PaymentQRModal({ 
  open, 
  onOpenChange, 
  qrData, 
  orderId, 
  onPaymentSuccess 
}: PaymentQRModalProps) {
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes countdown
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setChecking(false);
      setCopiedField(null);
    }
  }, [open]);

  // Countdown timer
  useEffect(() => {
    if (!open || !qrData) return;
    
    const expireTime = new Date(qrData.expire_on).getTime();
    
    const calculateTimeLeft = () => {
      const remaining = Math.max(0, Math.floor((expireTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      return remaining;
    };
    
    // Calculate initial time left
    calculateTimeLeft();
    
    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      if (remaining <= 0) {
        clearInterval(interval);
        onOpenChange(false);
        toast({ 
          variant: "destructive", 
          title: "Payment expired",
          description: "The payment session has expired. Please try again."
        });
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [open, qrData, onOpenChange, toast]);

  // Poll payment status every 5 seconds
  useEffect(() => {
    if (!open || !orderId) return;
    
    const checkPaymentStatus = async () => {
      try {
        setChecking(true);
        const { data, error } = await supabase
          .from("billing_orders")
          .select("status")
          .eq("id", orderId)
          .single();
        
        if (error) {
          console.error("Error checking payment status:", error);
          return;
        }
        
        if (data?.status === 'paid') {
          onPaymentSuccess();
          onOpenChange(false);
        }
      } catch (err) {
        console.error("Payment status check failed:", err);
      } finally {
        setChecking(false);
      }
    };
    
    // Initial check after 3 seconds
    const initialTimeout = setTimeout(checkPaymentStatus, 3000);
    
    // Then poll every 5 seconds
    const interval = setInterval(checkPaymentStatus, 5000);
    
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [open, orderId, onPaymentSuccess, onOpenChange]);

  const copyToClipboard = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({ title: "Copied to clipboard!" });
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast({ variant: "destructive", title: "Failed to copy" });
    }
  }, [toast]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!qrData) return null;

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <Button 
      variant="ghost" 
      size="icon" 
      className="h-6 w-6 shrink-0" 
      onClick={() => copyToClipboard(text, field)}
    >
      {copiedField === field ? (
        <CheckCircle className="h-3 w-3 text-primary" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Scan QR to Pay</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-4">
          {/* QR Code */}
          <div className="border rounded-lg p-4 bg-white">
            <img 
              src={qrData.qr_url} 
              alt="Payment QR Code" 
              className="w-64 h-64 object-contain"
            />
          </div>
          
          {/* Timer and Status */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className={timeLeft <= 60 ? "text-destructive font-medium" : ""}>
              Expires in {formatTime(timeLeft)}
            </span>
            {checking && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
          </div>
          
          {/* Payment Info */}
          <div className="w-full space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Bank</span>
              <span className="font-medium">{qrData.bank_name}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Account Number</span>
              <div className="flex items-center gap-1">
                <span className="font-medium font-mono">{qrData.bank_account}</span>
                <CopyButton text={qrData.bank_account} field="account" />
              </div>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Account Name</span>
              <span className="font-medium">{qrData.account_name}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-bold text-lg text-primary">{formatVND(qrData.amount)}</span>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Transfer Content</span>
              <div className="flex items-center gap-1">
                <span className="font-medium font-mono text-xs">{qrData.description}</span>
                <CopyButton text={qrData.description} field="description" />
              </div>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground text-center px-4">
            Open your banking app, scan this QR code or transfer manually with the exact content above. 
            This page will update automatically when payment is received.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
