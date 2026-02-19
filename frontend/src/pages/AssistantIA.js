import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

const AssistantIA = () => {
  return (
    <div className="space-y-8">
      <div className="text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-2">
          Assistant IA
        </h1>
        <p className="text-[#D4A024] text-lg font-serif">
          Votre conseiller personnel pour le cigare
        </p>
      </div>

      <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-serif text-white flex items-center space-x-3">
            <Sparkles className="w-8 h-8 text-[#D4A024]" />
            <span>Assistant Intelligent</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-300">
            Section en cours de développement. Cette page contiendra :
          </p>
          <ul className="list-disc list-inside text-gray-400 mt-4 space-y-2">
            <li>Recommandations personnalisées</li>
            <li>Conseils de dégustation</li>
            <li>Questions/Réponses sur les cigares</li>
            <li>Suggestions d'accords</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AssistantIA;