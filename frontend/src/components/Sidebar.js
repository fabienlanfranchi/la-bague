import React, { useState, useEffect } from 'react';
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
  Save
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Sidebar = () => {
  const { isAdmin, toggleMode, currentMember } = useUser();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);

  // Charger le nombre de notifications non lues
  const fetchNotifications = async () => {
    if (currentMember?.id) {
      try {
        const response = await axios.get(`${API}/notifications/${currentMember.id}/count`);
        setNotificationCount(response.data.count || 0);
      } catch (error) {
        console.error('Erreur notifications:', error);
      }
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Rafraîchir toutes les 10 secondes (plus fréquent pour réactivité)
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [currentMember]);

  // Rafraîchir quand on change de page (notamment quand on quitte Messages)
  useEffect(() => {
    fetchNotifications();
  }, [location.pathname]);

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
    { path: '/cigarotheque', label: 'Cigarthèque', icon: Book, adminOnly: false },
    { path: '/assistant-ia', label: 'Assistant IA', icon: Sparkles, adminOnly: false },
    { path: '/instagram', label: 'Instagram', icon: InstagramIcon, adminOnly: false, external: true },
    { path: '/profile', label: 'Profil', icon: User, adminOnly: false },
  ];

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-[#7A2020] text-[#D4A024] p-2 rounded-lg"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Sidebar */}
      <div
        className={`
          fixed left-0 top-0 h-full bg-black border-r border-[#D4A024]/20
          transition-all duration-300 z-40 overflow-y-auto
          ${isOpen ? 'w-64' : 'w-0 lg:w-64'}
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
                    flex items-center space-x-3 px-4 py-3 rounded-lg transition-all relative
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
                  {/* Badge de notification pour Messages */}
                  {item.path === '/messages' && notificationCount > 0 && (
                    <span className="absolute right-3 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Toggle Président/Membre */}
          <div className="mt-auto pt-6 border-t border-[#D4A024]/20">
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

            <Link
              to="/"
              className="flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-red-900/20 hover:text-red-400 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span>Déconnexion</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Overlay pour mobile */}
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
