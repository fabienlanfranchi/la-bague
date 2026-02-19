import React from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import { Toaster } from '@/components/ui/sonner';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ProfilePage from './pages/ProfilePage';
import MembersPage from './pages/MembersPage';
import Comptabilite from './pages/Comptabilite';
import Evenements from './pages/Evenements';
import Jeux from './pages/Jeux';
import Messages from './pages/Messages';
import Sondages from './pages/Sondages';
import Cigarotheque from './pages/Cigarotheque';
import AssistantIA from './pages/AssistantIA';

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
            Application de gestion du club en cours de développement.
            Accès libre pendant la période de construction et d'essai.
          </p>
          <Link
            to="/dashboard"
            className="block w-full bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-bold py-4 px-6 rounded-lg text-center transition duration-200 shadow-lg text-lg font-serif"
            data-testid="access-app-button"
          >
            ACCÉDER À L'APPLICATION
          </Link>
          <p className="text-sm text-gray-400 text-center mt-4">
            Mode Développement - Toutes les fonctionnalités sont accessibles
          </p>
        </div>
      </div>
    </div>
  );
};

const AppLayout = ({ children }) => {
  // Sélectionner une photo aléatoire pour le fond
  const randomCigar = Math.floor(Math.random() * 10) + 1;
  
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
      <div className="relative z-10 flex">
        <Sidebar />
        <main className="flex-1 lg:ml-64 p-6 md:p-8">
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
            <Route
              path="/dashboard"
              element={
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              }
            />
            <Route
              path="/comptabilite"
              element={
                <AppLayout>
                  <Comptabilite />
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
            <Route
              path="/evenements"
              element={
                <AppLayout>
                  <Evenements />
                </AppLayout>
              }
            />
            <Route
              path="/jeux"
              element={
                <AppLayout>
                  <Jeux />
                </AppLayout>
              }
            />
            <Route
              path="/messages"
              element={
                <AppLayout>
                  <Messages />
                </AppLayout>
              }
            />
            <Route
              path="/sondages"
              element={
                <AppLayout>
                  <Sondages />
                </AppLayout>
              }
            />
            <Route
              path="/cigarotheque"
              element={
                <AppLayout>
                  <Cigarotheque />
                </AppLayout>
              }
            />
            <Route
              path="/assistant-ia"
              element={
                <AppLayout>
                  <AssistantIA />
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </div>
    </UserProvider>
  );
}

export default App;
