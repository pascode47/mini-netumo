import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { TargetListComponent } from './components/target-list/target-list.component';
import { AlertHistoryComponent } from './components/alert-history/alert-history.component';

export const routes: Routes = [
    { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
    { path: 'dashboard', component: DashboardComponent },
    { path: 'targets', component: TargetListComponent },
    { path: 'alerts', component: AlertHistoryComponent }
];
