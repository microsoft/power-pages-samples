import { NgModule } from '@angular/core';
import { CustomersRoutingModule } from './customers-routing.module';
import { CustomersComponent } from './customers.component';

@NgModule({
  imports: [
    CustomersRoutingModule,
    CustomersComponent
  ]
})
export class CustomersModule { }
