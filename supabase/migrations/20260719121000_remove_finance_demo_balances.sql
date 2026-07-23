begin;

-- Remet à zéro uniquement les comptes d'exemple restés strictement inchangés
-- et sans aucun mouvement enregistré.
update public.treasury_accounts account
set solde_initial = 0,
    solde_actuel = 0,
    updated_at = now()
where not exists (
  select 1 from public.treasury_movements movement where movement.account_id = account.id
)
and (
  (account.id = 'TRES-CAISSE' and account.solde_initial = 350000 and account.solde_actuel = 350000)
  or (account.id = 'TRES-BANQUE' and account.solde_initial = 1250000 and account.solde_actuel = 1250000)
  or (account.id = 'TRES-WAVE' and account.solde_initial = 485000 and account.solde_actuel = 485000)
  or (account.id = 'TRES-OM' and account.solde_initial = 320000 and account.solde_actuel = 320000)
  or (account.id = 'TRES-FREE' and account.solde_initial = 90000 and account.solde_actuel = 90000)
  or (account.id = 'TRES-CARTE' and account.solde_initial = 180000 and account.solde_actuel = 180000)
);

delete from public.accounting_budgets
where (id = 'BUD-2025-ALIM' and period = '2025-07' and budget_amount = 650000 and actual_amount = 120000)
   or (id = 'BUD-2025-SANTE' and period = '2025-07' and budget_amount = 180000 and actual_amount = 45000)
   or (id = 'BUD-2025-CULT' and period = '2025-07' and budget_amount = 420000 and actual_amount = 0)
   or (id = 'BUD-2025-SAL' and period = '2025-07' and budget_amount = 300000 and actual_amount = 225000);

delete from public.accounting_closures
where id = 'CLO-2025-06'
  and period = '2025-06'
  and status = 'brouillon';

commit;
