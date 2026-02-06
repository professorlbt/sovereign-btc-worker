// import { D1Database, KVNamespace, R2Bucket } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  USERS_KV: KVNamespace;
  RATE_LIMITS?: KVNamespace;
  FILES: R2Bucket;
  ADMIN_JWT_SECRET: string;
  ADMIN_PASSWORD_HASH: string;
  ENVIRONMENT: 'development' | 'production' | 'staging';
}

export interface JwtPayload {
  sub?: string;
  email: string;
  role: string;
  exp?: number;
  [key: string]: any;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  platform_handle: string | null;
  account_type: 'simple' | 'premium';
  role: 'user' | 'admin' | 'student';
  status: 'pending' | 'active' | 'suspended' | 'inactive' | 'rejected';
  subscription_end: string | null;
  payment_status: string | null;
  total_sessions: number;
  last_login: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  user_id: string;
  requested_handle: string;
  motivation: string;
  experience: string;
  requested_tier: string | null;
  status: 'Pending' | 'Accepted' | 'Rejected';
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface Affirmation {
  id?: number;
  user_id: string;
  btc_only: boolean;
  london_ny_only: boolean;
  r_multiple_only: boolean;
  no_signal_expectation: boolean;
  discipline_over_profit: boolean;
  personal_risk_acceptance: boolean;
  accepted_at: string | null;
  created_at: string;
}

// Auth Requests
export interface RegisterRequest {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// Application Requests
export interface ApplicationSubmitRequest {
  requested_handle: string;
  motivation: string;
  experience: string;
  affirmations: {
    btc_only: boolean;
    london_ny_only: boolean;
    r_multiple_only: boolean;
    no_signal_expectation: boolean;
    discipline_over_profit: boolean;
    personal_risk_acceptance: boolean;
  };
}

// Admin Requests
export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminApproveRequest {
  userId: string;
  platformHandle: string;
}

export interface AdminRejectRequest {
  userId: string;
}

export interface AdminUpgradeRequest {
  userId: string;
}

export interface AdminDowngradeRequest {
  userId: string;
}

export interface AdminUpdateUserRequest {
  userId: string;
  account_type?: 'simple' | 'premium';
  status?: string;
  notes?: string;
}

export interface AdminSuspendRequest {
  userId: string;
}

export interface AdminActivateRequest {
  userId: string;
}

export interface AdminEmailRequest {
  userId: string;
  subject: string;
  message: string;
}

export interface AdminBulkActionRequest {
  userIds: string[];
  action: 'approve' | 'reject' | 'suspend' | 'activate' | 'upgrade' | 'downgrade';
}

export interface AdminExportRequest {
  type: 'users' | 'applications' | 'payments';
  format?: 'json' | 'csv';
}

// Stats Interfaces
export interface UserStats {
  total: number;
  pending: number;
  active: number;
  simple: number;
  premium: number;
}

export interface AnalyticsData {
  users: UserStats;
  applications: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  revenue: {
    total: number;
    monthly: number;
    pending: number;
  };
  activity: {
    daily_logins: number;
    active_sessions: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
  metadata?: any;
}