import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { SpeedInsights } from "@vercel/speed-insights/react";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import HBTSignup from "./pages/HBTSignup";
import PaymentSuccess from "./pages/PaymentSuccess";
import InviteAccept from "./pages/InviteAccept";
import InviteCenter from "./pages/InviteCenter";
import PortalBrandingSettings from "./pages/PortalBrandingSettings";
import EmployerApprovalCenter from "./pages/EmployerApprovalCenter";
import HBTJourneyBuilder from "./pages/HBTJourneyBuilder";
import QuizJourneyRuleManager from "./pages/QuizJourneyRuleManager";
import ReportsExportCenter from "./pages/ReportsExportCenter";
import DeploymentReadinessCenter from "./pages/DeploymentReadinessCenter";
import EmployeePortal from "./pages/EmployeePortal";
import EmployeeJourney from "./pages/EmployeeJourney";
import NotificationCenter from "./pages/NotificationCenter";
import PartnershipLanding from "./pages/PartnershipLanding";
import Resources from "./pages/Resources";
import ResourceDetails from "./pages/ResourceDetails";
import Pricing from "./pages/Pricing";
import Contact from "./pages/Contact";
import Quiz from "./pages/Quiz";
import Partners from "./pages/Partners";
import NotFound from "./pages/NotFound";
import MessageCenter from "./pages/MessageCenter";
import ProfilePage from "./pages/Profile";
import MortgageRequest from "./pages/MortgageRequest";
import CompanyDashboard from "./pages/CompanyDashboard";
import HBTDashboard from "./pages/HBTDashboard";
import HBTMemberDashboard from "./pages/HBTMemberDashboard";
import HBTTeamMembers from "./pages/HBTTeamMembers";
import HBTCompanies from "./pages/HBTCompanies";
import HBTEmployees from "./pages/HBTEmployees";
import HBTResources from "./pages/HBTResources";
import HBTQuizSubmissions from "./pages/HBTQuizSubmissions";
import HBTEvents from "./pages/HBTEvents";
import HBTCourses from "./pages/HBTCourses";

import AdminLogin from "./admin/pages/AdminLogin";
import AdminDashboard from "./admin/pages/AdminDashboard";
import ManageResources from "./admin/pages/ManageResources";
import ManageUsers from "./admin/pages/ManageUsers";
import ManagePages from "./admin/pages/ManagePages";
import ManageSections from "./admin/pages/ManageSections";
import ManageCards from "./admin/pages/ManageCards";
import ManagePricing from "./admin/pages/ManagePricing";
import ManagePayments from "./admin/pages/ManagePayments";
import ContactMessages from "./admin/pages/ContactMessages";
import ManageFAQs from "./admin/pages/ManageFAQs";
import ManageQuizzes from "./admin/pages/ManageQuizzes";
import ManageQuizQuestions from "./admin/pages/ManageQuizQuestions";
import ManageHBTs from "./admin/pages/ManageHBTs";
import QuizSubmissions from "./admin/pages/QuizSubmissions";
import AdminPartnerships from "./admin/pages/AdminPartnerships";
import AdminBuilder from "./admin/pages/AdminBuilder";
import ManageFooter from "./admin/pages/ManageFooter";
import ManageMortgageServices from "./admin/pages/ManageMortgageServices";
import ManageServiceRequests from "./admin/pages/ManageServiceRequests";
import AdminProtectedRoute from "./admin/components/AdminProtectedRoute";
import AdminLayout from "./admin/components/AdminLayout";
import AppErrorBoundary from "./components/AppErrorBoundary";
import RoleProtectedRoute from "./components/RoleProtectedRoute";
import Navbar, { NavbarHost } from "./components/Navbar";
import FooterShell from "./components/FooterShell";
import MortgageServicesShell from "./components/MortgageServicesShell";
import PartnershipMortgageServicesShell from "./components/PartnershipMortgageServicesShell";
import MobileStickyCTA from "./components/MobileStickyCTA";
import FloatingThemeControl from "./components/FloatingThemeControl";
import ScrollToTop from "./components/ScrollToTop";
import MortgageReadinessWidget from "./components/MortgageReadinessWidget";
import HBTLeadPipelineWidget from "./components/HBTLeadPipelineWidget";
import CompanyROIWidget from "./components/CompanyROIWidget";
import RecommendedResourcesWidget from "./components/RecommendedResourcesWidget";
import { isAdminPath, isPartnershipSlugPath } from "./utils/routes";

const allRoles = ["admin", "super_admin", "hbt_admin", "hbt_member", "employee", "company_admin", "company"];

function AppShell() {
  const { pathname } = useLocation();
  const adminRoute = isAdminPath(pathname);
  const partnershipRoute = isPartnershipSlugPath(pathname);
  const showGlobalNavbar = !adminRoute && !partnershipRoute;
  const suppressPageNavbar = showGlobalNavbar || adminRoute;

  return (
    <NavbarHost globalMounted={suppressPageNavbar}>
      <ScrollToTop />
      {showGlobalNavbar && <Navbar globalInstance />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/hbt-signup" element={<HBTSignup />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/invite/:token" element={<InviteAccept />} />
        <Route path="/partners" element={<Partners />} />
        <Route path="/mortgage-request" element={<MortgageRequest />} />

        <Route path="/profile" element={<RoleProtectedRoute allowedRoles={allRoles}><ProfilePage /></RoleProtectedRoute>} />
        <Route path="/notifications" element={<RoleProtectedRoute allowedRoles={allRoles}><NotificationCenter /></RoleProtectedRoute>} />

        <Route path="/employee-portal" element={<RoleProtectedRoute allowedRoles={["employee"]}><EmployeePortal /></RoleProtectedRoute>} />
        <Route path="/employee/journey" element={<RoleProtectedRoute allowedRoles={["employee"]}><EmployeeJourney /></RoleProtectedRoute>} />
        <Route path="/resources" element={<RoleProtectedRoute allowedRoles={["employee"]}><Resources /></RoleProtectedRoute>} />
        <Route path="/resources/:id" element={<RoleProtectedRoute allowedRoles={["employee"]}><ResourceDetails /></RoleProtectedRoute>} />
        <Route path="/quiz" element={<RoleProtectedRoute allowedRoles={["employee"]}><Quiz /></RoleProtectedRoute>} />
        <Route path="/quiz/:quizId" element={<RoleProtectedRoute allowedRoles={["employee"]}><Quiz /></RoleProtectedRoute>} />
        <Route path="/employee/messages" element={<RoleProtectedRoute allowedRoles={["employee"]}><MessageCenter /></RoleProtectedRoute>} />

        <Route path="/company/dashboard" element={<RoleProtectedRoute allowedRoles={["company_admin", "company"]}><CompanyDashboard /></RoleProtectedRoute>} />
        <Route path="/company/messages" element={<RoleProtectedRoute allowedRoles={["company_admin", "company"]}><MessageCenter /></RoleProtectedRoute>} />
        <Route path="/company/invites" element={<RoleProtectedRoute allowedRoles={["company_admin", "company"]}><InviteCenter /></RoleProtectedRoute>} />
        <Route path="/company/branding" element={<RoleProtectedRoute allowedRoles={["company_admin", "company"]}><PortalBrandingSettings /></RoleProtectedRoute>} />
        <Route path="/company/employer-approval" element={<RoleProtectedRoute allowedRoles={["company_admin", "company"]}><EmployerApprovalCenter /></RoleProtectedRoute>} />
        <Route path="/company/reports" element={<RoleProtectedRoute allowedRoles={["company_admin", "company"]}><ReportsExportCenter /></RoleProtectedRoute>} />

        <Route path="/hbt/dashboard" element={<RoleProtectedRoute allowedRoles={["hbt_admin"]}><HBTDashboard /></RoleProtectedRoute>} />
        <Route path="/hbt/companies" element={<RoleProtectedRoute allowedRoles={["hbt_admin"]}><HBTCompanies /></RoleProtectedRoute>} />
        <Route path="/hbt/employees" element={<RoleProtectedRoute allowedRoles={["hbt_admin"]}><HBTEmployees /></RoleProtectedRoute>} />
        <Route path="/hbt/team-members" element={<RoleProtectedRoute allowedRoles={["hbt_admin"]}><HBTTeamMembers /></RoleProtectedRoute>} />
        <Route path="/hbt/resources" element={<RoleProtectedRoute allowedRoles={["hbt_admin"]}><HBTResources /></RoleProtectedRoute>} />
        <Route path="/hbt/events" element={<RoleProtectedRoute allowedRoles={["hbt_admin"]}><HBTEvents /></RoleProtectedRoute>} />
        <Route path="/hbt/courses" element={<RoleProtectedRoute allowedRoles={["hbt_admin", "hbt_member"]}><HBTCourses /></RoleProtectedRoute>} />
        <Route path="/hbt/journeys" element={<RoleProtectedRoute allowedRoles={["hbt_admin"]}><HBTJourneyBuilder /></RoleProtectedRoute>} />
        <Route path="/hbt/quiz-journey-rules" element={<RoleProtectedRoute allowedRoles={["hbt_admin"]}><QuizJourneyRuleManager /></RoleProtectedRoute>} />
        <Route path="/hbt/reports" element={<RoleProtectedRoute allowedRoles={["hbt_admin", "hbt_member"]}><ReportsExportCenter /></RoleProtectedRoute>} />
        <Route path="/hbt/qa" element={<RoleProtectedRoute allowedRoles={["hbt_admin"]}><DeploymentReadinessCenter /></RoleProtectedRoute>} />
        <Route path="/hbt/invites" element={<RoleProtectedRoute allowedRoles={["hbt_admin"]}><InviteCenter /></RoleProtectedRoute>} />
        <Route path="/hbt/branding" element={<RoleProtectedRoute allowedRoles={["hbt_admin"]}><PortalBrandingSettings /></RoleProtectedRoute>} />
        <Route path="/hbt/employer-approvals" element={<RoleProtectedRoute allowedRoles={["hbt_admin"]}><EmployerApprovalCenter /></RoleProtectedRoute>} />
        <Route path="/hbt/quiz-submissions" element={<RoleProtectedRoute allowedRoles={["hbt_admin", "hbt_member"]}><HBTQuizSubmissions /></RoleProtectedRoute>} />
        <Route path="/hbt/messages" element={<RoleProtectedRoute allowedRoles={["hbt_admin", "hbt_member"]}><MessageCenter /></RoleProtectedRoute>} />
        <Route path="/hbt/member-dashboard" element={<RoleProtectedRoute allowedRoles={["hbt_member"]}><HBTMemberDashboard /></RoleProtectedRoute>} />

        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
        <Route path="/admin/builder" element={<AdminProtectedRoute><AdminBuilder /></AdminProtectedRoute>} />
        <Route path="/admin/hbts" element={<AdminProtectedRoute><ManageHBTs /></AdminProtectedRoute>} />
        <Route path="/admin/partnerships" element={<AdminProtectedRoute><AdminPartnerships /></AdminProtectedRoute>} />
        <Route path="/admin/resources" element={<AdminProtectedRoute><ManageResources /></AdminProtectedRoute>} />
        <Route path="/admin/users" element={<AdminProtectedRoute><ManageUsers /></AdminProtectedRoute>} />
        <Route path="/admin/pages" element={<AdminProtectedRoute><ManagePages /></AdminProtectedRoute>} />
        <Route path="/admin/sections" element={<AdminProtectedRoute><ManageSections /></AdminProtectedRoute>} />
        <Route path="/admin/cards" element={<AdminProtectedRoute><ManageCards /></AdminProtectedRoute>} />
        <Route path="/admin/pricing" element={<AdminProtectedRoute><ManagePricing /></AdminProtectedRoute>} />
        <Route path="/admin/payments" element={<AdminProtectedRoute><ManagePayments /></AdminProtectedRoute>} />
        <Route path="/admin/footer" element={<AdminProtectedRoute><ManageFooter /></AdminProtectedRoute>} />
        <Route path="/admin/mortgage-services" element={<AdminProtectedRoute><ManageMortgageServices /></AdminProtectedRoute>} />
        <Route path="/admin/service-requests" element={<AdminProtectedRoute><ManageServiceRequests /></AdminProtectedRoute>} />
        <Route path="/admin/contact-messages" element={<AdminProtectedRoute><ContactMessages /></AdminProtectedRoute>} />
        <Route path="/admin/faqs" element={<AdminProtectedRoute><ManageFAQs /></AdminProtectedRoute>} />
        <Route path="/admin/quizzes" element={<AdminProtectedRoute><ManageQuizzes /></AdminProtectedRoute>} />
        <Route path="/admin/quizzes/:quizId/questions" element={<AdminProtectedRoute><ManageQuizQuestions /></AdminProtectedRoute>} />
        <Route path="/admin/quiz-submissions" element={<AdminProtectedRoute><QuizSubmissions /></AdminProtectedRoute>} />
        <Route path="/admin/reports" element={<AdminProtectedRoute><ReportsExportCenter /></AdminProtectedRoute>} />
        <Route path="/admin/qa" element={<AdminProtectedRoute><DeploymentReadinessCenter /></AdminProtectedRoute>} />
        <Route path="/admin/messages" element={<AdminProtectedRoute><AdminLayout title="Communication Center"><MessageCenter embedded /></AdminLayout></AdminProtectedRoute>} />
        <Route path="/admin/notifications" element={<AdminProtectedRoute><AdminLayout title="Alerts Center"><NotificationCenter embedded /></AdminLayout></AdminProtectedRoute>} />
        <Route path="/admin/profile" element={<AdminProtectedRoute><AdminLayout title="My Profile"><ProfilePage embedded /></AdminLayout></AdminProtectedRoute>} />

        <Route path="/:slug" element={<PartnershipLanding />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      <div className="hb-portal-support-content">
        <MortgageReadinessWidget />
        <RecommendedResourcesWidget />
        <HBTLeadPipelineWidget />
        <CompanyROIWidget />
        <MortgageServicesShell />
        <PartnershipMortgageServicesShell />
      </div>

      <FloatingThemeControl />
      <MobileStickyCTA />
      <FooterShell />
      <SpeedInsights />
    </NavbarHost>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppErrorBoundary>
        <AppShell />
      </AppErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
