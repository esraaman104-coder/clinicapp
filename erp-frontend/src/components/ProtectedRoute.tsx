import { Navigate, Outlet } from 'react-router-dom';

/**
 * ProtectedRoute component
 * Checks for authentication token in localStorage.
 * If not found, redirects to the login page.
 */
const ProtectedRoute = () => {
  const token = localStorage.getItem('token');

  if (!token) {
    // Redirect to login while replacing the history entry
    return <Navigate to="/login" replace />;
  }

  // Render child routes
  return <Outlet />;
};

export default ProtectedRoute;
