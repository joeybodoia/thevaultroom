import React from 'react';
import { Wallet, AlertCircle, CheckCircle } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';

const WalletButton: React.FC = () => {
  const { wallet, isConnecting, error, connectWallet, disconnectWallet } = useWallet();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: string) => {
    return parseFloat(balance).toFixed(4);
  };

  if (wallet.isConnected) {
    return (
      <div className="flex items-center space-x-2">
        <div className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-pokemon flex items-center space-x-2">
          <CheckCircle className="h-4 w-4" />
          <span>{formatAddress(wallet.address!)}</span>
          <span className="text-green-200">({formatBalance(wallet.balance!)} ETH)</span>
        </div>
        <button
          onClick={disconnectWallet}
          className="text-white/80 hover:text-white text-sm font-pokemon"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {error && (
        <div className="flex items-center space-x-1 text-red-400 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span className="font-pokemon">{error}</span>
        </div>
      )}
      <button
        onClick={connectWallet}
        disabled={isConnecting}
        className="bg-yellow-400 text-black px-4 py-2 rounded-lg font-semibold hover:bg-yellow-500 transition-all font-pokemon flex items-center space-x-2 disabled:opacity-50"
      >
        <Wallet className="h-4 w-4" />
        <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
      </button>
    </div>
  );
};

export default WalletButton;