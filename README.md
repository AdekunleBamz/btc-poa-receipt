# Bitcoin Proof-of-Action Receipt System

A minimal, production-ready Bitcoin-anchored timestamped receipt system built on Stacks (Bitcoin L2).

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Stacks    │────▶│  Chainhook  │
│  (Vite App) │     │  Blockchain │     │   (Hiro)    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │   Backend   │
                                        │  (Node.js)  │
                                        └─────────────┘
```

## Components

### 1. Smart Contract (`contracts/proof-of-action.clar`)
- Accepts 32-byte hash submissions
- Charges 0.001 STX fee per submission
- Emits `proof-submitted` print event for indexing
- Minimal and auditable

### 2. Chainhook Config (`chainhooks/proof-submitted.chainhook.json`)
- Listens for `proof-submitted` print events
- Triggers HTTP POST to backend webhook
- Configure for testnet or mainnet

### 3. Backend (`backend/`)
- Node.js HTTP server (no frameworks)
- SQLite database for receipt storage
- Endpoints:
  - `POST /api/webhook/proof` - Chainhook webhook
  - `GET /receipt/:id` - Public receipt lookup
  - `GET /api/verify?hash=` - Verify proof exists
  - `GET /api/receipts/by-user?address=` - User receipts

### 4. Frontend (`frontend/`)
- Vite + vanilla JS
- Stacks wallet connection
- Client-side SHA-256 hashing
- Transaction submission and receipt display

## Quick Start

### Prerequisites
- Node.js 18+
- Stacks wallet (Leather or Xverse)
- [Clarinet](https://github.com/hirosystems/clarinet) for contract deployment

### 1. Deploy Smart Contract

```bash
# Install Clarinet
brew install clarinet  # or see docs for other OS

# Initialize Clarinet project (if needed)
cd contracts
clarinet new poa-project
cp proof-of-action.clar poa-project/contracts/

# Test contract
cd poa-project
clarinet test

# Deploy to testnet
clarinet deployments generate --testnet
clarinet deployments apply -p deployments/default.testnet-plan.yaml
```

### 2. Start Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your settings
npm start
```

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Configure Chainhook

Edit `chainhooks/proof-submitted.chainhook.json`:
- Update `contract_identifier` with your deployed contract address
- Update `url` with your backend webhook URL
- Set `authorization_header` to match your `WEBHOOK_SECRET`

Register with Hiro Platform or run locally:
```bash
chainhook predicates register chainhooks/proof-submitted.chainhook.json --api-key YOUR_API_KEY
```

## Configuration

### Contract Constants
- `submission-fee`: 1000 microSTX (0.001 STX)
- Fee recipient: Contract deployer

### Environment Variables (Backend)
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3001 |
| `WEBHOOK_SECRET` | Chainhook auth token | dev-webhook-secret |
| `DB_PATH` | SQLite database path | ./receipts.db |
| `PUBLIC_BASE_URL` | Public URL for receipts | http://localhost:3001 |

### Frontend Config (`app.js`)
- `network`: 'testnet' or 'mainnet'
- `contractAddress`: Deployed contract address
- `contractName`: 'proof-of-action'

## API Reference

### POST /api/webhook/proof
Chainhook webhook endpoint. Requires Bearer token authentication.

### GET /receipt/:id
Returns receipt by ID:
```json
{
  "id": "abc123",
  "txid": "0x...",
  "userAddress": "ST...",
  "proofHash": "0x...",
  "blockHeight": 12345,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "verifyUrl": "https://explorer.stacks.co/txid/..."
}
```

### GET /api/verify?hash=0x...
Verify if a proof hash exists:
```json
{
  "verified": true,
  "receipt": { ... }
}
```

## Security Considerations

1. **Hash-only storage**: Raw content never touches the blockchain
2. **Client-side hashing**: SHA-256 performed in browser
3. **Webhook authentication**: Bearer token for Chainhook requests
4. **Chain as source of truth**: Backend verifies via blockchain events

## Production Deployment

1. Deploy contract to mainnet
2. Host backend with HTTPS
3. Set secure `WEBHOOK_SECRET`
4. Register Chainhook with Hiro Platform
5. Build frontend: `npm run build`
6. Serve frontend static files

## File Structure

```
btc-poa-receipt/
├── contracts/
│   └── proof-of-action.clar     # Clarity smart contract
├── chainhooks/
│   └── proof-submitted.chainhook.json  # Hiro Chainhook config
├── backend/
│   ├── package.json
│   ├── config.js                # Configuration
│   ├── db.js                    # SQLite database
│   ├── server.js                # HTTP server
│   └── .env.example
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── styles.css
│   └── app.js                   # Main application
└── README.md
```

## License

MIT License

Copyright (c) 2024 Adekunle Bamz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Contributing

We welcome contributions to the Bitcoin Proof-of-Action Receipt System! Here's how you can help:

### Ways to Contribute
- **Bug Fixes**: Report and fix issues in the smart contract, backend, or frontend
- **Security Improvements**: Enhance security measures and audit the system
- **Documentation**: Improve README, add tutorials, or create usage guides
- **Testing**: Add more comprehensive tests for all components
- **Features**: Propose and implement new functionality
- **Performance**: Optimize contract gas usage or backend performance

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes and ensure tests pass
4. Run the full test suite: `npm test` in both contract and backend directories
5. Submit a pull request with a clear description

### Code Standards
- Follow existing code style and patterns
- Add tests for new functionality
- Update documentation for significant changes
- Ensure backward compatibility where possible

### Security Considerations
When contributing, please consider:
- Smart contract security best practices
- Input validation and sanitization
- Proper error handling
- Gas optimization
- Chainhook webhook security
