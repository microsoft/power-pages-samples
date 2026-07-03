import { NgModule } from '@angular/core';
import { InventoryRoutingModule } from './inventory-routing.module';
import { InventoryComponent } from './inventory.component';

@NgModule({
  imports: [
    InventoryRoutingModule,
    InventoryComponent
  ]
})
export class InventoryModule { }
