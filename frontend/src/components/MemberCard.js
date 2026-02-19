import React from 'react';

const MemberCard = ({ member }) => {
  if (!member) return null;

  // Générer un numéro de membre basé sur l'ID ou aléatoire
  const memberNumber = member.id ? parseInt(member.id.slice(0, 8), 16) % 1000 : Math.floor(Math.random() * 999) + 1;

  return (
    <div className="relative w-full max-w-2xl mx-auto" data-testid="member-card">
      {/* Carte de membre avec effet 3D */}
      <div 
        className="relative rounded-2xl overflow-hidden shadow-2xl transform hover:scale-105 transition-transform duration-300"
        style={{
          background: 'linear-gradient(135deg, #7A2020 0%, #5A1818 100%)',
        }}
      >
        {/* Effet sunburst en arrière-plan */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 70%)',
          }}
        />
        
        {/* Rayons décoratifs */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(212, 160, 36, 0.1) 2px,
              rgba(212, 160, 36, 0.1) 4px
            )`,
          }}
        />

        {/* Contenu de la carte */}
        <div className="relative p-8 md:p-12">
          {/* Bordure dorée */}
          <div className="absolute inset-4 border-2 border-[#D4A024] rounded-xl">
            {/* Ornements aux coins */}
            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-[#D4A024]"></div>
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-[#D4A024]"></div>
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-[#D4A024]"></div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-[#D4A024]"></div>
          </div>

          {/* En-tête */}
          <div className="text-center mb-6">
            <h3 className="text-[#D4A024] text-sm md:text-base font-serif tracking-widest mb-4">
              CARTE DE MEMBRE
            </h3>

            {/* Logo */}
            <div className="flex justify-center mb-4">
              <img
                src="/assets/logos/logo-rond-rouge.jpg"
                alt="La Bague Impériale"
                className="w-24 h-24 md:w-32 md:h-32 object-contain filter drop-shadow-lg"
              />
            </div>

            {/* Nom du club */}
            <h2 className="text-[#D4A024] text-2xl md:text-4xl font-serif font-bold tracking-wide mb-1">
              LA BAGUE IMPÉRIALE
            </h2>
            <p className="text-[#D4A024] text-xs md:text-sm tracking-[0.3em]">
              CLUB CIGARE
            </p>
          </div>

          {/* Informations du membre */}
          <div className="mt-8 space-y-2">
            <div className="flex items-baseline space-x-4">
              <span className="text-[#D4A024]/80 text-sm md:text-base font-serif">N°</span>
              <span className="text-[#D4A024] text-2xl md:text-3xl font-serif tracking-wider">
                {String(memberNumber).padStart(2, '0')}
              </span>
            </div>
            <div className="flex items-baseline space-x-4">
              <span className="text-[#D4A024]/80 text-sm md:text-base font-serif">PRÉNOM NOM</span>
              <span className="text-[#D4A024] text-lg md:text-xl font-serif tracking-wide flex-1 border-b-2 border-[#D4A024]/30 border-dashed pb-1">
                {member.nom_complet.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberCard;
