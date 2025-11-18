# X402 Multi-Asset Payment Support

This guide demonstrates how to configure x402 servers to accept payments in multiple assets and how clients can select their preferred payment asset.

## Overview

With x402, servers can now specify multiple payment asset options for each endpoint, allowing clients to pay with their preferred token. The server provides a list of accepted assets in the payment requirements, and the client selects which one to use.

## Server Configuration

### Basic Multi-Asset Setup

Configure your server to accept multiple assets by passing an array of `Price` configurations:

```typescript
import express from "express";
import { paymentMiddleware } from "x402-express";

const app = express();

app.use(
  paymentMiddleware(
    "0x209693Bc6afc0C5328bA36FaF03C514EF312287C", // payTo address
    {
      "GET /premium-data": {
        price: [
          "$0.01", // USDC (default) - 0.01 USD in USDC
          {
            // Custom ERC-20 token
            amount: "1000000000000000", // 0.001 tokens (18 decimals)
            asset: {
              address: "0x1234567890abcdef1234567890abcdef12345678",
              decimals: 18,
              eip712: {
                name: "MyToken",
                version: "1",
              },
            },
          },
          {
            // Another custom token
            amount: "100000", // 0.1 tokens (6 decimals)
            asset: {
              address: "0xabcdef1234567890abcdef1234567890abcdef12",
              decimals: 6,
              eip712: {
                name: "AlternativeToken",
                version: "2",
              },
            },
          },
        ],
        network: "base-sepolia",
      },
    }
  )
);

app.get("/premium-data", (req, res) => {
  res.json({ data: "This is premium content" });
});
```

### Hono Multi-Asset Example

```typescript
import { Hono } from "hono";
import { paymentMiddleware } from "x402-hono";

const app = new Hono();

app.use(
  paymentMiddleware(
    "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
    {
      "/api/weather": {
        price: [
          "$0.001", // USDC - 0.001 USD
          {
            // WETH
            amount: "500000000000000", // 0.0005 ETH
            asset: {
              address: "0x4200000000000000000000000000000000000006",
              decimals: 18,
              eip712: {
                name: "Wrapped Ether",
                version: "1",
              },
            },
          },
        ],
        network: "base",
      },
    }
  )
);

app.get("/api/weather", (c) => {
  return c.json({ temperature: 72, conditions: "sunny" });
});
```

### Next.js Multi-Asset Example

```typescript
// middleware.ts
import { paymentMiddleware } from "x402-next";

export const middleware = paymentMiddleware(
  "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
  {
    "/api/premium/*": {
      price: [
        "$0.005", // USDC
        {
          // DAI
          amount: "5000000000000000", // 0.005 DAI
          asset: {
            address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
            decimals: 18,
            eip712: {
              name: "Dai Stablecoin",
              version: "1",
            },
          },
        },
      ],
      network: "base-sepolia",
    },
  }
);

export const config = {
  matcher: ["/api/premium/:path*"],
};
```

## Payment Requirements Response

When a client requests a protected endpoint without payment, the server responds with all accepted payment options:

```json
{
  "x402Version": 1,
  "error": "X-PAYMENT header is required",
  "accepts": [
    {
      "scheme": "exact",
      "network": "base-sepolia",
      "maxAmountRequired": "10000",
      "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      "payTo": "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
      "resource": "https://api.example.com/premium-data",
      "description": "",
      "mimeType": "",
      "maxTimeoutSeconds": 60,
      "extra": {
        "name": "USDC",
        "version": "2"
      }
    },
    {
      "scheme": "exact",
      "network": "base-sepolia",
      "maxAmountRequired": "1000000000000000",
      "asset": "0x1234567890abcdef1234567890abcdef12345678",
      "payTo": "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
      "resource": "https://api.example.com/premium-data",
      "description": "",
      "mimeType": "",
      "maxTimeoutSeconds": 60,
      "extra": {
        "name": "MyToken",
        "version": "1"
      }
    },
    {
      "scheme": "exact",
      "network": "base-sepolia",
      "maxAmountRequired": "100000",
      "asset": "0xabcdef1234567890abcdef1234567890abcdef12",
      "payTo": "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
      "resource": "https://api.example.com/premium-data",
      "description": "",
      "mimeType": "",
      "maxTimeoutSeconds": 60,
      "extra": {
        "name": "AlternativeToken",
        "version": "2"
      }
    }
  ]
}
```

## Client Implementation

### Automatic Selection (Fetch Client)

The default client implementation automatically selects USDC when available:

```typescript
import { wrapFetchWithPayment, createSigner } from "x402-fetch";

const signer = createSigner({
  evm: evmWalletClient, // Your viem wallet client
});

const fetchWithPay = wrapFetchWithPayment(fetch, signer);

// Automatically selects USDC from available options
const response = await fetchWithPay("https://api.example.com/premium-data");
```

### Custom Asset Selection

Provide a custom selector to choose a specific asset:

```typescript
import { wrapFetchWithPayment, createSigner } from "x402-fetch";

const signer = createSigner({
  evm: evmWalletClient,
});

// Custom selector that prefers a specific token
const customSelector = (requirements, network, scheme) => {
  // Filter by network and scheme
  const filtered = requirements.filter(
    (req) =>
      (!scheme || req.scheme === scheme) &&
      (!network || req.network === network)
  );

  // Prefer MyToken over USDC
  const myTokenReq = filtered.find(
    (req) =>
      req.asset.toLowerCase() ===
      "0x1234567890abcdef1234567890abcdef12345678".toLowerCase()
  );

  if (myTokenReq) return myTokenReq;

  // Fallback to first available
  return filtered[0] || requirements[0];
};

const fetchWithPay = wrapFetchWithPayment(
  fetch,
  signer,
  undefined, // maxValue
  customSelector // Custom payment requirements selector
);

const response = await fetchWithPay("https://api.example.com/premium-data");
```

### Manual Payment Creation

For full control, manually select and create payment headers:

```typescript
import {
  createPaymentHeader,
  selectPaymentRequirements,
} from "x402/client";

// Make initial request to get payment requirements
const response = await fetch("https://api.example.com/premium-data");
const { accepts } = await response.json();

// Select preferred payment option
const selectedRequirement = accepts.find(
  (req) =>
    req.asset.toLowerCase() ===
    "0x1234567890abcdef1234567890abcdef12345678".toLowerCase()
);

// Or use the default selector
// const selectedRequirement = selectPaymentRequirements(accepts, "base-sepolia", "exact");

// Create payment header for the selected asset
const paymentHeader = await createPaymentHeader(
  signer,
  1, // x402Version
  selectedRequirement
);

// Make request with payment
const paidResponse = await fetch("https://api.example.com/premium-data", {
  headers: {
    "X-PAYMENT": paymentHeader,
  },
});
```

## Use Cases

### 1. **Stablecoin Flexibility**
Accept multiple stablecoins (USDC, USDT, DAI) to provide users with options based on their holdings.

### 2. **Native Token Payments**
Allow payment with your project's native token alongside standard assets.

### 3. **Tiered Pricing**
Offer discounts when users pay with specific tokens:

```typescript
price: [
  "$0.01",    // USDC - standard price
  {           // Native token - discounted
    amount: "5000000000000000", // 0.005 tokens (50% discount)
    asset: nativeTokenConfig
  }
]
```

### 4. **Cross-Chain Compatibility**
Accept the same logical asset across different networks by configuring multiple routes.

## How It Works

1. **Server**: Generates multiple `PaymentRequirements` objects (one per asset) when processing the price array
2. **Client**: Receives all options in the `accepts` array of the 402 response
3. **Selection**: Client selects preferred asset based on:
   - Available wallet balance
   - User preference
   - Transaction costs
   - Custom business logic
4. **Payment**: Client creates and sends payment header for the selected asset
5. **Verification**: Server verifies payment matches one of the offered requirements
6. **Settlement**: Server settles the payment on-chain

## Benefits

- **User Choice**: Let users pay with tokens they already have
- **Reduced Friction**: No need to swap tokens before payment
- **Market Flexibility**: Adapt pricing based on token volatility
- **Ecosystem Support**: Strengthen token ecosystems by enabling native token payments

## Best Practices

1. **Order Matters**: Put preferred/default options first in the array
2. **Clear Pricing**: Ensure equivalent value across different asset options
3. **Asset Verification**: Only include tokens with EIP-3009 support for the "exact" scheme
4. **Balance Checks**: Clients should verify sufficient balance before creating payment
5. **User Experience**: Display all options clearly in custom paywalls

## Migration from Single Asset

Existing configurations continue to work - single `Price` values are automatically wrapped in an array:

```typescript
// Old (still works)
price: "$0.01"

// New (also works)
price: ["$0.01"]

// Multi-asset
price: ["$0.01", customTokenPrice]
```

## Technical Details

- Multiple payment requirements share the same network, scheme, and resource URL
- Each requirement has a unique asset address and amount
- Client selection logic prioritizes USDC by default
- Custom selectors can implement any selection strategy
- Server verifies payment matches one of the offered requirements
