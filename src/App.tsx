import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import socket from './lib/socket';
import { AuthProvider } from './context/AuthContext';
import { TempAccessProvider } from './context/TempAccessContext';
import { ToastProvider } from './context/ToastContext';
import { TrackDataProvider } from './context/TrackDataContext';
import { CompanyDataProvider } from './context/CompanyDataContext';
import { YarnDataProvider } from './context/YarnDataContext';
import { CopColourDataProvider } from './context/CopColourDataContext';
import ProtectedRoute from './router/ProtectedRoute';
import TempAccessRoute from './router/TempAccessRoute';
import AppShell from './components/Layout/AppShell';
import LoginPage from './pages/LoginPage';
import PendingPage from './pages/PendingPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import TrackPage from './pages/Track/TrackPage';
import UsersPage from './pages/Users/UsersPage';
import ProfilePage from './pages/Profile/ProfilePage';
import CompanyDirectory from './pages/Company/CompanyDirectory';
import CompanyDetail from './pages/Company/CompanyDetail';
import CompanyFormPage from './pages/Company/CompanyFormPage';
import YarnDirectory from './pages/Yarn/YarnDirectory';
import YarnDetail from './pages/Yarn/YarnDetail';
import YarnFormPage from './pages/Yarn/YarnFormPage';
import CopColourDirectory from './pages/CopColour/CopColourDirectory';
import CopColourFormPage from './pages/CopColour/CopColourFormPage';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/pending',
    element: <PendingPage />,
  },
  {
    path: '/access/:token',
    element: <TempAccessRoute />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'track',
        element: <TrackPage />,
      },
      {
        path: 'track/:uid',
        element: <TrackPage />,
      },
      {
        path: 'users',
        element: <UsersPage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
      {
        path: 'company',
        element: <CompanyDirectory />,
      },
      {
        path: 'company/new',
        element: <CompanyFormPage />,
      },
      {
        path: 'company/:id',
        element: <CompanyDetail />,
      },
      {
        path: 'company/edit/:id',
        element: <CompanyFormPage />,
      },
      {
        path: 'yarn',
        element: <YarnDirectory />,
      },
      {
        path: 'yarn/new',
        element: <YarnFormPage />,
      },
      {
        path: 'yarn/:id',
        element: <YarnDetail />,
      },
      {
        path: 'yarn/edit/:id',
        element: <YarnFormPage />,
      },
      {
        path: 'cop-colors',
        element: <CopColourDirectory />,
      },
      {
        path: 'cop-colors/new',
        element: <CopColourFormPage />,
      },
      {
        path: 'cop-colors/edit/:id',
        element: <CopColourFormPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default function App() {
  useEffect(() => {
    console.log('[App Lifecycle] Cold start: JS runtime initialized');

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[App Lifecycle] Warm resume: App regained focus, JS runtime survived');
        // Force socket to reconnect if it died while backgrounded
        if (socket.disconnected) {
          socket.connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <TempAccessProvider>
      <AuthProvider>
        <TrackDataProvider>
          <CompanyDataProvider>
            <YarnDataProvider>
              <CopColourDataProvider>
                <ToastProvider>
                  <RouterProvider router={router} />
                </ToastProvider>
              </CopColourDataProvider>
            </YarnDataProvider>
          </CompanyDataProvider>
        </TrackDataProvider>
      </AuthProvider>
    </TempAccessProvider>
  );
}
