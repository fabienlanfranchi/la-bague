import React from 'react';
import { 
  Home, 
  Calendar, 
  BookOpen, 
  MessageCircle, 
  Users,
  Settings,
  HelpCircle,
  Star,
  Wine,
  BarChart3,
  FileText,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';

const Aide = () => {
  const sections = [
    {
      icon: Home,
      title: "Dashboard",
      shortDesc: "Votre tableau de bord personnel avec vos statistiques.",
      details: [
        "Voir votre taux de présence aux événements",
        "Consulter vos étoiles de réputation",
        "Accéder rapidement aux prochains événements",
        "Vue d'ensemble de votre activité au club"
      ]
    },
    {
      icon: Calendar,
      title: "Événements",
      shortDesc: "Consultez et répondez aux événements du club.",
      details: [
        "Voir le prochain événement (Apéro, Repas, Anniversaire...)",
        "Confirmer ou décliner votre présence",
        "Consulter l'historique des saisons passées",
        "Voir qui sera présent à chaque événement",
        "Admin : Créer, modifier et partager les événements"
      ]
    },
    {
      icon: Wine,
      title: "Cigarthèque",
      shortDesc: "Explorez notre catalogue de 651 cigares.",
      details: [
        "Parcourir le catalogue complet (cubains et non-cubains)",
        "Filtrer par marque, pays, puissance, prix",
        "Consulter les fiches détaillées de chaque cigare",
        "Ajouter des cigares à votre collection personnelle",
        "Noter et commenter vos dégustations",
        "Partager une fiche cigare sur WhatsApp",
        "Admin : Gérer l'Apéro du Club"
      ]
    },
    {
      icon: MessageCircle,
      title: "Winston",
      shortDesc: "Votre assistant IA spécialiste des cigares.",
      details: [
        "Poser toutes vos questions sur les cigares",
        "Obtenir des recommandations personnalisées",
        "Choisir un cigare selon votre niveau et le moment",
        "Découvrir les accords cigare & alcool",
        "Accéder au guide complet 'Tout sur le cigare'",
        "Winston connaît tous les membres du club !"
      ]
    },
    {
      icon: BookOpen,
      title: "Tout sur le cigare",
      shortDesc: "Guide complet en 11 parties pour tout savoir.",
      details: [
        "Partie 1 : Bases, structure et histoire",
        "Partie 2 : Choisir un cigare en pratique",
        "Partie 3 : Lexique utile",
        "Partie 4 : Parler cigare correctement",
        "Partie 5 : Les grandes marques",
        "Partie 6 : Les pays et terroirs",
        "Partie 7 : Fabrication du cigare",
        "Partie 8 : Les modules (formats)",
        "Partie 9 : Défauts et corrections",
        "Partie 10 : Les accessoires",
        "Partie 11 : Parcours initiatiques par niveau"
      ]
    },
    {
      icon: Users,
      title: "Membres",
      shortDesc: "Voir tous les membres du club.",
      details: [
        "Liste des 35 membres avec leur ancienneté",
        "Consulter les statistiques de chaque membre",
        "Voir les fonctions (Président, Trésorier...)",
        "Admin : Gérer les membres et cotisations"
      ]
    },
    {
      icon: FileText,
      title: "Sondages",
      shortDesc: "Participez aux votes et décisions du club.",
      details: [
        "Répondre aux sondages en cours",
        "Voir les résultats des votes passés",
        "Admin : Créer de nouveaux sondages"
      ]
    },
    {
      icon: BarChart3,
      title: "Comptabilité",
      shortDesc: "Suivez les finances du club.",
      details: [
        "Consulter votre situation de cotisation",
        "Voir l'historique de vos paiements",
        "Admin : Gérer les comptes et encaissements"
      ]
    },
    {
      icon: Settings,
      title: "Paramètres",
      shortDesc: "Gérez votre compte.",
      details: [
        "Modifier vos informations personnelles",
        "Changer votre mot de passe",
        "Se déconnecter"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0a0a] to-[#2d1f1f] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <HelpCircle className="w-10 h-10 text-[#D4A024]" />
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-white">
              Guide d'utilisation
            </h1>
          </div>
          <p className="text-gray-400 text-lg">
            Découvrez toutes les fonctionnalités de votre espace membre
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {sections.map((section, index) => (
            <Card key={index} className="bg-black/40 border-[#D4A024]/20 overflow-hidden">
              <CardContent className="p-0">
                <details className="group">
                  <summary className="flex items-center gap-4 p-4 cursor-pointer list-none hover:bg-[#D4A024]/5 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-[#D4A024]/20 flex items-center justify-center shrink-0">
                      <section.icon className="w-6 h-6 text-[#D4A024]" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-serif font-bold text-white">{section.title}</h2>
                      <p className="text-gray-400 text-sm">{section.shortDesc}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#D4A024] transition-transform group-open:rotate-90" />
                  </summary>
                  
                  <div className="px-4 pb-4 pt-2 border-t border-[#D4A024]/10 bg-black/20">
                    <ul className="space-y-2 ml-16">
                      {section.details.map((detail, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-300">
                          <Star className="w-4 h-4 text-[#D4A024] mt-0.5 shrink-0" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-8 text-center">
          <Card className="bg-[#D4A024]/10 border-[#D4A024]/30">
            <CardContent className="p-6">
              <h3 className="text-xl font-serif font-bold text-white mb-2">
                Besoin d'aide ?
              </h3>
              <p className="text-gray-300">
                Contactez le Président : <span className="text-[#D4A024] font-semibold">Fabien Lanfranchi</span>
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Ou posez vos questions à Winston, notre assistant IA !
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Aide;
