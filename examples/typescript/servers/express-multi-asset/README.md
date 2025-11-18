# Express Multi-Asset Payment Example

This example demonstrates how to configure an x402 server to accept payments in multiple assets.

## Features

- **Multiple Stablecoins**: Accept USDC and custom stablecoins
- **Native Token Discounts**: Offer discounted pricing when users pay with your native token
- **Multiple Token Options**: Support various ERC-20 tokens with different denominations

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment variables:
```bash
# .env
PAY_TO=0x209693Bc6afc0C5328bA36FaF03C514EF312287C
NETWORK=base-sepolia
PORT=3000
```

3. Run the server:
```bash
pnpm dev
```

## Endpoints

### GET /health
Health check endpoint - no payment required.

Returns server status and list of available endpoints.

### GET /stablecoins
Demonstrates multiple stablecoin support.

**Payment Options:**
- USDC: $0.01
- CustomStable: 0.01 tokens

### GET /native-discount
Demonstrates native token discount pricing.

**Payment Options:**
- USDC: $0.02 (standard price)
- NativeToken: 0.01 tokens (50% discount)

### GET /multi-token
Demonstrates multiple token support.

**Payment Options:**
- USDC: $0.005
- TokenA: 5 tokens
- TokenB: 0.05 tokens
- TokenC: 0.5 tokens

## Testing with Clients

### Using fetch client:

```typescript
import { wrapFetchWithPayment, createSigner } from "x402-fetch";

const signer = createSigner({ evm: walletClient });
const fetchWithPay = wrapFetchWithPayment(fetch, signer);

// Automatically selects USDC
const response = await fetchWithPay("http://localhost:3000/stablecoins");
```

### Custom asset selection:

```typescript
const customSelector = (requirements) => {
  // Select CustomStable instead of USDC
  return requirements.find(r => 
    r.asset === "0x1234567890abcdef1234567890abcdef12345678"
  ) || requirements[0];
};

const fetchWithPay = wrapFetchWithPayment(
  fetch, 
  signer,
  undefined,
  customSelector
);
```

## Configuration Details

Each endpoint is configured with an array of `Price` options:

```typescript
price: [
  "$0.01",  // USDC (default)
  {         // Custom token
    amount: "10000",
    asset: {
      address: "0x...",
      decimals: 6,
      eip712: { name: "CustomToken", version: "1" }
    }
  }
]
```

The server generates multiple `PaymentRequirements` objects (one per asset) and returns them in the 402 response. Clients can select which asset to use for payment.

## Learn More

See [MULTI_ASSET_EXAMPLE.md](../../../../MULTI_ASSET_EXAMPLE.md) for comprehensive documentation.
