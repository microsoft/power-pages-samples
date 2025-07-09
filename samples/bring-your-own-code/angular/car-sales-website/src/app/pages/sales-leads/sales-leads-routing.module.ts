import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SalesLeadsComponent } from './sales-leads.component';

const routes: Routes = [
    { path: '', component: SalesLeadsComponent }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class SalesLeadsRoutingModule { }
