import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Messages from './pages/Messages'
import Send from './pages/Send'
import Otp from './pages/Otp'
import Gateways from './pages/Gateways'
import ApiKeys from './pages/ApiKeys'
import AuditLogs from './pages/AuditLogs'
import { useAuth } from './auth/AuthContext'
import { Spinner } from './components/ui'

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, token, booting } = useAuth()
  if (booting) return <Spinner label="Checking session…" />
  if (!user || !token) return <Navigate to="/login" replace />
  return children
}

function GuestRoute({ children }: { children: JSX.Element }) {
  const { user, token, booting } = useAuth()
  if (booting) return <Spinner label="Checking session…" />
  if (user && token) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestRoute>
            <Login />
          </GuestRoute>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="messages" element={<Messages />} />
        <Route path="send" element={<Send />} />
        <Route path="otp" element={<Otp />} />
        <Route path="gateways" element={<Gateways />} />
        <Route path="api-keys" element={<ApiKeys />} />
        <Route path="audit-logs" element={<AuditLogs />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
