import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import { TradeIntent, Policy, PolicyResult } from './types';

export class PolicyEngine {
  private policies: Policy[] = [];

  constructor(policyFilePath: string) {
    this.loadPolicies(policyFilePath);
  }

  private loadPolicies(filePath: string) {
    try {
      const fileContents = fs.readFileSync(path.resolve(filePath), 'utf8');
      const data = yaml.load(fileContents) as any;
      if (data && data.policies) {
        this.policies = data.policies;
        console.log(`[PolicyEngine] Loaded ${this.policies.length} policies.`);
      }
    } catch (e) {
      console.error(`[PolicyEngine] Failed to load policies from ${filePath}:`, e);
    }
  }

  public evaluateIntent(intent: TradeIntent): PolicyResult {
    console.log(`[PolicyEngine] Evaluating intent...`);
    for (const policy of this.policies) {
      try {
        // Safe-ish evaluation for internal policies
        const checkCondition = new Function('intent', `return ${policy.condition}`);
        const result = checkCondition(intent);
        
        if (policy.effect === 'allow' && !result) {
          return { allowed: false, reason: `Failed allow condition`, failedPolicyId: policy.id };
        }
        
        if (policy.effect === 'deny' && result) {
          return { allowed: false, reason: `Matched deny condition`, failedPolicyId: policy.id };
        }
      } catch (e) {
        console.error(`[PolicyEngine] Error evaluating policy ${policy.id}:`, e);
        return { allowed: false, reason: `Policy evaluation error`, failedPolicyId: policy.id };
      }
    }
    
    return { allowed: true };
  }
}
