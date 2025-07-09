import { NgModule } from '@angular/core';
import { SalesRoutingModule } from './sales-routing.module';
import { SalesComponent } from './sales.component';

@NgModule({
  imports: [
    SalesRoutingModule,
    SalesComponent
  ]
})
export class SalesModule { }
