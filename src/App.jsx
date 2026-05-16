import { lazy, Suspense, useMemo, useState } from 'react';
import {
  BarChart3,
  Beef,
  Bell,
  Bird,
  Bot,
  BrainCircuit,
  Calculator,
  ClipboardList,
  DollarSign,
  FolderOpen,
  GitBranch,
  Goal,
  Handshake,
  HeartPulse,
  LayoutDashboard,
  PiggyBank,
  Scale,
  Settings,
  ShoppingCart,
  Sprout,
  Tractor,
  UserCog,
  UserRound,
  Warehouse,
  Wifi,
  Wrench,
} from 'lucide-react';
import AppNotificationManager from './components/AppNotificationManager';
import AssistantPanel from './components/AssistantPanel';
import ErrorBoundary from './components/ErrorBoundary';
import { useAuth } from './context/AuthContext';
import { useAppData } from './context/AppContext';
import useCrudModule from './hooks/useCrudModule';
import useLiveWeather from './hooks/useLiveWeather';
import useOnlineStatus from './hooks/useOnlineStatus';
import AppLayout from './layouts/AppLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';

const MODULES = {
  dashboard: lazy(() => import('./modules/DashboardV2')),
  assistant_erp: lazy(() => import('./modules/AssistantERPV2')),
  centre_ia: lazy(() => import('./modules/CentreIA')),
  objectifs_croissance: lazy(() => import('./modules/ObjectifsCroissance')),
  animaux: lazy(() => import('./modules/AnimauxV2')),
  avicole: lazy(() => import('./modules/AvicoleV10')),
  sante: lazy(() => import('./modules/SanteV7')),
  finances: lazy(() => import('./modules/FinancesV11')),
  comptabilite: lazy(() => import('./modules/ComptabiliteV6')),
  investissements: lazy(() => import('./modules/InvestissementsV8')),
  impact_business: lazy(() => import('./modules/ImpactBusiness')),
  stock: lazy(() => import('./modules/StocksV4')),
  clients: lazy(() => import('./modules/ClientsReadable')),
  fournisseurs: lazy(() => import('./modules/Fournisseurs')),
  tracabilite: lazy(() => import('./modules/Tracabilite')),
  alertes: lazy(() => import('./modules/AlertesCenterTechnical')),
  sync: lazy(() => import('./modules/SyncActivityCenter')),
  sync_activity: lazy(() => import('./modules/SyncActivityCenter')),
  cultures: lazy(() => import('./modules/CulturesV4')),
  smartfarm: lazy(() => import('./modules/SmartFarm')),
  ventes: lazy(() => import('./modules/VentesV3')),
  documents: lazy(() => import('./modules/DocumentsV2')),
  taches: lazy(() => import('./modules/TachesTechnical')),
  rh: lazy(() => import('./modules/RH')),
  rapports: lazy(() => import('./modules/Rapports')),
  equipements: lazy(() => import('./modules/Equipements')),
  audit_logs: lazy(() => import('./modules/SyncActivityCenter')),
  gestion_systeme: lazy(() => import('./modules/GestionSysteme')),
};

export default function App() {
  const [active, setActive] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const { user, loading: authLoading, signOut } = useAuth();
  const { dataMap, refreshModule, flushOfflineQueue } = useAppData();
  const { online, lastOnlineAt } = useOnlineStatus();
  const { weather: liveMeteo, loading: weatherLoading, source: weatherSource } = useLiveWeather();

  const animauxCrud = useCrudModule('animaux');
  const avicoleCrud = useCrudModule('avicole');
  const santeCrud = useCrudModule('sante');
  const veterinairesCrud = useCrudModule('veterinaires');
  const financesCrud = useCrudModule('finances');
  const investissementsCrud = useCrudModule('investissements');
  const businessPlansCrud = useCrudModule('business_plans');
  const bpInvestmentLinesCrud = useCrudModule('bp_investment_lines');