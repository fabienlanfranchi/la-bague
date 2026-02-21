import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gamepad2 } from 'lucide-react';

const Jeux = () => {
  return (
    <div className="space-y-8">
      <div className="text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-2">
          Jeux
        </h1>
        <p className="text-[#D4A024] text-lg font-serif">
          Jeux et défis du club
        </p>
      </div>

      <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-serif text-white flex items-center space-x-3">
            <Gamepad2 className="w-8 h-8 text-[#D4A024]" />
            <span>Jeux & Défis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-300">
            Section en cours de développement. Cette page contiendra :
          </p>
          <ul className="list-disc list-inside text-gray-400 mt-4 space-y-2">
            <li>Défis entre membres</li>
            <li>Classements</li>
            <li>Récompenses</li>
            <li>Historique des jeux</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default Jeux;