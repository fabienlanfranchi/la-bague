import React from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { UserProvider, useUser } from './context/UserContext';
import { Toaster } from '@/components/ui/sonner';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ProfilePage from './pages/ProfilePage';
import MembersPage from './pages/MembersPage';
import Comptabilite from './pages/Comptabilite';
import Evenements from './pages/Evenements';
import Jeux from './pages/Jeux';
import Messages from './pages/Messages';
import Cigarotheque from './pages/Cigarotheque';
import AdminCigarotheque from './pages/AdminCigarotheque';
import AssistantIA from './pages/AssistantIA';
import Boutique from './pages/Boutique';
import Sondages from './pages/Sondages';
import Statistiques from './pages/Statistiques';
import Sauvegarde from './pages/Sauvegarde';
import LoginPage from './pages/LoginPage';
import ToutSurLeCigare from './pages/ToutSurLeCigare';

// Composant de chargement global
const LoadingScreen = () => {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <img
          src="/assets/logos/logo-principal-transparent.png"
          alt="La Bague Impériale"
          className="w-48 mx-auto mb-6 animate-pulse"
        />
        <div className="flex items-center justify-center space-x-2">
          <div className="w-3 h-3 bg-[#D4A024] rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
          <div className="w-3 h-3 bg-[#D4A024] rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
          <div className="w-3 h-3 bg-[#D4A024] rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
        </div>
        <p className="text-[#D4A024] mt-4 font-serif">Chargement...</p>
      </div>
    </div>
  );
};

// Composant d'erreur de connexion
const ErrorScreen = ({ message, onRetry }) => {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <img
          src="/assets/logos/logo-principal-transparent.png"
          alt="La Bague Impériale"
          className="w-48 mx-auto mb-6 opacity-50"
        />
        <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-6">
          <p className="text-red-400 text-lg mb-4">{message || 'Erreur de connexion au serveur'}</p>
          <button
            onClick={onRetry}
            className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-bold py-2 px-6 rounded-lg"
          >
            Réessayer
          </button>
        </div>
      </div>
    </div>
  );
};

// Accès libre - pas de protection requise
const ProtectedRoute = ({ children }) => {
  return children;
};

const AdminRoute = ({ children }) => {
  return children;
};

const Home = () => {
  // Sélectionner une photo aléatoire parmi les 10
  const randomCigar = Math.floor(Math.random() * 10) + 1;
  
  // Alterner entre les logos pour la page d'accueil
  const logos = [
    '/assets/logos/logo-principal-transparent.png',
    '/assets/logos/logo-vertical-transparent.png'
  ];
  const randomLogo = logos[Math.floor(Math.random() * logos.length)];
  
  return (
    <div 
      className="min-h-screen relative flex items-center justify-center px-4"
      style={{
        backgroundImage: `url(/assets/cigars/cigar-${randomCigar}.jpg)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay sombre */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      
      {/* Contenu */}
      <div className="relative z-10 max-w-2xl w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src={randomLogo}
            alt="La Bague Impériale"
            className="w-64 md:w-96 mx-auto mb-6 filter drop-shadow-2xl"
          />
        </div>

        {/* Carte de bienvenue */}
        <div className="bg-[#7A2020]/90 backdrop-blur-md border-2 border-[#D4A024] rounded-2xl p-8 md:p-12 shadow-2xl">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#D4A024] mb-4 text-center">
            Bienvenue
          </h2>
          <p className="text-gray-200 mb-6 text-center leading-relaxed">
            Espace réservé aux membres du club.
            Connectez-vous avec votre code d'activation.
          </p>
          <Link
            to="/login"
            className="block w-full bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-bold py-4 px-6 rounded-lg text-center transition duration-200 shadow-lg text-lg font-serif"
            data-testid="login-button"
          >
            CONNEXION MEMBRE
          </Link>
        </div>
      </div>
    </div>
  );
};

const AppLayout = ({ children }) => {
  const { loading, error } = useUser();
  
  // Sélectionner une photo aléatoire pour le fond
  const randomCigar = Math.floor(Math.random() * 10) + 1;
  
  // Afficher l'écran de chargement pendant le chargement initial
  if (loading) {
    return <LoadingScreen />;
  }
  
  // Afficher l'écran d'erreur si erreur de connexion
  if (error) {
    return <ErrorScreen message={error} onRetry={() => window.location.reload()} />;
  }
  
  return (
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: `url(/assets/cigars/cigar-${randomCigar}.jpg)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Overlay sombre avec blur */}
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md" />
      
      {/* Layout avec sidebar */}
      <div className="relative z-10 flex min-h-screen">
        <Sidebar />
        {/* Zone de contenu principal - marge fixe à gauche pour la sidebar */}
        <main className="flex-1 ml-0 lg:ml-64 p-6 md:p-8 min-h-screen overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
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
            <Route path="/login" element={<LoginPage />} />
            
            {/* Routes protégées - accès membre connecté */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/evenements"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Evenements />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/jeux"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Jeux />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/boutique"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Boutique />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/sondages"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Sondages />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/cigarotheque"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Cigarotheque />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/cigarotheque/admin"
              element={
                <AdminRoute>
                  <AppLayout>
                    <AdminCigarotheque />
                  </AppLayout>
                </AdminRoute>
              }
            />
            <Route
              path="/assistant-ia"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <AssistantIA />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/guide-cigare"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ToutSurLeCigare />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ProfilePage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            
            {/* Routes ADMIN uniquement */}
            <Route
              path="/comptabilite"
              element={
                <AdminRoute>
                  <AppLayout>
                    <Comptabilite />
                  </AppLayout>
                </AdminRoute>
              }
            />
            <Route
              path="/members"
              element={
                <AdminRoute>
                  <AppLayout>
                    <MembersPage />
                  </AppLayout>
                </AdminRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <AdminRoute>
                  <AppLayout>
                    <Messages />
                  </AppLayout>
                </AdminRoute>
              }
            />
            <Route
              path="/statistiques"
              element={
                <AdminRoute>
                  <AppLayout>
                    <Statistiques />
                  </AppLayout>
                </AdminRoute>
              }
            />
            <Route
              path="/sauvegarde"
              element={
                <AdminRoute>
                  <AppLayout>
                    <Sauvegarde />
                  </AppLayout>
                </AdminRoute>
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
