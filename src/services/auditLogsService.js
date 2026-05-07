import { createSupabaseCrudService } from './baseSupabaseService';
export const auditLogsService = createSupabaseCrudService('audit_logs');
