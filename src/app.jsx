import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { useAuth } from '@/lib/auth';
import { findNavItem } from '@/lib/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { LoadingState, EmptyState } from '@/components/ui/panel';
import { LoginPage } from '@/pages/login';
import { STAGES } from '@/pages/production/stages';
const DashboardPage = lazy(() => import('@/pages/dashboard'));
const OrdersPage = lazy(() => import('@/pages/orders'));
const DyeingProgramsPage = lazy(() => import('@/pages/dyeing-programs'));
const GreigeStockPage = lazy(() => import('@/pages/stock/greige'));
const YarnStockPage = lazy(() => import('@/pages/stock/yarn'));
const RecipesPage = lazy(() => import('@/pages/recipes'));
const StageEntryPage = lazy(() => import('@/pages/production/stage-entry'));
const InProgressPage = lazy(() => import('@/pages/production/in-progress'));
const TrackerPage = lazy(() => import('@/pages/production/tracker'));
const RecordsPage = lazy(() => import('@/pages/production/records'));
const ReportPages = lazy(() => import('@/pages/reports'));
const ImportsRouter = lazy(() => import('@/pages/imports'));
const GsmPage = lazy(() => import('@/pages/tools/gsm'));
const QrPage = lazy(() => import('@/pages/tools/qr'));
const FabricMappingPage = lazy(() => import('@/pages/tools/fabric-mapping'));
const RefreshCachePage = lazy(() => import('@/pages/tools/refresh-cache'));
function RequireAuth({ children }) {
    const { isAuthenticated } = useAuth();
    const location = useLocation();
    if (!isAuthenticated)
        return <Navigate to="/login" replace state={{ from: location.pathname }}/>;
    return children;
}
function Guard({ children }) {
    const { can } = useAuth();
    const location = useLocation();
    const item = findNavItem(location.pathname);
    if (item && !can(item)) {
        return <EmptyState title="Access restricted" description="Your account does not have permission to open this module. Contact your administrator if you need access."/>;
    }
    return <Suspense fallback={<LoadingState />}>{children}</Suspense>;
}
export function App() {
    const { isAuthenticated } = useAuth();
    return (<BrowserRouter>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace/> : <LoginPage />}/>
        <Route element={<RequireAuth>
              <AppShell />
            </RequireAuth>}>
          <Route index element={<Guard><DashboardPage /></Guard>}/>
          <Route path="orders/all" element={<Guard><OrdersPage key="all" menuKey="SearchOrdersPageKey"/></Guard>}/>
          <Route path="orders/domestic" element={<Guard><OrdersPage key="dom" menuKey="DomesticPendingOrdersPageKey"/></Guard>}/>
          <Route path="orders/brands" element={<Guard><OrdersPage key="brand" menuKey="BrandsPendingOrdersPageKey"/></Guard>}/>
          <Route path="dyeing-programs" element={<Guard><DyeingProgramsPage /></Guard>}/>
          <Route path="stock/greige" element={<Guard><GreigeStockPage /></Guard>}/>
          <Route path="stock/yarn" element={<Guard><YarnStockPage /></Guard>}/>
          <Route path="recipes" element={<Guard><RecipesPage /></Guard>}/>
          {STAGES.map((stage) => (<Route key={stage.slug} path={`production/${stage.slug}`} element={<Guard><StageEntryPage key={stage.slug} stage={stage}/></Guard>}/>))}
          <Route path="production/in-progress" element={<Guard><InProgressPage /></Guard>}/>
          <Route path="production/tracker" element={<Guard><TrackerPage /></Guard>}/>
          <Route path="production/records" element={<Guard><RecordsPage /></Guard>}/>
          <Route path="reports/:report" element={<Guard><ReportPages /></Guard>}/>
          <Route path="imports/:kind" element={<Guard><ImportsRouter /></Guard>}/>
          <Route path="tools/gsm" element={<Guard><GsmPage /></Guard>}/>
          <Route path="tools/qr" element={<Guard><QrPage /></Guard>}/>
          <Route path="tools/fabric-mapping" element={<Guard><FabricMappingPage /></Guard>}/>
          <Route path="tools/refresh-cache" element={<Guard><RefreshCachePage /></Guard>}/>
          <Route path="*" element={<EmptyState title="Page not found" description="The page you are looking for does not exist."/>}/>
        </Route>
      </Routes>
    </BrowserRouter>);
}
