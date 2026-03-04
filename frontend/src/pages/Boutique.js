import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingBag, ExternalLink, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Boutique = () => {
  // URLs des boutiques - À personnaliser
  const SPREADAPP_URL = "https://www.spreadshop.fr"; // URL SpreadApp à remplacer
  const CLUB_ACCOUNT_URL = "https://www.spreadshop.fr/la-bague-imperiale"; // URL compte club à remplacer

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lien SpreadApp */}
        <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm hover:border-[#D4A024]/60 transition-all">
          <CardHeader>
            <CardTitle className="text-xl font-serif text-white flex items-center space-x-3">
              <Store className="w-7 h-7 text-[#D4A024]" />
              <span>SpreadApp</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-300">
              Accédez à l'application SpreadApp pour découvrir notre collection d'articles personnalisés.
            </p>
            <Button
              onClick={() => window.open(SPREADAPP_URL, '_blank')}
              className="w-full bg-[#D4A024] hover:bg-[#C8941D] text-[#1C1917] font-serif text-lg py-6"
              data-testid="spreadapp-link"
            >
              <ExternalLink className="w-5 h-5 mr-2" />
              Ouvrir SpreadApp
            </Button>
          </CardContent>
        </Card>

        {/* Lien Compte Club */}
        <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm hover:border-[#D4A024]/60 transition-all">
          <CardHeader>
            <CardTitle className="text-xl font-serif text-white flex items-center space-x-3">
              <ShoppingBag className="w-7 h-7 text-[#D4A024]" />
              <span>Boutique La Bague Impériale</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-300">
              Notre boutique officielle avec tous les articles aux couleurs du club.
            </p>
            <Button
              onClick={() => window.open(CLUB_ACCOUNT_URL, '_blank')}
              className="w-full bg-[#7A2020] hover:bg-[#8B2525] text-white font-serif text-lg py-6"
              data-testid="club-shop-link"
            >
              <ExternalLink className="w-5 h-5 mr-2" />
              Voir la Boutique du Club
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Note */}
      <Card className="bg-black/20 border border-[#D4A024]/20">
        <CardContent className="py-4">
          <p className="text-gray-400 text-sm text-center">
            Les commandes sont gérées directement via SpreadApp. Pour toute question, contactez le président.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Boutique;
