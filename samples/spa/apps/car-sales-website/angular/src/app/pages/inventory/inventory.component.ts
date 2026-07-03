import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DataService, Car } from '../../services/data.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule
  ]
})
export class InventoryComponent implements OnInit {
  cars$!: Observable<Car[]>;
  displayedColumns: string[] = ['id', 'make', 'model', 'year', 'price', 'status', 'actions'];

  constructor(private dataService: DataService) { }

  ngOnInit(): void {
    this.cars$ = this.dataService.getCars();
  }
}
