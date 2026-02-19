import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

const Sondages = () => {
  return (
    <div className="space-y-8">
      <div className="text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-2">
          Sondages
        </h1>
        <p className="text-[#D4A024] text-lg font-serif">
          Sondages et votes du club
        </p>
      </div>

      <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-serif text-white flex items-center space-x-3">
            <BarChart3 className="w-8 h-8 text-[#D4A024]" />
            <span>Sondages Actifs</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-300">
            Section en cours de développement. Cette page contiendra :
          </p>
          <ul className="list-disc list-inside text-gray-400 mt-4 space-y-2">
            <li>Création de sondages</li>
            <li>Participation aux votes</li>
            <li>Résultats en temps réel</li>
            <li>Historique des sondages</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default Sondages;