import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AppShell } from './layout/AppShell'
import { CampaignsPage } from './pages/CampaignsPage'
import { CampaignDetailPage } from './pages/CampaignDetailPage'
import { CasesPage } from './pages/CasesPage'
import { ContactCasesPage } from './pages/ContactCasesPage'
import { ContactsPage } from './pages/ContactsPage'
import { DashboardPage } from './pages/DashboardPage'
import { IncidentsPage } from './pages/IncidentsPage'
import { IncidentWarRoomPage } from './pages/IncidentWarRoomPage'
import { LeadsPage } from './pages/LeadsPage'
import { LoginPage } from './pages/LoginPage'
import { OpportunitiesPage } from './pages/OpportunitiesPage'
import { OpportunityDetailPage } from './pages/OpportunityDetailPage'
import { ProductsPage } from './pages/ProductsPage'
import { CaseDetailPage } from './pages/CaseDetailPage'
import { AdminUsersPage } from './pages/AdminUsersPage'
import { AccountsPage } from './pages/AccountsPage'
import { AccountDetailPage } from './pages/AccountDetailPage'
import { GamificationPage } from './pages/GamificationPage'
import { KnowledgeArticlesPage } from './pages/KnowledgeArticlesPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsGovernancePage } from './pages/SettingsGovernancePage'
import { SettingsIntegrationsPage } from './pages/SettingsIntegrationsPage'
import { SettingsPlatformPage } from './pages/SettingsPlatformPage'
import { TemplatesPage } from './pages/TemplatesPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="gamification" element={<GamificationPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="accounts/:id" element={<AccountDetailPage />} />
        <Route path="knowledge" element={<KnowledgeArticlesPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="campaigns/:id" element={<CampaignDetailPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="opportunities" element={<OpportunitiesPage />} />
        <Route path="opportunities/:id" element={<OpportunityDetailPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="contacts/:id/cases" element={<ContactCasesPage />} />
        <Route path="cases" element={<CasesPage />} />
        <Route path="cases/:id" element={<CaseDetailPage />} />
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="incidents/:id" element={<IncidentWarRoomPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="admin/users" element={<AdminUsersPage />} />

        <Route path="settings/governance" element={<SettingsGovernancePage />} />
        <Route path="settings/platform" element={<SettingsPlatformPage />} />
        <Route path="settings/integrations" element={<SettingsIntegrationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
