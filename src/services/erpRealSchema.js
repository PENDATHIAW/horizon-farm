export const ERP_REAL_SCHEMA = {
  accounting_accounts: ['id','code','name','type','category','normal_balance','description','is_active','owner_user_id','created_at','updated_at'],
  accounting_budgets: ['id','period','category','budget_amount','actual_amount','status','notes','owner_user_id','created_at','updated_at'],
  accounting_closures: ['id','period','closure_type','status','closed_at','summary','owner_user_id','created_at','updated_at'],
  accounting_documents: ['id','transaction_id','entry_id','label','document_type','file_url','uploaded_at','owner_user_id','created_at','updated_at'],
  accounting_entries: ['id','entry_date','journal','reference','source_module','source_id','label','status','total_debit','total_credit','validated_at','owner_user_id','created_at','updated_at'],
  accounting_entry_lines: ['id','entry_id','account_id','account_code','label','debit','credit','owner_user_id','created_at','updated_at'],
  alert_events: ['id','rule_key','module','severity','title','message','status','related_id','occurred_at','resolved_at','owner_user_id','created_at','updated_at'],
  alert_rules: ['id','key','module','label','severity','enabled','threshold','channel_erp','channel_whatsapp','frequency','owner_user_id','created_at','updated_at'],
  alertes: ['id','type','message','niveau','envoye','date'],
  alertes_center: ['id','title','message','module'],
};

export const ERP_REAL_TABLES = Object.keys(ERP_REAL_SCHEMA);

export const ERP_REAL_MODULES = {
  comptabilite: ['accounting_accounts','accounting_budgets','accounting_closures','accounting_documents','accounting_entries','accounting_entry_lines'],
  alertes: ['alert_events','alert_rules','alertes','alertes_center'],
};
