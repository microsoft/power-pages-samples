import { Component, OnInit } from '@angular/core';
import { DataService, Car, Sale, Metric } from '../../services/data.service';
import { Observable, combineLatest, map } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatProgressBarModule,
    MatIconModule
  ]
})
export class DashboardComponent implements OnInit {
  availableCars$!: Observable<Car[]>;
  soldCars$!: Observable<Car[]>;
  pendingCars$!: Observable<Car[]>;
  totalRevenue$!: Observable<number>;
  recentSales$!: Observable<Sale[]>;

  // New metric observables
  inventoryMetric$!: Observable<Metric>;
  monthlySalesMetric$!: Observable<Metric>;
  totalCustomersMetric$!: Observable<Metric>;
  growthRateMetric$!: Observable<Metric>;

  constructor(private dataService: DataService) { }

  ngOnInit(): void {
    // Get cars by status
    this.availableCars$ = this.dataService.getCars().pipe(
      map(cars => cars.filter(car => car.status === 'available'))
    );

    this.soldCars$ = this.dataService.getCars().pipe(
      map(cars => cars.filter(car => car.status === 'sold'))
    );

    this.pendingCars$ = this.dataService.getCars().pipe(
      map(cars => cars.filter(car => car.status === 'pending'))
    );

    // Calculate total revenue from sales
    this.totalRevenue$ = this.dataService.getSales().pipe(
      map(sales => sales.reduce((total, sale) => total + sale.price, 0))
    );

    // Get recent sales
    this.recentSales$ = this.dataService.getSales();

    // Initialize metrics
    this.inventoryMetric$ = this.dataService.getInventoryMetric();
    this.monthlySalesMetric$ = this.dataService.getMonthlySalesMetric();
    this.totalCustomersMetric$ = this.dataService.getTotalCustomersMetric();
    this.growthRateMetric$ = this.dataService.getGrowthRateMetric();
  }

  getProgressColor(metricLabel: string): string {
    switch (metricLabel) {
      case 'Total Inventory':
        return 'primary'; // Blue
      case 'Monthly Sales':
        return 'warn'; // Red
      case 'Total Customers':
        return 'accent'; // Green
      case 'Growth Rate':
        return 'orange'; // Custom orange color (defined in SCSS)
      default:
        return 'primary';
    }
  }

  formatValue(value: number, label: string): string {
    if (label === 'Monthly Sales') {
      return `$${value.toLocaleString()}`;
    } else if (label === 'Growth Rate') {
      return `+${value}%`;
    }
    return value.toString();
  }
}
