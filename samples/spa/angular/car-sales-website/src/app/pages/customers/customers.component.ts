import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DataService, Customer } from '../../services/data.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-customers',
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule
  ]
})
export class CustomersComponent implements OnInit {
  customers$!: Observable<Customer[]>;
  displayedColumns: string[] = ['id', 'name', 'email', 'phone', 'address', 'actions'];

  constructor(private dataService: DataService) { }

  ngOnInit(): void {
    this.customers$ = this.dataService.getCustomers();
  }
}
