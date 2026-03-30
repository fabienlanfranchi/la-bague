import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { Switch } from '@/components/ui/switch';
import { 
  LayoutDashboard, 
  Users, 
  User, 
  Crown,
  LogOut,
  Menu,
  DollarSign,
  Calendar,
  Gamepad2,
  MessageSquare,
  Book,
  Sparkles,
  Instagram as InstagramIcon,
  ShoppingBag,
  BarChart3,
  PieChart,
  Save,
  BookOpen,
  HelpCircle
} from 'lucide-react';

const Sidebar = () => {
  const { isAdmin, toggleMode, currentMember, logout } = useUser();
  const location = useLocation();
  // Fermé par défaut sur mobile, ouvert sur desktop
  const [isOpen, setIsOpen] = useState(window.innerWidth >= 1024);
  
  // Le toggle mode n'est disponible que pour le Président
  const canToggleMode = currentMember?.is_president === true;

  const isActive = (path) => location.pathname === path;

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
    { path: '/comptabilite', label: 'Comptabilité', icon: DollarSign, adminOnly: true },
    { path: '/members', label: 'Membres', icon: Users, adminOnly: true },
    { path: '/evenements', label: 'Événements', icon: Calendar, adminOnly: false },
    { path: '/jeux', label: 'Jeux', icon: Gamepad2, adminOnly: false },
    { path: '/boutique', label: 'Boutique', icon: ShoppingBag, adminOnly: false },
    { path: '/messages', label: 'Messages', icon: MessageSquare, adminOnly: true },
    { path: '/sondages', label: 'Sondages', icon: BarChart3, adminOnly: false },
    { path: '/statistiques', label: 'Statistiques', icon: PieChart, adminOnly: true },
    { path: '/sauvegarde', label: 'Sauvegarde', icon: Save, adminOnly: true },
    { path: '/cigarotheque', label: 'Cigarothèque', icon: Book, adminOnly: false },
    { path: '/guide-cigare', label: 'Tout sur le cigare', icon: BookOpen, adminOnly: false },
    { path: '/assistant-ia', label: 'Winston', icon: Sparkles, adminOnly: false },
    { path: '/aide', label: 'Aide', icon: HelpCircle, adminOnly: false },
    { path: '/instagram', label: 'Instagram', icon: InstagramIcon, adminOnly: false, external: true },
    { path: '/profile', label: 'Profil', icon: User, adminOnly: false, memberOnly: true },
  ];

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-[#7A2020] text-[#D4A024] p-2 rounded-lg"
        data-testid="sidebar-toggle"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Sidebar - position fixe, ne cause pas de reflow */}
      <aside
        className={`
          fixed left-0 top-0 h-screen bg-black border-r border-[#D4A024]/20
          z-40 overflow-y-auto overflow-x-hidden
          transition-transform duration-300 ease-in-out
          w-64
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full p-6">
          {/* Logo et profil */}
          <div className="mb-8">
            <div className="flex justify-center mb-6">
              <div className="w-32 h-32 flex items-center justify-center">
                <img
                  src="/assets/logos/logo-rond-transparent.svg"
                  alt="La Bague Impériale"
                  className="w-full h-full object-contain filter drop-shadow-lg"
                />
              </div>
            </div>
            
            <div className="text-center">
              <h3 className="text-white text-lg font-serif mb-1">
                {currentMember?.nom_complet || 'Utilisateur'}
              </h3>
              <p className="text-[#D4A024] text-sm font-semibold tracking-wider">
                {isAdmin ? 'PRÉSIDENT' : 'MEMBRE'}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {menuItems.map((item) => {
              if (item.adminOnly && !isAdmin) return null;
              if (item.memberOnly && isAdmin) return null;
              
              const Icon = item.icon;
              
              if (item.external) {
                return (
                  <a
                    key={item.path}
                    href="https://instagram.com/labagueimperiale"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-3 px-4 py-3 rounded-lg transition-all text-gray-400 hover:bg-[#D4A024]/10 hover:text-[#D4A024]"
                    data-testid={`sidebar-${item.label.toLowerCase()}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </a>
                );
              }
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex items-center space-x-3 px-4 py-3 rounded-lg transition-all
                    ${
                      isActive(item.path)
                        ? 'bg-[#D4A024]/20 text-[#D4A024] border-l-4 border-[#D4A024]'
                        : 'text-gray-400 hover:bg-[#D4A024]/10 hover:text-[#D4A024]'
                    }
                  `}
                  data-testid={`sidebar-${item.label.toLowerCase()}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Toggle Président/Membre - UNIQUEMENT pour le Président */}
          <div className="mt-auto pt-6 border-t border-[#D4A024]/20">
            {canToggleMode && (
              <div className="bg-[#7A2020]/30 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Mode</span>
                  <Switch
                    checked={isAdmin}
                    onCheckedChange={toggleMode}
                    className="data-[state=checked]:bg-[#D4A024]"
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className={!isAdmin ? 'text-[#D4A024]' : 'text-gray-500'}>
                    Membre
                  </span>
                  <span className={isAdmin ? 'text-[#D4A024]' : 'text-gray-500'}>
                    <Crown className="w-4 h-4 inline mr-1" />
                    Président
                  </span>
                </div>
              </div>
            )}

            <Link
              to="/"
              onClick={logout}
              className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-red-900/20 hover:text-red-400 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span>Déconnexion</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Overlay pour mobile - ferme la sidebar au clic */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
