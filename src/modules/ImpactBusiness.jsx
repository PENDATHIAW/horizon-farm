import useCrudModule from '../hooks/useCrudModule';
import ImpactBusinessStrategicV4 from './ImpactBusinessStrategicV4.jsx';

export default function ImpactBusiness(props) {
  const culturesCrud = useCrudModule('cultures');
  const clientsCrud = useCrudModule('clients');
  const fournisseursCrud = useCrudModule('fournisseurs');
  const equipementsCrud = useCrudModule('equipements');

  return (
    <ImpactBusinessStrategicV4
      {...props}
      cultures={props.cultures?.length ? props.cultures : culturesCrud.rows}
      clients={props.clients?.length ? props.clients : clientsCrud.rows}
      fournisseurs={props.fournisseurs?.length ? props.fournisseurs : fournisseursCrud.rows}
      equipements={props.equipements?.length ? props.equipements : equipementsCrud.rows}
    />
  );
}
