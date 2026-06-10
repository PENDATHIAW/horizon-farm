import CulturesV3 from '../CulturesV3.jsx';

/** Registre parcelles, cultures, variétés — pas de récolte ni intrants ici (onglets dédiés). */
export default function CulturesParcellesHub(props) {
  return (
    <CulturesV3
      {...props}
      embeddedMode
      showWorkflowBridge={false}
      showSaleBridge={false}
    />
  );
}
