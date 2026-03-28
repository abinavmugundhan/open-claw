import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from 'dotenv';
import path from 'path';

import { FinanceAgent } from './agent';
import { PolicyEngine } from './policy';
import { Executor } from './executor';
import { AuditLogger } from './logger';

dotenv.config();

const POLICY_FILE = path.resolve(process.cwd(), 'policy.yaml');

// Initialize OpenClaw components
const agent = new FinanceAgent();
const policyEngine = new PolicyEngine(POLICY_FILE);
const executor = new Executor();
const logger = new AuditLogger();

const server = new Server(
  {
    name: "openclaw-finance-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "execute_trading_scenario",
        description:
          "Executes a natural language trading scenario through the OpenClaw Finance Agent. It will parse the intent, evaluate it against strict local YAML policies, and execute on Alpaca paper trading if allowed.",
        inputSchema: {
          type: "object",
          properties: {
            scenario: {
              type: "string",
              description: "The trading scenario in natural language, e.g. 'safely buy 1 share of AAPL'",
            },
          },
          required: ["scenario"],
        },
      },
      {
        name: "get_audit_logs",
        description: "Retrieves the recent audit logs of the OpenClaw Finance Agent to review executed, blocked, or skipped trades.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "execute_trading_scenario") {
    const scenario = String(request.params.arguments?.scenario);
    if (!scenario) {
      throw new Error("Scenario is required");
    }

    try {
      // 1. Agent Reasoning -> Generates Intent Object
      const intent = await agent.generateIntent(scenario);
      logger.logIntent({ scenario, intent });

      // 2. Policy Engine Evaluation (Deterministic Enforcement)
      const evaluation = policyEngine.evaluateIntent(intent);
      logger.logPolicyDecision(intent, evaluation);
      
      // 3. Conditional Execution Based on Policy Engine Result
      if (evaluation.allowed) {
        if (!process.env.APCA_API_KEY_ID || process.env.APCA_API_KEY_ID === 'YOUR_PAPER_KEY') {
          logger.logExecution(intent, 'SKIPPED', 'No Alpaca API Key set in .env');
          return {
            content: [
              {
                type: "text",
                text: `✅ Intent ALLOWED by policies: ${JSON.stringify(intent)}\n⚠️ SKIPPED execution because no real Alpaca API key is set in .env.`,
              },
            ],
          };
        } else {
          try {
             const receipt = await executor.executeTrade(intent);
             logger.logExecution(intent, 'SUCCESS', { id: receipt.id });
             return {
              content: [
                {
                  type: "text",
                  text: `✅ Intent ALLOWED by policies: ${JSON.stringify(intent)}\n✅ Trade executed successfully on Alpaca! Order ID: ${receipt.id}`,
                },
              ],
            };
          } catch (err: any) {
             logger.logExecution(intent, 'FAILED', err.message);
             return {
              content: [
                {
                  type: "text",
                  text: `✅ Intent ALLOWED by policies: ${JSON.stringify(intent)}\n❌ Trade execution on Alpaca failed: ${err.message}`,
                },
              ],
             };
          }
        }
      } else {
        logger.logExecution(intent, 'BLOCKED_BY_POLICY', evaluation);
        return {
          content: [
            {
              type: "text",
              text: `❌ Intent DENIED by policies: ${JSON.stringify(intent)}\nReason: ${evaluation.reason} (Policy ID: ${evaluation.failedPolicyId})`,
            },
          ],
        };
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error processing scenario: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  if (request.params.name === "get_audit_logs") {
    try {
      const fs = require('fs');
      const logs = fs.readFileSync(path.resolve(process.cwd(), 'audit.log'), 'utf8');
      return {
        content: [
          {
            type: "text",
            text: logs.length > 5000 ? logs.substring(logs.length - 5000) : logs, // Return tail log
          },
        ],
      };
    } catch (e: any) {
      return {
         content: [{ type: "text", text: `Error reading audit log: ${e.message}` }],
      };
    }
  }

  throw new Error("Unknown tool");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("OpenClaw Finance MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
