import RHPeopleTeams from '../../RHPeopleTeams.jsx';
import RhPayrollFinanceSyncPanel from '../../RhPayrollFinanceSyncPanel.jsx';

export default function PersonnelPaieTab({ rhProps, data }) {
  return (
    <div className="space-y-8">
      <RHPeopleTeams {...rhProps} />
      <div className="border-t border-[#eadcc2] pt-6">
        <RhPayrollFinanceSyncPanel {...rhProps} team={data.team} />
      </div>
    </div>
  );
}
