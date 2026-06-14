import TracabiliteV2 from '../../TracabiliteV2.jsx';

export default function RegistreTracabiliteTab({ shared, traceRows, traceCrud, props }) {
  return (
    <TracabiliteV2
      {...shared}
      rows={traceRows}
      onCreate={props.onCreateTrace || traceCrud.create}
      onUpdate={props.onUpdateTrace || traceCrud.update}
      onDelete={props.onDeleteTrace || traceCrud.remove}
      onRefresh={props.onRefreshTrace || traceCrud.refresh}
    />
  );
}
