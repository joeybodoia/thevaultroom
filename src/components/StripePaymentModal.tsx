import React, { useState } from 'react';
import { X, CreditCard, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';

interface StripePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  roundId: string;
  selectedRarity: string;
  setName: string;
  onPaymentSuccess: () => void;
}

const StripePaymentModal: React.FC<StripePaymentModalProps> = ({
  isOpen,
  onClose,
  roundId,
  selectedRarity,
  setName,
  onPaymentSuccess
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleStripePayment = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // Get current user and auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Please sign in to continue');
      }

      // Initialize Stripe
      const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');
      
      if (!stripe) {
        throw new Error('Stripe failed to initialize');
      }

      // Create checkout session
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          roundId,
          selectedRarity,
          setName,
          amount: 100, // $1.00 in cents
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { sessionId } = await response.json();

      // Redirect to Stripe Checkout
      const { error } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (error) {
        throw error;
      }

    } catch (err: any) {
      console.error('Stripe payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-black font-pokemon">Complete Payment</h3>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-black mb-3 font-pokemon">Order Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 font-pokemon">Set:</span>
                <span className="font-semibold text-black font-pokemon">{setName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-pokemon">Rarity:</span>
                <span className="font-semibold text-black font-pokemon">{selectedRarity}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                <span className="text-gray-600 font-pokemon">Total:</span>
                <span className="font-bold text-black font-pokemon text-lg">$1.00</span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertCircle className="h-5 w-5" />
                <span className="font-semibold font-pokemon">Payment Failed</span>
              </div>
              <p className="text-red-600 text-sm mt-1 font-pokemon">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold font-pokemon">Payment Successful!</span>
              </div>
              <p className="text-green-600 text-sm mt-1 font-pokemon">
                Your lottery entry has been confirmed.
              </p>
            </div>
          )}

          {/* Payment Button */}
          <button
            onClick={handleStripePayment}
            disabled={isProcessing || success}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-pokemon flex items-center justify-center space-x-2"
          >
            {isProcessing ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : success ? (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>Payment Complete</span>
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                <span>Pay with Stripe - $1.00</span>
              </>
            )}
          </button>

          <div className="text-center">
            <p className="text-gray-500 text-xs font-pokemon">
              Secure payment powered by Stripe
            </p>
            <p className="text-gray-500 text-xs font-pokemon mt-1">
              Your payment information is encrypted and secure
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StripePaymentModal;