import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkoutUrl: string | null;
  orderId: string | null;
  expireOn: string | null;
  onPaymentSuccess: () => void;
}

export function PaymentModal({ 
  open, 
  onOpenChange, 
  checkoutUrl,
  orderId, 
  expireOn,
  onPaymentSuccess 
}: PaymentModalProps) {
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes countdown
  const [iframeError, setIframeError] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setChecking(false);
      setIframeError(false);
    }
  }, [open]);

  // Countdown timer
  useEffect(() => {
    if (!open || !expireOn) return;
    
    const expireTime = new Date(expireOn).getTime();
    
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
  }, [open, expireOn, onOpenChange, toast]);

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

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Fallback: open in new window if iframe fails
  const openInNewWindow = useCallback(() => {
    if (checkoutUrl) {
      window.open(checkoutUrl, 'SePay Payment', 'width=600,height=800,scrollbars=yes');
    }
  }, [checkoutUrl]);

  const handleIframeError = () => {
    setIframeError(true);
  };

  if (!checkoutUrl) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Complete Payment</DialogTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className={timeLeft <= 60 ? "text-destructive font-medium" : ""}>
                {formatTime(timeLeft)}
              </span>
              {checking && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </div>
        </DialogHeader>
        
        {/* Iframe or Error Fallback */}
        <div className="flex-1 min-h-0 relative">
          {iframeError ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500" />
              <div>
                <h3 className="font-semibold text-lg mb-2">Unable to load payment page</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  The payment page couldn't be loaded in this window. 
                  Click below to open it in a new tab.
                </p>
              </div>
              <Button onClick={openInNewWindow}>
                Open Payment Page
              </Button>
              <p className="text-xs text-muted-foreground">
                This page will update automatically when payment is completed.
              </p>
            </div>
          ) : (
            <iframe 
              src={checkoutUrl}
              className="w-full h-full border-0"
              title="SePay Checkout"
              allow="payment"
              onError={handleIframeError}
              sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-top-navigation"
            />
          )}
        </div>
        
        {/* Footer */}
        <div className="p-3 border-t text-center text-xs text-muted-foreground shrink-0">
          This page will update automatically when payment is received.
        </div>
      </DialogContent>
    </Dialog>
  );
}
