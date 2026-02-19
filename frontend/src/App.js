import React from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import { Toaster } from '@/components/ui/sonner';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import ProfilePage from './pages/ProfilePage';
import MembersPage from './pages/MembersPage';

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-amber-900 to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold text-white mb-4">
            La Bague Impériale
          </h1>
          <p className="text-xl text-amber-200">CLUB CIGARE</p>
        </div>

        <div className="bg-gray-800 bg-opacity-50 backdrop-blur-sm border border-amber-700 rounded-lg p-8 shadow-2xl">
          <h2 className="text-3xl font-semibold text-white mb-4">Bienvenue</h2>
          <p className="text-gray-300 mb-6">
            Application de gestion du club en cours de développement.
            Accès libre pendant la période de construction et d'essai.
          </p>
          <a
            href="/dashboard"
            className="block w-full bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold py-4 px-6 rounded-lg text-center transition duration-200 shadow-lg"
            data-testid="access-app-button"
          >
            ACCÉDER À L'APPLICATION
          </a>
          <p className="text-sm text-gray-400 text-center mt-4">
            Mode Développement - Toutes les fonctionnalités sont accessibles
          </p>
        </div>
      </div>
    </div>
  );
};

const AppLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>{children}</main>
    </div>
  );
};

function App() {
  return (
    <UserProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/dashboard"
              element={
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              }
            />
            <Route
              path="/profile"
              element={
                <AppLayout>
                  <ProfilePage />
                </AppLayout>
              }
            />
            <Route
              path="/members"
              element={
                <AppLayout>
                  <MembersPage />
                </AppLayout>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </div>
    </UserProvider>
  );
}

export default App;
