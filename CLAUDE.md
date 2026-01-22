# Project-Specific Instructions

## CRITICAL: NEVER USE @solana/web3.js - ZERO TOLERANCE

**ALWAYS use @solana/kit for ALL Solana operations.**

- NEVER import from `@solana/web3.js`
- NEVER use `Connection` from web3.js
- NEVER use `Transaction` from web3.js
- Use `@solana/kit` for everything: RPC, subscriptions, transactions, etc.
- The only exception is wallet-adapter which requires web3.js types for compatibility

This is NON-NEGOTIABLE. @solana/kit is the modern Solana SDK with proper async iterators for subscriptions.

## CRITICAL: When User Asks to "Check" or "Verify" Something - ZERO TOLERANCE

When the user asks you to "check", "verify", "look at", or "review" something:

1. **DO NOT make any code changes**
2. **ONLY report your findings**
3. **ASK the user what they want to do next**

This applies to:
- "check the docs"
- "verify this is correct"
- "look at the response"
- "review the error"
- Any similar phrasing

**Report findings, then WAIT for explicit instruction before changing anything.**
