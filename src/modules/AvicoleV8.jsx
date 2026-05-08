import AvicoleV7 from './AvicoleV7.jsx';

export default function AvicoleV8(props) {
  const refreshProductionAfter = async (action) => {
    const result = await action?.();
    await props.onRefreshProduction?.();
    return result;
  };

  const refreshLotsAfter = async (action) => {
    const result = await action?.();
    await props.onRefresh?.();
    return result;
  };

  const wrappedProps = {
    ...props,
    onCreateProduction: (payload) => refreshProductionAfter(() => props.onCreateProduction?.(payload)),
    onUpdateProduction: (id, payload) => refreshProductionAfter(() => props.onUpdateProduction?.(id, payload)),
    onDeleteProduction: (id) => refreshProductionAfter(() => props.onDeleteProduction?.(id)),
    onCreate: (payload) => refreshLotsAfter(() => props.onCreate?.(payload)),
    onUpdate: (id, payload) => refreshLotsAfter(() => props.onUpdate?.(id, payload)),
    onDelete: (id) => refreshLotsAfter(() => props.onDelete?.(id)),
  };

  return (
    <div className="avicole-mobile-fix space-y-6">
      <style>{`@media (max-width: 640px){.avicole-mobile-fix .rounded-2xl{border-radius:18px}.avicole-mobile-fix table{font-size:12px}.avicole-mobile-fix th,.avicole-mobile-fix td{padding-left:10px!important;padding-right:10px!important}.avicole-mobile-fix .text-2xl{font-size:1.35rem}.avicole-mobile-fix .grid{gap:.75rem}.avicole-mobile-fix .overflow-x-auto{max-width:100vw}}`}</style>
      <AvicoleV7 {...wrappedProps} />
    </div>
  );
}
