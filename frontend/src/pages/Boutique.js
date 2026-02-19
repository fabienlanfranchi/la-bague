import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingBag } from 'lucide-react';

const Boutique = () => {
  return (
    <div className="space-y-8">
      <div className="text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-2">
          Boutique
        </h1>
        <p className="text-[#D4A024] text-lg font-serif">
          Articles et accessoires du club
        </p>
      </div>

      <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-serif text-white flex items-center space-x-3">
            <ShoppingBag className="w-8 h-8 text-[#D4A024]" />
            <span>Boutique du Club</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-300">
            Section en cours de développement. Cette page contiendra :
          </p>
          <ul className="list-disc list-inside text-gray-400 mt-4 space-y-2">
            <li>Articles de la boutique (accessoires, vêtements)</li>
            <li>Cigares en vente</li>
            <li>Commandes en ligne</li>
            <li>Historique des achats</li>
            <li>Panier et paiement sécurisé</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default Boutique;
