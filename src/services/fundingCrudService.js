import { createSupabaseCrudService } from './baseSupabaseService.js';

export const fundingOpportunitiesService = createSupabaseCrudService('funding_opportunities');
export const fundingContactsService = createSupabaseCrudService('funding_contacts');
export const fundingApplicationsService = createSupabaseCrudService('funding_applications');
export const fundingDocumentLibraryService = createSupabaseCrudService('funding_document_library');
export const fundingAgreementsService = createSupabaseCrudService('funding_agreements');
export const fundingExpenseAllocationsService = createSupabaseCrudService('funding_expense_allocations');
export const fundingReportsService = createSupabaseCrudService('funding_reports');
export const fundingProjectJournalService = createSupabaseCrudService('funding_project_journal');
export const funderAccountsService = createSupabaseCrudService('funder_accounts');
export const funderAccessLogsService = createSupabaseCrudService('funder_access_logs');
