import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingBag, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Boutique = () => {
  const BOUTIQUE_URL = "https://labagueimperiale.myspreadshop.fr/";

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
            <span>Boutique La Bague Impériale</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-gray-300 text-lg">
            Découvrez notre collection d'articles aux couleurs du club : vêtements, accessoires et bien plus encore.
          </p>
          <Button
            onClick={() => window.open(BOUTIQUE_URL, '_blank')}
            className="w-full bg-[#D4A024] hover:bg-[#C8941D] text-[#1C1917] font-serif text-xl py-8"
            data-testid="boutique-link"
          >
            <ExternalLink className="w-6 h-6 mr-3" />
            Accéder à la Boutique
          </Button>
          <p className="text-gray-500 text-sm text-center">
            Les commandes sont gérées directement via Spreadshop.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Boutique;
