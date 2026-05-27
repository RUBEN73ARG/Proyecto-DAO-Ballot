import { createContext, useContext, useState, useEffect, type ReactNode, type FC } from 'react';
import { ethers } from 'ethers';

interface Web3ContextType {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  account: string | null;
  connectWallet: () => Promise<void>;
  error: string | null;
  chainId: string | null;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const Web3Provider: FC<{ children: ReactNode }> = ({ children }) => {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        // Use BrowserProvider when MetaMask is available
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        
        // Request account access
        const accounts = await web3Provider.send("eth_requestAccounts", []);
        
        const web3Signer = await web3Provider.getSigner();
        const currentAccount = accounts[0];
        const network = await web3Provider.getNetwork();

        setProvider(web3Provider);
        setSigner(web3Signer);
        setAccount(currentAccount);
        setChainId(network.chainId.toString());
        setError(null);
      } else {
        // Fallback to JSON-RPC if no wallet is installed
        // Using a public Sepolia endpoint
        const FALLBACK_RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com"; 
        
        console.warn("MetaMask not found. Falling back to read-only JSON-RPC provider (Sepolia).");
        const rpcProvider = new ethers.JsonRpcProvider(FALLBACK_RPC_URL);
        const network = await rpcProvider.getNetwork();
        
        setProvider(rpcProvider as any); 
        setSigner(null);
        setAccount(null);
        setChainId(network.chainId.toString());
        setError("MetaMask no está instalado. Estás en modo de solo lectura (Sepolia).");
      }
    } catch (err: any) {
      console.error("Error connecting wallet:", err);
      
      // Parse errors for a better User Experience
      const errorMsg = err.message || "";
      if (errorMsg.includes("-32002") || errorMsg.includes("already pending")) {
        setError("Ya tienes una solicitud de MetaMask abierta. Por favor, revisa la extensión para aceptarla.");
      } else if (errorMsg.includes("4001") || errorMsg.includes("User rejected")) {
        setError("Has rechazado la solicitud de conexión en MetaMask.");
      } else {
        setError("Hubo un error al intentar conectar tu billetera. Por favor, inténtalo de nuevo.");
      }
    }
  };

  useEffect(() => {
    // Check if wallet is already connected
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const web3Provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await web3Provider.send("eth_accounts", []);
          if (accounts.length > 0) {
            const web3Signer = await web3Provider.getSigner();
            const network = await web3Provider.getNetwork();
            setProvider(web3Provider);
            setSigner(web3Signer);
            setAccount(accounts[0]);
            setChainId(network.chainId.toString());
          }
        } catch (err) {
          console.error("Error checking connection on load:", err);
        }
      }
    };
    
    checkConnection();

    // Setup event listeners for MetaMask changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          // Re-initialize signer
          const web3Provider = new ethers.BrowserProvider(window.ethereum);
          web3Provider.getSigner().then(setSigner).catch(console.error);
        } else {
          setAccount(null);
          setSigner(null);
        }
      });

      window.ethereum.on('chainChanged', (newChainId: string) => {
        setChainId(BigInt(newChainId).toString());
        window.location.reload(); // Best practice to reload on chain change
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
        window.ethereum.removeListener('chainChanged', () => {});
      }
    };
  }, []);

  return (
    <Web3Context.Provider value={{ provider, signer, account, connectWallet, error, chainId }}>
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};
