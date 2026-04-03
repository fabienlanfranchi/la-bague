import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

const GAMELAB_URL = "https://game-lab-play.base44.app/PublicProfile?pseudo=La%20Table%20Haute";
const GAMELAB_LOGO = "https://customer-assets.emergentagent.com/job_2ea98acc-c005-45ff-88c6-bad96e87658c/artifacts/cpf3kwf0_IMG_7702.jpeg";

const Jeux = () => {
  const handleOpenGameLab = () => {
    window.open(GAMELAB_URL, '_blank', 'noopener,noreferrer');
  };

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

      {/* GameLab Card */}
      <Card className="bg-gradient-to-br from-[#0a1628] to-[#0d1f3c] border-2 border-blue-500/30 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col items-center justify-center py-12 px-6">
            {/* Logo GameLab */}
            <div className="mb-8">
              <img 
                src={GAMELAB_LOGO} 
                alt="GameLab - Crée le débat" 
                className="w-64 md:w-80 h-auto rounded-lg shadow-2xl shadow-blue-500/20"
              />
            </div>
            
            {/* Description */}
            <p className="text-gray-300 text-center max-w-md mb-8 text-lg">
              Accédez à la plateforme de jeux du club <span className="text-[#D4A024] font-semibold">La Bague Impériale</span>
            </p>
            
            {/* Bouton d'accès */}
            <Button
              onClick={handleOpenGameLab}
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-serif text-lg px-8 py-6 rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-300 hover:scale-105"
              data-testid="gamelab-btn"
            >
              <ExternalLink className="w-5 h-5 mr-3" />
              Accéder à GameLab
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Jeux;