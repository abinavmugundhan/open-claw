export interface TradeIntent {
  action: 'buy' | 'sell';
  symbol: string;
  quantity: number;
  asset_class: string;
}

export interface Policy {
  id: string;
  condition: string;
  effect: 'allow' | 'deny';
}

export interface PolicyResult {
  allowed: boolean;
  reason?: string;
  failedPolicyId?: string;
}
