import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DataService, Sale } from '../../services/data.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-sales',
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule
  ]
})
export class SalesComponent implements OnInit {
  sales$!: Observable<Sale[]>;
  displayedColumns: string[] = ['id', 'car_id', 'customer_id', 'date', 'price', 'salesperson', 'actions'];

  constructor(private dataService: DataService) { }

  ngOnInit(): void {
    this.sales$ = this.dataService.getSales();
  }
}
