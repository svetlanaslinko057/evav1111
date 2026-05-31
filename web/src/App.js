import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import axios from "axios";
import { createContext, useContext } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { getDeviceFingerprint } from "@/lib/deviceFingerprint";

// Toast & Realtime
import { ToastProvider } from "@/components/Toast";
import ToastBridgeMount from "@/components/ToastBridgeMount";
import RootErrorBoundary from "@/components/RootErrorBoundary";
import { ExecutorRealtimeBridge, TesterRealtimeBridge, ClientRealtimeBridge, AdminRealtimeBridge } from "@/components/RealtimeBridge";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LegalSettingsProvider } from "@/contexts/LegalSettingsContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import CookieBanner from "@/components/CookieBanner";
import { useTheme } from "@/contexts/ThemeContext";

// Pages
import LandingPage from "@/pages/LandingPage";
const DescribeFlow = lazy(() => import("@/pages/DescribeFlow"));
const PortfolioCaseDetail = lazy(() => import("@/pages/PortfolioCaseDetail"));
const EstimateResultPage = lazy(() => import("@/pages/EstimateResultPage"));
const ProjectBootingPage = lazy(() => import("@/pages/ProjectBootingPage"));
import ClientAuthPage from "@/pages/ClientAuthPage";
import BuilderAuthPage from "@/pages/BuilderAuthPage";
import UnifiedAuthPage from "@/pages/UnifiedAuthPage";
import AdminLoginPage from "@/pages/AdminLoginPage";
const TwoFactorChallengePage = lazy(() => import("@/pages/TwoFactorChallengePage"));
const TwoFactorSetupPage = lazy(() => import("@/pages/TwoFactorSetupPage"));
const TwoFactorRecoveryPage = lazy(() => import("@/pages/TwoFactorRecoveryPage"));
const DeveloperDashboard = lazy(() => import("@/pages/DeveloperDashboard"));
const AdminV2Dashboard = lazy(() => import("@/pages/AdminV2Dashboard"));
const AdminV2Workflow = lazy(() => import("@/pages/AdminV2Workflow"));
const AdminV2Finance = lazy(() => import("@/pages/AdminV2Finance"));
const AdminV2Team = lazy(() => import("@/pages/AdminV2Team"));
const AdminV2System = lazy(() => import("@/pages/AdminV2System"));
const AdminV2Profile = lazy(() => import("@/pages/AdminV2Profile"));
const AdminV2Portfolio = lazy(() => import("@/pages/AdminV2Portfolio"));
const NewRequest = lazy(() => import("@/pages/NewRequest"));
const ProjectDetails = lazy(() => import("@/pages/ProjectDetails"));
const ScopeBuilder = lazy(() => import("@/pages/ScopeBuilder"));
const WorkUnitDetail = lazy(() => import("@/pages/WorkUnitDetail"));
const DeliverableBuilder = lazy(() => import("@/pages/DeliverableBuilder"));
const AdminDeliverableBuilder = lazy(() => import("@/pages/AdminDeliverableBuilder"));
const AdminPaymentsPage = lazy(() => import("@/pages/AdminPaymentsPage"));
// PAY-V2-P5 — Operational Payouts UI (queue + batch drill-down)
const AdminPayoutsQueue = lazy(() => import("@/pages/AdminPayoutsQueue"));
const AdminPayoutBatchDetail = lazy(() => import("@/pages/AdminPayoutBatchDetail"));
const AdminReconciliation = lazy(() => import("@/pages/AdminReconciliation"));
const AdminLegalSettings = lazy(() => import("@/pages/AdminLegalSettings"));
const AdminLeadsPage = lazy(() => import("@/pages/AdminLeadsPage"));
const ClientDeliverablePage = lazy(() => import("@/pages/ClientDeliverablePage"));
const ClientVersionsPage = lazy(() => import("@/pages/ClientVersionsPage"));
// New Developer Workspace
import DeveloperLayout from "@/layouts/DeveloperLayout";
const DeveloperAssignments = lazy(() => import("@/pages/DeveloperAssignments"));
const DeveloperWorkPage = lazy(() => import("@/pages/DeveloperWorkPage"));
const DeveloperPerformance = lazy(() => import("@/pages/DeveloperPerformance"));
const ExecutorBoard = lazy(() => import("@/pages/ExecutorBoard"));
// New Tester Workspace
import TesterLayout from "@/layouts/TesterLayout";
const TesterHub = lazy(() => import("@/pages/TesterHub"));
const TesterValidationList = lazy(() => import("@/pages/TesterValidationList"));
const TesterValidationPage = lazy(() => import("@/pages/TesterValidationPage"));
const TesterIssues = lazy(() => import("@/pages/TesterIssues"));
const TesterPerformance = lazy(() => import("@/pages/TesterPerformance"));
// Admin Control Center
const AdminDeveloperProfile = lazy(() => import("@/pages/AdminDeveloperProfile"));
const DeveloperMarketplace = lazy(() => import("@/pages/DeveloperMarketplace"));
const DeveloperLeaderboard = lazy(() => import("@/pages/DeveloperLeaderboard"));
const DeveloperIntelLeaderboard = lazy(() => import("@/pages/DeveloperIntelLeaderboard"));
const DeveloperIntelGrowth = lazy(() => import("@/pages/DeveloperIntelGrowth"));
const DeveloperIntelFeedback = lazy(() => import("@/pages/DeveloperIntelFeedback"));
const DeveloperProfileEnhanced = lazy(() => import("@/pages/DeveloperProfileEnhanced"));
import AdminLayout from "@/layouts/AdminLayout";
// ScopeBuilder already imported above

// Client Layout and Pages
import ClientLayout from "@/layouts/ClientLayout";
const ClientHub = lazy(() => import("@/pages/ClientHub"));
const ClientProjects = lazy(() => import("@/pages/ClientProjects"));
const ClientSupport = lazy(() => import("@/pages/ClientSupport"));
const ClientProjectPage = lazy(() => import("@/pages/ClientProjectPage"));
const ClientEstimatePage = lazy(() => import("@/pages/ClientEstimatePage"));
// Client OS (Operating Workspace)
const ClientDashboardOS = lazy(() => import("@/pages/ClientDashboardOS"));
const CreateModuleDominance = lazy(() => import("@/pages/CreateModuleDominance"));
const ClientProjectWorkspaceOS = lazy(() => import("@/pages/ClientProjectWorkspaceOS"));
const ClientBillingOS = lazy(() => import("@/pages/ClientBillingOS"));
const ClientContractPage = lazy(() => import("@/pages/ClientContractPage"));
const ContractSignEvidencePage = lazy(() => import("@/pages/ContractSignEvidencePage"));
const ClientDocumentsPage = lazy(() => import("@/pages/ClientDocumentsPage"));
// Growth / Referral
const ClientReferralPage = lazy(() => import("@/pages/ClientReferralPage"));
const ClientProfilePage = lazy(() => import("@/pages/ClientProfilePage"));
const DeveloperGrowthPage = lazy(() => import("@/pages/DeveloperGrowthPage"));
const ClientLeaderboardPage = lazy(() => import("@/pages/ClientLeaderboardPage"));
const ClientTransparency = lazy(() => import("@/pages/ClientTransparency"));
// Admin Financials
const AdminFinancialsPage = lazy(() => import("@/pages/AdminFinancialsPage"));
// Admin Inbox (sequence-defining messaging — Support / Project moderation)

// Admin Users (Phase 1 Step B — Identity Control Panel)

// Admin QA
const AdminQAPage = lazy(() => import("@/pages/AdminQAPage"));
// Admin Validation (Human Validation Layer — perception signal, not engineering QA)
const AdminValidationPage = lazy(() => import("@/pages/AdminValidationPage"));
// Validator Missions (shared surface — clients and developers can participate to earn credits)
const ValidatorMissionsPage = lazy(() => import("@/pages/ValidatorMissionsPage"));
// Developer Workspace & Client Cabinet (Production Operations)
const DeveloperWorkspace = lazy(() => import("@/pages/DeveloperWorkspace"));
const ClientCabinet = lazy(() => import("@/pages/ClientCabinet"));
// GPT Scope Builder
const GPTScopeBuilder = lazy(() => import("@/pages/GPTScopeBuilder"));
// Admin Templates (AI Matcher)

// Provider Marketplace
const ProviderInbox = lazy(() => import("@/pages/ProviderInbox"));
const ProviderAuth = lazy(() => import("@/pages/ProviderAuth"));
// Assignment Engine 2.0 + Team Panel
const DeveloperWorkspaceV2 = lazy(() => import("@/pages/DeveloperWorkspaceV2"));
// Acceptance Layer
const AcceptanceQueue = lazy(() => import("@/pages/AcceptanceQueue"));
// Time Control Panel (Step 2C)
const DeveloperTimeControl = lazy(() => import("@/pages/DeveloperTimeControl"));
// Earnings UI (Step 3D)
const DeveloperEarnings = lazy(() => import("@/pages/DeveloperEarnings"));
// ATLAS DevOS — Client layer pages (restored + new)
const ClientCosts = lazy(() => import("@/pages/ClientCosts"));
const ClientOperator = lazy(() => import("@/pages/ClientOperator"));
const ClientWorkspace = lazy(() => import("@/pages/ClientWorkspace"));
const DevWork = lazy(() => import("@/pages/DevWork"));
// Execution Intelligence Console — orchestration cognition surface
const AdminExecutionIntelligence = lazy(() => import("@/pages/AdminExecutionIntelligence"));
const AdminPressureTopology = lazy(() => import("@/pages/AdminPressureTopology"));
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
export const API = `${BACKEND_URL}/api`;

// ─── Step 6.2 Stage 2 — Runtime boot guard ───────────────────────────────────
// Boot the runtime-client capability manifest at app start. We DON'T await
// blockingly (UI stays interactive) but we DO race against a 1.5s timeout —
// after that, capability gate falls back to "soft degraded" until manifest
// arrives. This avoids cold-start race for hard-gated actions.
import { runtime } from '@/runtime';
const _runtimeBootPromise = Promise.race([
  runtime.capabilities.refresh().catch(() => null),
  new Promise((res) => setTimeout(res, 1500)),
]);
// Expose for components that need to wait on first render of payment flows.
export const runtimeReady = _runtimeBootPromise;

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        withCredentials: true
      });
      setUser(response.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const response = await axios.post(
      `${API}/auth/login`,
      { email, password, device_fingerprint: getDeviceFingerprint() },
      { withCredentials: true }
    );
    // 2FA gate — backend returns { requires_2fa, challenge_token, method,
    // ttl_seconds } when the account has 2FA on AND the current device is
    // not in the trusted-devices list. Surface as a structured error so the
    // caller can route to /two-factor-challenge.
    if (response.data?.requires_2fa) {
      const err = new Error('TwoFactorRequired');
      err.requires_2fa = true;
      err.challenge_token = response.data.challenge_token;
      err.method = response.data.method || 'totp';
      err.ttl_seconds = response.data.ttl_seconds;
      err.email = email;
      throw err;
    }
    setUser(response.data);
    return response.data;
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error("Logout error:", error);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-border border-t-signal rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    // Redirect to appropriate auth page based on path
    if (location.pathname.startsWith('/admin')) {
      return <Navigate to="/admin/login" state={{ from: location }} replace />;
    } else if (location.pathname.startsWith('/provider')) {
      return <Navigate to="/provider/auth" state={{ from: location }} replace />;
    } else if (location.pathname.startsWith('/developer') || location.pathname.startsWith('/tester')) {
      return <Navigate to="/builder/auth" state={{ from: location }} replace />;
    } else {
      return <Navigate to="/client/auth" state={{ from: location }} replace />;
    }
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const dashboardRoutes = {
      client: '/client/dashboard',
      developer: '/developer/dashboard',
      tester: '/tester/dashboard',
      admin: '/admin/dashboard'
    };
    return <Navigate to={dashboardRoutes[user.role] || '/client/dashboard'} replace />;
  }

  return children;
};

const LoadingFallback = () => (
  <div className="min-h-screen bg-app flex items-center justify-center" data-testid="route-loading">
    <div className="w-8 h-8 border-2 border-border border-t-signal rounded-full animate-spin" />
  </div>
);

function AppRouter() {
  return (
    <Suspense fallback={<LoadingFallback />}>
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/portfolio/:caseId" element={<PortfolioCaseDetail />} />
      <Route path="/portfolio" element={<Navigate to="/#portfolio" replace />} />
      <Route path="/describe" element={<DescribeFlow />} />
      <Route path="/estimate-result" element={<EstimateResultPage />} />
      <Route
        path="/project-booting"
        element={
          <ProtectedRoute allowedRoles={['client', 'admin']}>
            <ProjectBootingPage />
          </ProtectedRoute>
        }
      />
      
      {/* Auth Routes - Unified */}
      <Route path="/auth" element={<UnifiedAuthPage />} />
      <Route path="/client/auth" element={<UnifiedAuthPage />} />
      <Route path="/builder/auth" element={<UnifiedAuthPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* Two-factor authentication — shared across all roles */}
      <Route path="/two-factor-challenge" element={<TwoFactorChallengePage />} />
      <Route
        path="/account/2fa/setup"
        element={
          <ProtectedRoute>
            <TwoFactorSetupPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account/2fa/recovery"
        element={
          <ProtectedRoute>
            <TwoFactorRecoveryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account/2fa"
        element={<Navigate to="/account/2fa/recovery" replace />}
      />
      
      {/* Client Routes - New Layout */}
      <Route 
        path="/client" 
        element={
          <ProtectedRoute allowedRoles={['client', 'admin']}>
            <ClientLayout />
          </ProtectedRoute>
        }
      >
        {/* CLIENT OS - New Operating Workspace */}
        <Route path="dashboard-os" element={<ClientDashboardOS />} />
        <Route path="create-module-dominance" element={<CreateModuleDominance />} />
        <Route path="project-workspace/:projectId" element={<ClientProjectWorkspaceOS />} />
        <Route path="billing-os" element={<ClientBillingOS />} />
        <Route path="contract/:projectId" element={<ClientContractPage />} />
        <Route path="sign-agreement/:contractId" element={<ContractSignEvidencePage />} />
        <Route path="documents" element={<ClientDocumentsPage />} />
        
        {/* LEGACY Client Routes */}
        <Route path="dashboard" element={<ClientHub />} />
        <Route path="projects" element={<ClientProjects />} />
        <Route path="projects/:projectId" element={<ProjectDetails />} />
        <Route path="project/:projectId" element={<ClientProjectPage />} />
        <Route path="cabinet/:projectId" element={<ClientCabinet />} />
        <Route path="deliverables" element={<ClientHub />} />
        <Route path="deliverable/:deliverableId" element={<ClientDeliverablePage />} />
        <Route path="support" element={<ClientSupport />} />
        <Route path="request/new" element={<NewRequest />} />
        <Route path="project/:projectId/versions" element={<ClientVersionsPage />} />
        <Route path="estimate" element={<ClientEstimatePage />} />
        <Route path="referrals" element={<ClientReferralPage />} />
        <Route path="profile" element={<ClientProfilePage />} />
        <Route path="leaderboard" element={<ClientLeaderboardPage />} />
        <Route path="transparency" element={<ClientTransparency />} />
        <Route path="validation" element={<ValidatorMissionsPage persona="client" />} />
        {/* ATLAS DevOS — Client layer */}
        <Route path="costs" element={<ClientCosts />} />
        <Route path="operator" element={<ClientOperator />} />
        <Route path="project/:projectId/workspace" element={<ClientWorkspace />} />
        <Route index element={<Navigate to="/client/dashboard" replace />} />
      </Route>
      
      {/* Developer Routes - New Economy System */}
      <Route 
        path="/developer" 
        element={
          <ProtectedRoute allowedRoles={['developer', 'admin']}>
            <DeveloperLayout />
          </ProtectedRoute>
        }
      >
        {/* NEW SYSTEM (Economy-first) */}
        <Route path="dashboard" element={<DeveloperDashboard />} />
        <Route path="acceptance" element={<AcceptanceQueue />} />
        <Route path="marketplace" element={<DeveloperMarketplace />} />
        <Route path="workspace" element={<DeveloperWorkspaceV2 />} />
        <Route path="earnings" element={<DeveloperEarnings />} />
        <Route path="profile" element={<DeveloperProfileEnhanced />} />
        <Route path="leaderboard" element={<DeveloperLeaderboard />} />
        <Route path="validation" element={<ValidatorMissionsPage persona="developer" />} />

        {/* Developer Intelligence — Leaderboard · Growth · Feedback (new contract) */}
        <Route path="intel/leaderboard" element={<DeveloperIntelLeaderboard />} />
        <Route path="intel/growth" element={<DeveloperIntelGrowth />} />
        <Route path="intel/feedback" element={<DeveloperIntelFeedback />} />
        
        {/* LEGACY (fallback only) */}
        <Route path="workspace-v1" element={<DeveloperWorkspace />} />
        <Route path="acceptance-queue" element={<AcceptanceQueue />} />
        <Route path="time-control" element={<DeveloperTimeControl />} />
        <Route path="board" element={<ExecutorBoard />} />
        <Route path="assignments" element={<DeveloperAssignments />} />
        <Route path="work/:unitId" element={<DeveloperWorkPage />} />
        <Route path="performance" element={<DeveloperPerformance />} />
        <Route path="network" element={<DeveloperGrowthPage />} />
        
        {/* Redirect */}
        <Route index element={<Navigate to="/developer/dashboard" replace />} />
      </Route>
      
      {/* Tester Routes - New Layout */}
      <Route 
        path="/tester" 
        element={
          <ProtectedRoute allowedRoles={['tester', 'admin']}>
            <TesterLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<TesterHub />} />
        <Route path="validation" element={<TesterValidationList />} />
        <Route path="validation/:validationId" element={<TesterValidationPage />} />
        <Route path="issues" element={<TesterIssues />} />
        <Route path="performance" element={<TesterPerformance />} />
        <Route index element={<Navigate to="/tester/dashboard" replace />} />
      </Route>
      
      {/* Admin Routes - v1 stable: 7 zones. Legacy paths redirect to canonical routes. */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        {/* CANONICAL 7 ZONES */}
        <Route path="dashboard" element={<AdminV2Dashboard />} />
        <Route path="workflow" element={<AdminV2Workflow />} />
        <Route path="qa" element={<AdminQAPage />} />
        <Route path="validation" element={<AdminValidationPage />} />
        <Route path="finance" element={<AdminV2Finance />} />
        <Route path="team" element={<AdminV2Team />} />
        <Route path="system" element={<AdminV2System />} />
        <Route path="payments" element={<AdminPaymentsPage />} />
        {/* PAY-V2-P5 — Operational payouts surface */}
        <Route path="payouts-v2" element={<AdminPayoutsQueue />} />
        <Route path="payouts-v2/batches/:batchId" element={<AdminPayoutBatchDetail />} />
        {/* PAY-V2-P4 — Reconciliation drill-down (divergence observer) */}
        <Route path="payouts-v2/reconciliation" element={<AdminReconciliation />} />
        <Route path="leads" element={<AdminLeadsPage />} />
        <Route path="legal-settings" element={<AdminLegalSettings />} />
        <Route path="profile" element={<AdminV2Profile />} />
        <Route path="portfolio" element={<AdminV2Portfolio />} />

        {/* Execution Intelligence Console — orchestration cognition surface */}
        <Route path="execution-intelligence" element={<AdminExecutionIntelligence />} />
        <Route path="pressure-topology"      element={<AdminPressureTopology />} />

        {/* LEGACY REDIRECTS → canonical zones (no 404, keeps deep-links alive) */}
        <Route path="cockpit" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="control-center" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="control-center-legacy" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="master" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="profit-control" element={<Navigate to="/admin/finance" replace />} />
        <Route path="earnings-control" element={<Navigate to="/admin/finance" replace />} />
        <Route path="withdrawals" element={<Navigate to="/admin/finance" replace />} />
        <Route path="billing" element={<Navigate to="/admin/finance" replace />} />
        <Route path="margin" element={<Navigate to="/admin/finance" replace />} />
        <Route path="underpriced-control" element={<Navigate to="/admin/finance" replace />} />
        <Route path="projects" element={<Navigate to="/admin/workflow" replace />} />
        <Route path="requests" element={<Navigate to="/admin/workflow" replace />} />
        <Route path="review" element={<Navigate to="/admin/workflow" replace />} />
        {/* WEB-P1.2: removed duplicate `validation` redirect — actual route is at line 434 (<AdminValidationPage />). See /app/docs/active-audits/WEB_AUDIT_2026-02-FEB__ACTIVE.md §1.2 */}
        <Route path="users" element={<Navigate to="/admin/team" replace />} />
        <Route path="growth" element={<Navigate to="/admin/team" replace />} />
        <Route path="time-control" element={<Navigate to="/admin/team" replace />} />
        <Route path="integrations" element={<Navigate to="/admin/system" replace />} />
        <Route path="settings" element={<Navigate to="/admin/system" replace />} />
        <Route path="templates" element={<Navigate to="/admin/system" replace />} />
        <Route path="contracts" element={<Navigate to="/admin/system" replace />} />
        <Route path="messages" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="project/:projectId/war-room" element={<Navigate to="/admin/workflow" replace />} />

        {/* Deep-detail routes preserved (still needed for specific flows linked from workflow) */}
        <Route path="dev/:developerId" element={<AdminDeveloperProfile />} />
        <Route path="project/:projectId/scope" element={<ScopeBuilder />} />
        <Route path="scope-builder/:requestId" element={<ScopeBuilder />} />
        <Route path="work-unit/:unitId" element={<WorkUnitDetail />} />
        <Route path="deliverable/:projectId" element={<DeliverableBuilder />} />
        <Route path="deliverable-builder/:projectId" element={<AdminDeliverableBuilder />} />
        <Route path="project/:projectId/financials" element={<AdminFinancialsPage />} />
        <Route path="ai-scope/:requestId" element={<GPTScopeBuilder />} />
        <Route path="ai-scope" element={<GPTScopeBuilder />} />

        <Route index element={<Navigate to="/admin/dashboard" replace />} />
      </Route>
      
      {/* Provider Marketplace Routes */}
      <Route 
        path="/provider/auth" 
        element={<ProviderAuth />} 
      />

      {/* ATLAS DevOS — Developer Work Hub (standalone) */}
      <Route
        path="/dev/work"
        element={
          <ProtectedRoute allowedRoles={['developer', 'admin']}>
            <DevWork />
          </ProtectedRoute>
        }
      />
      <Route
        path="/developer/work-hub"
        element={
          <ProtectedRoute allowedRoles={['developer', 'admin']}>
            <DevWork />
          </ProtectedRoute>
        }
      />
      <Route 
        path="/provider/inbox" 
        element={
          <ProtectedRoute allowedRoles={['provider', 'admin']}>
            <ProviderInbox />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/provider/job/:bookingId" 
        element={
          <ProtectedRoute allowedRoles={['provider', 'admin']}>
            <ProviderInbox />
          </ProtectedRoute>
        } 
      />
      
      {/* Legacy redirects */}
      <Route path="/dashboard" element={<Navigate to="/client/dashboard" replace />} />
      <Route path="/developer/hub" element={<Navigate to="/developer/dashboard" replace />} />
      <Route path="/tester/hub" element={<Navigate to="/tester/dashboard" replace />} />
      {/* WEB-P1.1: removed orphan `<Route path="marketplace" element={<DeveloperMarketplace />} />`
          that was attached at top level (no leading slash, no ProtectedRoute, unintended public access).
          Canonical route lives at `/developer/marketplace` inside the /developer parent (line 378).
          See /app/docs/active-audits/WEB_AUDIT_2026-02-FEB__ACTIVE.md §1.1 */}

      <Route path="/admin/work-board" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/request/new" element={<Navigate to="/client/request/new" replace />} />
      <Route path="/auth/client" element={<Navigate to="/client/auth" replace />} />
      <Route path="/auth/builder" element={<Navigate to="/builder/auth" replace />} />
      <Route path="/projects/:projectId" element={<Navigate to="/client/projects/:projectId" replace />} />
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}

function App() {
  // WEB-P1.5: REACT_APP_GOOGLE_CLIENT_ID is required (no hardcoded fallback —
  // previously leaked a real OAuth client id into the bundle). When the env var is
  // missing the GoogleLogin button simply does not render.
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";
  return (
    <div className="App">
      <GoogleOAuthProvider clientId={googleClientId}>
        <BrowserRouter basename={process.env.PUBLIC_URL || ""}>
          <ThemeProvider>
            <LanguageProvider>
              <LegalSettingsProvider>
                <AuthProvider>
                  <ToastProvider>
                    <ToastBridgeMount />
                    <RootErrorBoundary>
                      <AppRouter />
                    </RootErrorBoundary>
                    <CookieBannerMount />
                  </ToastProvider>
                </AuthProvider>
              </LegalSettingsProvider>
            </LanguageProvider>
          </ThemeProvider>
        </BrowserRouter>
      </GoogleOAuthProvider>
    </div>
  );
}

/**
 * CookieBannerMount — reads the theme so the banner adapts its tone, and is
 * inside the ThemeProvider tree (cannot be at top level for that reason).
 */
function CookieBannerMount() {
  const { theme } = useTheme();
  return <CookieBanner tone={theme === 'light' ? 'light' : 'dark'} />;
}

export default App;
