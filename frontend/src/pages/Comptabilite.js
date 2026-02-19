import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';

const Comptabilite = () => {
  return (
    <div className="space-y-8">
      <div className="text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-2">
          Comptabilité
        </h1>
        <p className="text-[#D4A024] text-lg font-serif">
          Gestion financière du club
        </p>
      </div>

      <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-serif text-white flex items-center space-x-3">
            <DollarSign className="w-8 h-8 text-[#D4A024]" />
            <span>Finances du Club</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-300">
            Section en cours de développement. Cette page contiendra :
          </p>
          <ul className="list-disc list-inside text-gray-400 mt-4 space-y-2">
            <li>Suivi des cotisations</li>
            <li>Dépenses et recettes</li>
            <li>Bilans financiers</li>
            <li>Rapports mensuels</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default Comptabilite;