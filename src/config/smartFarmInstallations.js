/**
 * Installations SIMULÉES par zone de la ferme (Smart Farm).
 *
 * Les appareils qui ne se posent pas sur un animal/lot/parcelle mais dans une
 * ZONE : caméras & sécurité, forage & eau, énergie, chambre froide, serre,
 * rucher, bassins. On les montre là où ils vivent réellement, avec leurs
 * relevés, comme s'ils étaient installés. Valeurs simulées, remplacées par les
 * vrais relevés au branchement (même forme que les capteurs des fiches).
 */

export function buildFarmInstallations() {
  return [
    {
      zone: 'Sécurité & périmètre', icon: 'shield',
      devices: [
        { label: 'Caméra solaire 4G · Entrée', tech: '4G', kind: 'camera', etat: 'ras', readings: [{ icon: 'camera', label: 'Surveillance', value: 'Active', tone: 'good' }] },
        { label: 'Caméra solaire 4G · Parc bétail', tech: '4G', kind: 'camera', etat: 'alerte', alert: { severity: 'urgence', message: 'Mouvement détecté au parc', action: 'Ouvrir le flux et vérifier' }, readings: [{ icon: 'camera', label: 'Détection', value: 'Mouvement', tone: 'bad' }] },
        { label: 'Portail connecté', tech: '4G', kind: 'valve', etat: 'ras', readings: [{ icon: 'power', label: 'Portail', value: 'Fermé', tone: 'good' }] },
        { label: 'Clôture électrique', tech: 'RS485', kind: 'silo', etat: 'ras', readings: [{ icon: 'gauge', label: 'Tension', value: '8,2 kV', tone: 'good' }] },
      ],
    },
    {
      zone: 'Forage & château d’eau', icon: 'water',
      devices: [
        { label: 'Sonde niveau forage', tech: 'RS485', kind: 'silo', etat: 'ras', readings: [{ icon: 'gauge', label: 'Niveau', value: '72 %', tone: 'good' }] },
        { label: 'Contrôleur pompe 4G', tech: '4G', kind: 'valve', etat: 'ras', readings: [{ icon: 'power', label: 'Pompe', value: 'En marche', tone: 'good' }] },
        { label: 'Débitmètre', tech: 'RS485', kind: 'eau', etat: 'ras', readings: [{ icon: 'waves', label: 'Débit', value: '5,4 m³/h', tone: 'neutral' }] },
        { label: 'Capteur de pression', tech: 'RS485', kind: 'silo', etat: 'ras', readings: [{ icon: 'gauge', label: 'Pression', value: '2,4 bar', tone: 'good' }] },
      ],
    },
    {
      zone: 'Énergie', icon: 'energy',
      devices: [
        { label: 'Compteur triphasé', tech: 'RS485', kind: 'energy', etat: 'ras', readings: [{ icon: 'zap', label: 'Conso', value: '6,1 kW', tone: 'neutral' }] },
        { label: 'Compteur solaire', tech: 'RS485', kind: 'energy', etat: 'ras', readings: [{ icon: 'zap', label: 'Production', value: '4,3 kW', tone: 'good' }] },
        { label: 'Contrôleur de batterie', tech: 'RS485', kind: 'battery', etat: 'ras', readings: [{ icon: 'battery', label: 'Batterie', value: '64 %', tone: 'neutral' }] },
      ],
    },
    {
      zone: 'Chambre froide & magasin', icon: 'cold',
      devices: [
        { label: 'Alarme chambre froide 4G', tech: '4G', kind: 'cold', etat: 'ras', readings: [{ icon: 'temp', label: 'Froid', value: '3,8 °C', tone: 'good' }] },
        { label: 'Capteur porte magasin', tech: '4G', kind: 'valve', etat: 'ras', readings: [{ icon: 'power', label: 'Porte', value: 'Fermée', tone: 'good' }] },
        { label: 'Capteur humidité stockage', tech: 'RS485', kind: 'climat', etat: 'ras', readings: [{ icon: 'drop', label: 'Humidité', value: '58 %', tone: 'neutral' }] },
      ],
    },
    {
      zone: 'Serre', icon: 'greenhouse',
      devices: [
        { label: 'Capteur climat serre', tech: 'RS485', kind: 'climat', etat: 'ras', readings: [{ icon: 'temp', label: 'Temp.', value: '27 °C', tone: 'good' }, { icon: 'drop', label: 'Humidité', value: '68 %', tone: 'neutral' }] },
        { label: 'Capteur CO₂', tech: 'RS485', kind: 'climat', etat: 'ras', readings: [{ icon: 'wind', label: 'CO₂', value: '900 ppm', tone: 'neutral' }] },
      ],
    },
    {
      zone: 'Rucher', icon: 'bee',
      devices: [
        { label: 'Balance de ruche 4G', tech: '4G', kind: 'pesee', etat: 'ras', readings: [{ icon: 'scale', label: 'Poids', value: '38 kg', tone: 'neutral' }, { icon: 'activity', label: 'Miel/j', value: '+0,6 kg', tone: 'good' }] },
        { label: 'Caméra rucher 4G', tech: '4G', kind: 'camera', etat: 'ras', readings: [{ icon: 'camera', label: 'Surveillance', value: 'RAS', tone: 'good' }] },
      ],
    },
    {
      zone: 'Bassins (pisciculture)', icon: 'fish',
      devices: [
        { label: 'Capteur oxygène dissous', tech: 'RS485', kind: 'eau', etat: 'alerte', alert: { severity: 'critique', message: 'Oxygène bas (3,6 mg/L)', action: 'Activer l’aération du bassin' }, readings: [{ icon: 'waves', label: 'O₂ dissous', value: '3,6 mg/L', tone: 'bad' }] },
        { label: 'Capteur température eau', tech: 'RS485', kind: 'cold', etat: 'ras', readings: [{ icon: 'temp', label: 'Eau', value: '26 °C', tone: 'neutral' }] },
        { label: 'Sonde pH', tech: 'RS485', kind: 'silo', etat: 'ras', readings: [{ icon: 'gauge', label: 'pH', value: '7,2', tone: 'good' }] },
      ],
    },
  ];
}

export function installationsSummary(zones = buildFarmInstallations()) {
  const devices = zones.flatMap((z) => z.devices);
  return {
    zones: zones.length,
    devices: devices.length,
    alertes: devices.filter((d) => d.etat === 'alerte').length,
  };
}
