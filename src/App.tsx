import { useWeb3 } from './context/Web3Context';
import VotingPanel from './components/VotingPanel';

function App() {
  const { account, connectWallet, error, chainId } = useWeb3();

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo-container">
          <h1>Web3 Ballot</h1>
          <p className="subtitle">Decentralized Voting System</p>
        </div>
        
        <div className="wallet-info">
          {chainId && <span className="network-badge">Chain ID: {chainId}</span>}
          
          {account ? (
            <div className="wallet-address">
              {account.substring(0, 6)}...{account.substring(account.length - 4)}
            </div>
          ) : (
            <button className="btn-connect" onClick={connectWallet}>
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="feedback-alert error">
          {error}
        </div>
      )}

      <main>
        <VotingPanel />
      </main>
    </div>
  );
}

export default App;
