import { Chain, getAddress, Hex, LocalAccount, toHex, Transport } from "viem";
import { getNetworkId } from "../../../shared";
import {
  authorizationTypes,
  isAccount,
  isSignerWallet,
  SignerWallet,
} from "../../../types/shared/evm";
import { ExactEvmPayloadAuthorization, PaymentRequirements } from "../../../types/verify";

/**
 * Signs an EIP-3009 authorization for USDC transfer
 *
 * @param walletClient - The wallet client that will sign the authorization
 * @param params - The authorization parameters containing transfer details
 * @param params.from - The address tokens will be transferred from
 * @param params.to - The address tokens will be transferred to
 * @param params.value - The amount of USDC tokens to transfer (in base units)
 * @param params.validAfter - Unix timestamp after which the authorization becomes valid
 * @param params.validBefore - Unix timestamp before which the authorization is valid
 * @param params.nonce - Random 32-byte nonce to prevent replay attacks
 * @param paymentRequirements - The payment requirements containing asset and network information
 * @param paymentRequirements.asset - The address of the USDC contract
 * @param paymentRequirements.network - The network where the USDC contract exists
 * @param paymentRequirements.extra - The extra information containing the name and version of the ERC20 contract
 * @returns The signature for the authorization
 */
export async function signAuthorization<transport extends Transport, chain extends Chain>(
  walletClient: SignerWallet<chain, transport> | LocalAccount,
  { from, to, value, validAfter, validBefore, nonce }: ExactEvmPayloadAuthorization,
  { asset, network, extra }: PaymentRequirements,
): Promise<{
  signature: Hex;
  v: number; r: `0x${string}`; s: `0x${string}`
}> {
  const chainId = getNetworkId(network);
  const name = "META Forwarder";
  const version = "1";

  const data = {
    types: authorizationTypes,
    domain: {
      name,
      version,
      chainId,
      verifyingContract: getAddress(asset),
    },
    primaryType: "TransferWithAuthorization" as const,
    message: {
      from: getAddress(from),
      to: getAddress(to),
      value,
      validAfter,
      validBefore,
      nonce: nonce,
    },
  };

  if (isSignerWallet(walletClient)) {
    const signature = await walletClient.signTypedData(data);
    // Extract v, r, s from the 65-byte signature
    const r: `0x${string}` = `0x${signature.slice(2, 66)}` as const;
    const s: `0x${string}` = `0x${signature.slice(66, 130)}` as const;
    let v = parseInt(signature.slice(130, 132), 16);
    if (v < 27) v += 27;

    return {
      r, s, v,
      signature,
    };
  } else if (isAccount(walletClient) && walletClient.signTypedData) {
    const signature = await walletClient.signTypedData(data);
    const r: `0x${string}` = `0x${signature.slice(2, 66)}` as const;
    const s: `0x${string}` = `0x${signature.slice(66, 130)}` as const;
    let v = parseInt(signature.slice(130, 132), 16);
    if (v < 27) v += 27;

    return {
      r, s, v,
      signature,
    };
  } else {
    throw new Error("Invalid wallet client provided does not support signTypedData");
  }
}

/**
 * Generates a random 32-byte nonce for use in authorization signatures
 *
 * @returns A random 32-byte nonce as a hex string
 */
export function createNonce(): Hex {
  const cryptoObj =
    typeof globalThis.crypto !== "undefined" &&
      typeof globalThis.crypto.getRandomValues === "function"
      ? globalThis.crypto
      : // Dynamic require is needed to support node.js
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("crypto").webcrypto;
  return toHex(cryptoObj.getRandomValues(new Uint8Array(32)));
}
