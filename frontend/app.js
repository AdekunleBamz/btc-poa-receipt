import { AppConfig, showConnect, UserSession } from '@stacks/connect';
import { StacksTestnet, StacksMainnet } from '@stacks/network';
import { 
  makeContractCall, 
  bufferCV,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode
} from '@stacks/transactions';

// Configuration
const CONFIG = {
  // Mainnet deployment
  network: 'mainnet',
  contractAddress: 'SP31G2FZ5JN87BATZMP4ZRYE5F7WZQDNEXJ7G7X97',
  contractName: 'proof-of-action',
  appName: 'Bitcoin Proof-of-Action',
  appIcon: window.location.origin + '/favicon.ico',
  backendUrl: window.location.origin,
  fee: 1000 // microSTX (0.001 STX)
};

// App config and user session
const appConfig = new AppConfig(['store_write']);
const userSession = new UserSession({ appConfig });

// Network setup
const network = CONFIG.network === 'mainnet' 
  ? new StacksMainnet() 
  : new StacksTestnet();

// State
let currentHash = null;
let currentDescription = '';

// DOM Elements
const elements = {
  connectBtn: document.getElementById('connect-btn'),
  disconnectBtn: document.getElementById('disconnect-btn'),
  walletStatus: document.getElementById('wallet-status'),
  walletInfo: document.getElementById('wallet-info'),
  userAddress: document.getElementById('user-address'),
  submitSection: document.getElementById('submit-section'),
  proofForm: document.getElementById('proof-form'),
  contentInput: document.getElementById('content'),
  descriptionInput: document.getElementById('description'),
  hashPreview: document.getElementById('hash-preview'),
  computedHash: document.getElementById('computed-hash'),
  submitBtn: document.getElementById('submit-btn'),
  statusSection: document.getElementById('status-section'),
  statusMessage: document.getElementById('status-message'),
  txResult: document.getElementById('tx-result'),
  txLink: document.getElementById('tx-link'),
  receiptSection: document.getElementById('receipt-section'),
  receiptId: document.getElementById('receipt-id'),
  receiptHash: document.getElementById('receipt-hash'),
  receiptBlock: document.getElementById('receipt-block'),
  receiptTimestamp: document.getElementById('receipt-timestamp'),
  receiptUrl: document.getElementById('receipt-url'),
  newProofBtn: document.getElementById('new-proof-btn'),
  verifyForm: document.getElementById('verify-form'),
  verifyContent: document.getElementById('verify-content'),
  verifyResult: document.getElementById('verify-result')
};

// Utility: Hash content using SHA-256
async function sha256(content) {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuffer);
}

// Utility: Convert Uint8Array to hex string
function toHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Check if user is logged in
function isLoggedIn() {
  return userSession.isUserSignedIn();
}

// Get user address
function getUserAddress() {
  if (!isLoggedIn()) return null;
  const userData = userSession.loadUserData();
  return CONFIG.network === 'mainnet'
    ? userData.profile.stxAddress.mainnet
    : userData.profile.stxAddress.testnet;
}

// Update UI based on auth state
function updateAuthUI() {
  if (isLoggedIn()) {
    elements.walletStatus.classList.add('hidden');
    elements.walletInfo.classList.remove('hidden');
    elements.userAddress.textContent = getUserAddress();
    elements.submitSection.classList.remove('hidden');
  } else {
    elements.walletStatus.classList.remove('hidden');
    elements.walletInfo.classList.add('hidden');
    elements.submitSection.classList.add('hidden');
    elements.statusSection.classList.add('hidden');
    elements.receiptSection.classList.add('hidden');
  }
}

// Connect wallet
function connectWallet() {
  showConnect({
    appDetails: {
      name: CONFIG.appName,
      icon: CONFIG.appIcon
    },
    redirectTo: '/',
    onFinish: () => {
      updateAuthUI();
    },
    userSession
  });
}

// Disconnect wallet
function disconnectWallet() {
  userSession.signUserOut('/');
  updateAuthUI();
}

// Update hash preview when content changes
async function updateHashPreview() {
  const content = elements.contentInput.value.trim();
  
  if (content) {
    const hashBytes = await sha256(content);
    currentHash = hashBytes;
    elements.computedHash.textContent = '0x' + toHex(hashBytes);
    elements.hashPreview.classList.remove('hidden');
    elements.submitBtn.disabled = false;
  } else {
    currentHash = null;
    elements.hashPreview.classList.add('hidden');
    elements.submitBtn.disabled = true;
  }
}

// Submit proof to blockchain
async function submitProof(e) {
  e.preventDefault();
  
  if (!currentHash || !isLoggedIn()) return;
  
  currentDescription = elements.descriptionInput.value.trim();
  
  // Show status section
  elements.statusSection.classList.remove('hidden');
  elements.txResult.classList.add('hidden');
  elements.statusMessage.textContent = 'Preparing transaction...';
  
  try {
    const txOptions = {
      contractAddress: CONFIG.contractAddress,
      contractName: CONFIG.contractName,
      functionName: 'submit-proof',
      functionArgs: [bufferCV(currentHash)],
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Allow,
      onFinish: (data) => {
        handleTransactionSubmitted(data.txId);
      },
      onCancel: () => {
        elements.statusMessage.textContent = 'Transaction cancelled by user';
      }
    };
    
    // Use openContractCall from @stacks/connect for wallet signing
    const { openContractCall } = await import('@stacks/connect');
    await openContractCall(txOptions);
    
  } catch (error) {
    console.error('Submit error:', error);
    elements.statusMessage.textContent = `Error: ${error.message}`;
  }
}

// Handle successful transaction submission
function handleTransactionSubmitted(txId) {
  elements.statusMessage.textContent = 'Transaction submitted! Waiting for confirmation...';
  elements.txResult.classList.remove('hidden');
  
  const explorerUrl = CONFIG.network === 'mainnet'
    ? `https://explorer.stacks.co/txid/${txId}`
    : `https://explorer.stacks.co/txid/${txId}?chain=testnet`;
  
  elements.txLink.href = explorerUrl;
  elements.txLink.textContent = txId;
  
  // Poll for receipt (backend will create it when Chainhook fires)
  pollForReceipt(txId);
}

// Poll backend for receipt (created by Chainhook webhook)
async function pollForReceipt(txId) {
  const maxAttempts = 120; // 10 minutes max
  let attempts = 0;
  
  const normalizedTxId = txId.startsWith('0x') ? txId : `0x${txId}`;
  
  elements.statusMessage.textContent = 'Transaction submitted. Waiting for Chainhook confirmation...';
  
  const poll = async () => {
    try {
      const response = await fetch(`${CONFIG.backendUrl}/api/receipt/by-txid?txid=${normalizedTxId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data && !data.error) {
          displayReceipt(data);
          return;
        }
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        elements.statusMessage.textContent = `Waiting for Chainhook... (${attempts * 5}s)`;
        setTimeout(poll, 5000);
      } else {
        elements.statusMessage.textContent = 'Timeout waiting for Chainhook. Check explorer for tx status.';
      }
    } catch (error) {
      console.error('Poll error:', error);
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 5000);
      }
    }
  };
  
  // Start polling after a short delay
  setTimeout(poll, 5000);
}

// Display the receipt
function displayReceipt(receipt) {
  elements.statusSection.classList.add('hidden');
  elements.receiptSection.classList.remove('hidden');
  
  elements.receiptId.textContent = receipt.id || receipt.submission_id;
  elements.receiptHash.textContent = receipt.proof_hash || receipt.proofHash;
  elements.receiptBlock.textContent = receipt.block_height || receipt.blockHeight;
  elements.receiptTimestamp.textContent = new Date(receipt.timestamp).toLocaleString();
  
  const receiptUrl = `${CONFIG.backendUrl}/receipt/${receipt.id}`;
  elements.receiptUrl.href = receiptUrl;
  elements.receiptUrl.textContent = receiptUrl;
}

// Reset form for new submission
function resetForm() {
  elements.proofForm.reset();
  elements.hashPreview.classList.add('hidden');
  elements.submitBtn.disabled = true;
  elements.statusSection.classList.add('hidden');
  elements.receiptSection.classList.add('hidden');
  currentHash = null;
  currentDescription = '';
}

// Verify a proof - check blockchain directly
async function verifyProof(e) {
  e.preventDefault();
  
  const content = elements.verifyContent.value.trim();
  if (!content) return;
  
  const hashBytes = await sha256(content);
  const hashHex = '0x' + toHex(hashBytes);
  
  elements.verifyResult.classList.remove('hidden', 'success', 'not-found');
  elements.verifyResult.innerHTML = '<strong>🔍 Searching...</strong>';
  
  try {
    const response = await fetch(`${CONFIG.backendUrl}/api/verify?hash=${encodeURIComponent(hashHex)}`);
    const result = await response.json();
    
    if (result.verified) {
      elements.verifyResult.classList.add('success');
      elements.verifyResult.innerHTML = `
        <strong>✅ Proof Verified!</strong><br>
        Block Height: ${result.receipt.block_height}<br>
        Timestamp: ${new Date(result.receipt.timestamp).toLocaleString()}<br>
        Sender: ${result.receipt.sender}<br>
        <a href="${CONFIG.backendUrl}/api/receipt/${result.receipt.id}" target="_blank">View Receipt</a>
      `;
    } else {
      elements.verifyResult.classList.add('not-found');
      elements.verifyResult.innerHTML = `
        <strong>❌ No proof found for this content</strong><br>
        <small>Hash: ${hashHex}</small>
      `;
    }
  } catch (error) {
    console.error('Verify error:', error);
    elements.verifyResult.classList.add('not-found');
    elements.verifyResult.innerHTML = `<strong>Error verifying proof: ${error.message}</strong>`;
  }
}

// Initialize app
function init() {
  // Check for pending auth
  if (userSession.isSignInPending()) {
    userSession.handlePendingSignIn().then(() => {
      updateAuthUI();
    });
  } else {
    updateAuthUI();
  }
  
  // Event listeners
  elements.connectBtn.addEventListener('click', connectWallet);
  elements.disconnectBtn.addEventListener('click', disconnectWallet);
  elements.contentInput.addEventListener('input', updateHashPreview);
  elements.proofForm.addEventListener('submit', submitProof);
  elements.newProofBtn.addEventListener('click', resetForm);
  elements.verifyForm.addEventListener('submit', verifyProof);
}

// Start app
init();
