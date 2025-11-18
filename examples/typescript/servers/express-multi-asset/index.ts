import express from "express";
import { paymentMiddleware, Network } from "x402-express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || "3000";
const payTo = process.env.PAY_TO || "0x209693Bc6afc0C5328bA36FaF03C514EF312287C";
const network = (process.env.NETWORK || "base-sepolia") as Network;

/**
 * Example 1: Multiple Stablecoins
 * Accepts USDC (default) and a custom token
 */
app.use(
  paymentMiddleware(
    payTo as `0x${string}`,
    {
      "GET /stablecoins": {
        price: [
          "$0.01", // USDC - 0.01 USD
          {
            // Example custom stablecoin
            amount: "10000", // 0.01 tokens (6 decimals)
            asset: {
              address: "0x1234567890abcdef1234567890abcdef12345678",
              decimals: 6,
              eip712: {
                name: "CustomStable",
                version: "1",
              },
            },
          },
        ],
        network,
        config: {
          description: "Access paid content with multiple stablecoin options",
        },
      },
    }
  )
);

app.get("/stablecoins", (req, res) => {
  res.json({
    message: "Payment successful! You can pay with USDC or CustomStable.",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Example 2: Native Token with Discount
 * Offers standard USDC price or discounted native token price
 */
app.use(
  paymentMiddleware(
    payTo as `0x${string}`,
    {
      "GET /native-discount": {
        price: [
          "$0.02", // USDC - standard price
          {
            // Native token - 50% discount
            amount: "10000000000000000", // 0.01 tokens (18 decimals)
            asset: {
              address: "0xabcdef1234567890abcdef1234567890abcdef12",
              decimals: 18,
              eip712: {
                name: "NativeToken",
                version: "1",
              },
            },
          },
        ],
        network,
        config: {
          description:
            "Pay with USDC ($0.02) or get 50% off with NativeToken ($0.01 equivalent)",
        },
      },
    }
  )
);

app.get("/native-discount", (req, res) => {
  res.json({
    message: "Payment successful! Thanks for using our native token for a discount.",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Example 3: Multiple Token Options
 * Accepts payments in various tokens with different denominations
 */
app.use(
  paymentMiddleware(
    payTo as `0x${string}`,
    {
      "GET /multi-token": {
        price: [
          "$0.005", // USDC
          {
            // Token A
            amount: "5000000000000000000", // 5 tokens (18 decimals)
            asset: {
              address: "0x1111111111111111111111111111111111111111",
              decimals: 18,
              eip712: {
                name: "TokenA",
                version: "1",
              },
            },
          },
          {
            // Token B
            amount: "50000", // 0.05 tokens (6 decimals)
            asset: {
              address: "0x2222222222222222222222222222222222222222",
              decimals: 6,
              eip712: {
                name: "TokenB",
                version: "1",
              },
            },
          },
          {
            // Token C
            amount: "500000000", // 0.5 tokens (9 decimals)
            asset: {
              address: "0x3333333333333333333333333333333333333333",
              decimals: 9,
              eip712: {
                name: "TokenC",
                version: "2",
              },
            },
          },
        ],
        network,
        config: {
          description: "Access with multiple payment token options",
        },
      },
    }
  )
);

app.get("/multi-token", (req, res) => {
  res.json({
    message: "Payment successful! You used one of our supported tokens.",
    supportedTokens: ["USDC", "TokenA", "TokenB", "TokenC"],
    timestamp: new Date().toISOString(),
  });
});

/**
 * Free endpoint for testing
 */
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    examples: [
      { endpoint: "/stablecoins", description: "Multiple stablecoin options" },
      { endpoint: "/native-discount", description: "Native token discount" },
      { endpoint: "/multi-token", description: "Four token options" },
    ],
  });
});

app.listen(parseInt(port), () => {
  console.log(`Multi-asset payment server listening on http://localhost:${port}`);
  console.log(`Pay to address: ${payTo}`);
  console.log(`Network: ${network}`);
  console.log("\nAvailable endpoints:");
  console.log("  GET /health - Server health check");
  console.log("  GET /stablecoins - Payment with multiple stablecoins");
  console.log("  GET /native-discount - Payment with native token discount");
  console.log("  GET /multi-token - Payment with multiple token options");
});
