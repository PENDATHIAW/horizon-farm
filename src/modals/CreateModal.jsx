import EditModal from './EditModal';

export default function CreateModal(props) {
  return <EditModal {...props} title={props.title || 'Creer un element'} submitLabel={props.submitLabel || 'Creer'} />;
}


