import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Crown, User } from 'lucide-react';

const Header = () => {
  const { isAdmin, toggleMode } = useUser();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-gradient-to-r from-amber-900 to-amber-700 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo et titre */}
          <Link to="/dashboard" className="flex items-center space-x-3">
            <div className="text-3xl">🎩</div>
            <div>
              <h1 className="text-2xl font-bold">La Bague Impériale</h1>
              <p className="text-xs text-amber-200">Club Cigare</p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center space-x-6">
            <Link
              to="/dashboard"
              className={`hover:text-amber-200 transition ${
                isActive('/dashboard') ? 'text-amber-200 font-semibold' : ''
              }`}
            >
              Accueil
            </Link>
            <Link
              to="/profile"
              className={`hover:text-amber-200 transition ${
                isActive('/profile') ? 'text-amber-200 font-semibold' : ''
              }`}
            >
              Profil
            </Link>
            {isAdmin && (
              <Link
                to="/members"
                className={`hover:text-amber-200 transition ${
                  isActive('/members') ? 'text-amber-200 font-semibold' : ''
                }`}
              >
                Membres
              </Link>
            )}
          </nav>

          {/* Toggle Admin/Membre */}
          <div className="flex items-center space-x-3 bg-amber-800 px-4 py-2 rounded-lg">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span className="text-sm">Membre</span>
            </div>
            <Switch
              checked={isAdmin}
              onCheckedChange={toggleMode}
              className="data-[state=checked]:bg-amber-400"
            />
            <div className="flex items-center space-x-2">
              <Crown className="w-4 h-4" />
              <span className="text-sm font-semibold">Président</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
