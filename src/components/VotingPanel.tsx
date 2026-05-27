import { useState, useEffect, type FC, type FormEvent } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '../context/Web3Context';
import contractABI from '../artifacts/VotingDAO.json';

// CONTRACT ADDRESS - Ensure to update this if you redeploy
const CONTRACT_ADDRESS = "0x244759b689415f5f9227Dc893C1c29F122CD0b11"; 

interface Proposal {
  id: number;
  name: string;
  voteCount: number;
}

interface VoterInfo {
  weight: number;
  voted: boolean;
  delegate: string;
  vote: number;
}

const VotingPanel: FC = () => {
  const { provider, signer, account } = useWeb3();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [chairperson, setChairperson] = useState<string>('');
  const [voterInfo, setVoterInfo] = useState<VoterInfo | null>(null);
  const [winner, setWinner] = useState<string>('');
  
  // Forms state
  const [newVoterAddress, setNewVoterAddress] = useState<string>('');
  const [delegateAddress, setDelegateAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{message: string, type: 'success'|'error'|'info'} | null>(null);

  useEffect(() => {
    if (provider) {
      loadContractData();
    }
  }, [provider, account]);

  const getContract = (useSigner = false) => {
    if (!provider) return null;
    return new ethers.Contract(
      CONTRACT_ADDRESS,
      contractABI,
      useSigner && signer ? signer : provider
    );
  };

  const loadContractData = async () => {
    const contract = getContract();
    if (!contract) return;

    try {
      // 1. Get Chairperson
      const chair = await contract.chairperson();
      setChairperson(chair.toLowerCase());

      // 2. Load voter info if connected
      if (account) {
        const vInfo = await contract.voters(account);
        setVoterInfo({
          weight: Number(vInfo.weight),
          voted: vInfo.voted,
          delegate: vInfo.delegate,
          vote: Number(vInfo.vote)
        });
      }

      // 3. Load proposals (Iterative fetch since we don't have getProposalsCount)
      const fetchedProposals: Proposal[] = [];
      let i = 0;
      while (true) {
        try {
          const prop = await contract.proposals(i);
          const nameString = ethers.decodeBytes32String(prop.name);
          fetchedProposals.push({
            id: i,
            name: nameString,
            voteCount: Number(prop.voteCount)
          });
          i++;
        } catch (e) {
          // Revert expected when index is out of bounds
          break;
        }
      }
      setProposals(fetchedProposals);

      // 4. Try to get winner if any votes exist
      if (fetchedProposals.some(p => p.voteCount > 0)) {
        try {
          const winName = await contract.winnerName();
          setWinner(ethers.decodeBytes32String(winName));
        } catch (e) {
          console.log("No winner yet or error fetching winner");
        }
      }

    } catch (error) {
      console.error("Error loading contract data:", error);
    }
  };

  const showFeedback = (message: string, type: 'success'|'error'|'info') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleGiveRightToVote = async (e: FormEvent) => {
    e.preventDefault();
    const contract = getContract(true);
    if (!contract || !newVoterAddress) return;

    setIsLoading(true);
    try {
      const tx = await contract.giveRightToVote(newVoterAddress);
      showFeedback(`Transaction sent! Hash: ${tx.hash}`, 'info');
      await tx.wait();
      showFeedback(`Right to vote successfully granted to ${newVoterAddress}!`, 'success');
      setNewVoterAddress('');
      loadContractData();
    } catch (error: any) {
      console.error(error);
      showFeedback(error.reason || error.message || "Error granting voting rights", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelegate = async (e: FormEvent) => {
    e.preventDefault();
    const contract = getContract(true);
    if (!contract || !delegateAddress) return;

    setIsLoading(true);
    try {
      const tx = await contract.delegate(delegateAddress);
      showFeedback(`Transaction sent! Hash: ${tx.hash}`, 'info');
      await tx.wait();
      showFeedback(`Successfully delegated vote to ${delegateAddress}!`, 'success');
      setDelegateAddress('');
      loadContractData();
    } catch (error: any) {
      console.error(error);
      showFeedback(error.reason || error.message || "Error delegating vote", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (proposalId: number) => {
    const contract = getContract(true);
    if (!contract) return;

    setIsLoading(true);
    try {
      const tx = await contract.vote(proposalId);
      showFeedback(`Transaction sent! Hash: ${tx.hash}`, 'info');
      await tx.wait();
      showFeedback(`Successfully voted for proposal ${proposalId}!`, 'success');
      loadContractData();
    } catch (error: any) {
      console.error(error);
      showFeedback(error.reason || error.message || "Error casting vote", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const isChairperson = account && chairperson === account.toLowerCase();
  const canVote = voterInfo && !voterInfo.voted && voterInfo.weight > 0;

  return (
    <div className="voting-panel">
      {feedback && (
        <div className={`feedback-alert ${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      <div className="panel-grid">
        {/* Left Column: Proposals & Voting */}
        <div className="card proposals-card">
          <h2>Candidates</h2>
          <div className="proposals-list">
            {proposals.length === 0 ? (
              <p className="empty-state">No candidates found or contract not deployed at {CONTRACT_ADDRESS}</p>
            ) : (
              proposals.map(p => (
                <div key={p.id} className="proposal-item">
                  <div className="proposal-info">
                    <span className="proposal-name">{p.name}</span>
                    <span className="proposal-votes">{p.voteCount} votes</span>
                  </div>
                  <button 
                    onClick={() => handleVote(p.id)}
                    disabled={!canVote || isLoading}
                    className="btn-vote"
                  >
                    Vote
                  </button>
                </div>
              ))
            )}
          </div>
          {winner && (
            <div className="winner-banner">
              <h3>Current Leader: <span>{winner}</span></h3>
            </div>
          )}
        </div>

        {/* Right Column: User Actions & Admin */}
        <div className="actions-column">
          <div className="card user-card">
            <h2>Your Voter Profile</h2>
            {account ? (
              <div className="profile-details">
                <p><strong>Status:</strong> {voterInfo?.voted ? 'Voted' : 'Not Voted'}</p>
                <p><strong>Weight:</strong> {voterInfo?.weight || 0}</p>
                {voterInfo?.delegate && voterInfo.delegate !== ethers.ZeroAddress && (
                  <p className="delegated-text">Delegated to: {voterInfo.delegate.slice(0, 6)}...{voterInfo.delegate.slice(-4)}</p>
                )}
              </div>
            ) : (
              <p className="empty-state">Please connect your wallet.</p>
            )}

            {canVote && (
              <form onSubmit={handleDelegate} className="action-form">
                <h4>Delegate Vote</h4>
                <div className="input-group">
                  <input 
                    type="text" 
                    placeholder="Delegate Address (0x...)" 
                    value={delegateAddress}
                    onChange={(e) => setDelegateAddress(e.target.value)}
                    disabled={isLoading}
                  />
                  <button type="submit" disabled={isLoading || !delegateAddress} className="btn-secondary">Delegate</button>
                </div>
              </form>
            )}
          </div>

          {isChairperson && (
            <div className="card admin-card">
              <h2>Chairperson Panel</h2>
              <form onSubmit={handleGiveRightToVote} className="action-form">
                <p className="hint">Grant an address the right to vote.</p>
                <div className="input-group">
                  <input 
                    type="text" 
                    placeholder="Voter Address (0x...)" 
                    value={newVoterAddress}
                    onChange={(e) => setNewVoterAddress(e.target.value)}
                    disabled={isLoading}
                  />
                  <button type="submit" disabled={isLoading || !newVoterAddress} className="btn-primary">Grant Right</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VotingPanel;
