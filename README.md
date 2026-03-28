# OpenClaw Finance Agent

A fully local, autonomous financial trading agent built using the OpenClaw framework. This project demonstrates a secure architecture that strictly separates LLM-based reasoning from deterministic execution. It utilizes a JSON-based intent model and a YAML-driven policy engine to deterministically enforce boundaries to limit the risk of an AI agent acting directly in live capital markets. It supports executing paper trades via the Alpaca API and includes a fully functional Model Context Protocol (MCP) Server for integration with other LLM platforms.

## Features
- **Deterministic Action Boundaries:** Separates "reasoning/intent" generation (LLM) from deterministic runtime action via `ArmorClaw`/YAML engines.
- **Strict Policy Engine:** Restricts the agent via `policy.yaml` (e.g. limiting trade limits, blocking unsafe asset classes, restricting unapproved tickers).
- **Alpaca Paper Trading Integration:** Live deterministic execution on a test brokerage.
- **Local Ollama Integration:** Recommends running entirely locally for 100% data-privacy (fallback mocks logic if Ollama isn't found).
- **Comprehensive Audit Logs:** Keeps record of generated intents, policy engine checks, and execution status securely inside `audit.log`.
- **MCP Server:** Provides standard `mcp` server capabilities to let external AI clients control the agent and review audits.

## Getting Started

### Prerequisites

Ensure you have Node.js and `npm` installed.

### Setup

1. **Clone & Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Copy `.env.example` to `.env` and provide your Alpaca paper trading credentials:
   ```bash
   cp .env.example .env
   ```
   **Update the variables in `.env`:**
   ```env
   APCA_API_KEY_ID=your_alpaca_key_here
   APCA_API_SECRET_KEY=your_alpaca_secret_here
   APCA_API_BASE_URL=https://paper-api.alpaca.markets
   OLLAMA_MODEL=llama3
   ```

3. **(Optional) Run Ollama locally**
   Start your local `ollama` instance with `llama3`. If `ollama` isn't running, the agent will gracefully mock intents based on the test string parsing.

## Usage

### Run Test Scenarios locally
Run the local console demonstration. It will parse an allowed AAPL trade, an oversized MSFT trade (triggers `max_quantity` policy), and an invalid Crypto trade (triggers `allowed_asset_classes` policy).
```bash
npm run start
```

### Run Model Context Protocol (MCP) Server
Launch the standard STDIO MCP server interface to allow conversational assistants to integrate with your local instance of OpenClaw:
```bash
npm run mcp
```
The server provides tools for:
- `execute_trading_scenario`: Parse a string using OpenClaw agent and execute it strictly within `policy.yaml` bounding box.
- `get_audit_logs`: Fetch the recent line tail from `audit.log`.

## Policies Mapping
To edit the deterministic behaviors of the agent's bounding box, refer to `policy.yaml`!

Happy Safe Trading!
