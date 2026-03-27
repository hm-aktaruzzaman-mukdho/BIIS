import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Applications from './pages/provost/Applications';
import Residents from './pages/provost/Residents';
import SeatChanges from './pages/provost/SeatChanges';
import Register from './pages/Register';
import ApplySeat from './pages/student/ApplySeat';
import ChangeSeat from './pages/student/SeatChange';
import MyApplications from './pages/student/MyApplications';
import SeatAvailability from './pages/student/SeatAvailability';

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />

      {/* Student Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={
          user?.role === 'provost' ? <Navigate to="/provost/applications" /> : <SeatAvailability />
        } />
        <Route path="seats" element={<ProtectedRoute role="student"><SeatAvailability /></ProtectedRoute>} />
        <Route path="apply" element={<ProtectedRoute role="student"><ApplySeat /></ProtectedRoute>} />
        <Route path="change-seat" element={<ProtectedRoute role="student"><ChangeSeat /></ProtectedRoute>} />
        <Route path="my-applications" element={<ProtectedRoute role="student"><MyApplications /></ProtectedRoute>} />

        {/* Provost Routes */}
        <Route path="provost/applications" element={<ProtectedRoute role="provost"><Applications /></ProtectedRoute>} />
        <Route path="provost/seat-changes" element={<ProtectedRoute role="provost"><SeatChanges /></ProtectedRoute>} />
        <Route path="provost/residents" element={<ProtectedRoute role="provost"><Residents /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}