import { NgModule } from '@angular/core';
import { SalesLeadsRoutingModule } from './sales-leads-routing.module';
import { SalesLeadsComponent } from './sales-leads.component';

@NgModule({
  imports: [
    SalesLeadsRoutingModule,
    SalesLeadsComponent
  ]
})
export class SalesLeadsModule { }
