import React, { useState } from 'react';
import { X, Wallet, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';

interface CryptoPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  priceRange: string;
  usdAmount: number;
}

const CryptoPaymentModal: React.FC<CryptoPaymentModalProps> = ({
  isOpen,
  onClose,
  priceRange,
  usdAmount,
}) => {
  const { wallet, connectWallet, sendPayment } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mock ETH price - in production, you'd fetch this from an API
  const ethPrice = 3200; // USD per ETH
  const ethAmount = (usdAmount / ethPrice).toFixed(6);

  // Mock recipient address - replace with your actual address
  const recipientAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';

  const handlePayment = async () => {
    if (!wallet.isConnected) {
      await connectWallet();
      return;
    }

    setIsProcessing(true);
    setError(null);
    setPaymentStatus('idle');

    try {
      const transaction = await sendPayment(recipientAddress, ethAmount);
      setTransactionHash(transaction.hash);
      setPaymentStatus('success');
    } catch (err: any) {
      setError(err.message);
      setPaymentStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-black font-pokemon">Crypto Payment</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-black mb-2 font-pokemon">Purchase Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 font-pokemon">Price Range:</span>
                <span className="font-semibold text-black font-pokemon">{priceRange}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-pokemon">USD Amount:</span>
                <span className="font-semibold text-black font-pokemon">${usdAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-pokemon">ETH Amount:</span>
                <span className="font-semibold text-black font-pokemon">{ethAmount} ETH</span>
              </div>
            </div>
          </div>

          {!wallet.isConnected && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-yellow-800">
                <Wallet className="h-5 w-5" />
                <span className="font-semibold font-pokemon">Connect Your Wallet</span>
              </div>
              <p className="text-yellow-600 text-sm mt-1 font-pokemon">
                Connect your MetaMask wallet to proceed with the payment.
              </p>
            </div>
          )}

          {wallet.isConnected && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold font-pokemon">Wallet Connected</span>
              </div>
              <p className="text-green-600 text-sm mt-1 font-pokemon">
                {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)} • {parseFloat(wallet.balance!).toFixed(4)} ETH
              </p>
            </div>
          )}

          {paymentStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold font-pokemon">Payment Successful!</span>
              </div>
              <p className="text-green-600 text-sm mt-1 font-pokemon">
                Transaction Hash: {transactionHash?.slice(0, 10)}...
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertCircle className="h-5 w-5" />
                <span className="font-semibold font-pokemon">Payment Failed</span>
              </div>
              <p className="text-red-600 text-sm mt-1 font-pokemon">{error}</p>
            </div>
          )}

          <button
            onClick={handlePayment}
            disabled={isProcessing || paymentStatus === 'success'}
            className="w-full bg-yellow-400 text-black font-bold py-3 rounded-lg hover:bg-yellow-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-pokemon flex items-center justify-center space-x-2"
          >
            {isProcessing ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : paymentStatus === 'success' ? (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>Payment Complete</span>
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4" />
                <span>{wallet.isConnected ? `Pay ${ethAmount} ETH` : 'Connect & Pay'}</span>
              </>
            )}
          </button>

          <p className="text-gray-500 text-xs text-center font-pokemon">
            * ETH price is estimated. Final amount may vary slightly due to network fees.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CryptoPaymentModal;