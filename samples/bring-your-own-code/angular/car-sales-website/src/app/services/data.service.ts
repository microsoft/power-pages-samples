import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Car {
  id: number;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  color: string;
  vin: string;
  status: 'available' | 'sold' | 'pending';
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface SalesLead {
  id: number;
  name: string;
  email: string;
  phone: string;
  interested_in: string;
  status: 'new' | 'contacted' | 'qualified' | 'lost';
}

export interface Sale {
  id: number;
  car_id: number;
  customer_id: number;
  date: string;
  price: number;
  salesperson: string;
}

export interface Metric {
  value: number;
  percentage: number;
  target: number;
  label: string;
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private carsSubject = new BehaviorSubject<Car[]>([
    { id: 1, make: 'Toyota', model: 'Camry', year: 2020, price: 25000, mileage: 15000, color: 'Silver', vin: 'ABC123456789', status: 'available' },
    { id: 2, make: 'Honda', model: 'Accord', year: 2019, price: 23000, mileage: 20000, color: 'Black', vin: 'DEF123456789', status: 'available' },
    { id: 3, make: 'Ford', model: 'Mustang', year: 2021, price: 35000, mileage: 5000, color: 'Red', vin: 'GHI123456789', status: 'sold' },
    { id: 4, make: 'Chevrolet', model: 'Malibu', year: 2018, price: 18000, mileage: 30000, color: 'White', vin: 'JKL123456789', status: 'available' },
    { id: 5, make: 'BMW', model: '3 Series', year: 2022, price: 45000, mileage: 1000, color: 'Blue', vin: 'MNO123456789', status: 'pending' }
  ]);

  private customersSubject = new BehaviorSubject<Customer[]>([
    { id: 1, name: 'John Doe', email: 'john@example.com', phone: '123-456-7890', address: '123 Main St, Anytown, USA' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', phone: '456-789-0123', address: '456 Oak St, Somewhere, USA' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', phone: '789-012-3456', address: '789 Pine St, Nowhere, USA' },
  ]);

  private salesLeadsSubject = new BehaviorSubject<SalesLead[]>([
    { id: 1, name: 'Alice Brown', email: 'alice@example.com', phone: '234-567-8901', interested_in: 'SUV', status: 'new' },
    { id: 2, name: 'Charlie Davis', email: 'charlie@example.com', phone: '345-678-9012', interested_in: 'Sedan', status: 'contacted' },
    { id: 3, name: 'Eva Fisher', email: 'eva@example.com', phone: '567-890-1234', interested_in: 'Electric', status: 'qualified' },
  ]);

  private salesSubject = new BehaviorSubject<Sale[]>([
    { id: 1, car_id: 3, customer_id: 1, date: '2023-11-15', price: 33500, salesperson: 'Mike Wilson' },
    { id: 2, car_id: 5, customer_id: 2, date: '2023-12-01', price: 44000, salesperson: 'Sarah Taylor' },
  ]);

  getCars(): Observable<Car[]> {
    return this.carsSubject.asObservable();
  }

  getCustomers(): Observable<Customer[]> {
    return this.customersSubject.asObservable();
  }

  getSalesLeads(): Observable<SalesLead[]> {
    return this.salesLeadsSubject.asObservable();
  }

  getSales(): Observable<Sale[]> {
    return this.salesSubject.asObservable();
  }

  addCar(car: Car): void {
    const currentCars = this.carsSubject.getValue();
    const newId = Math.max(...currentCars.map(c => c.id), 0) + 1;
    this.carsSubject.next([...currentCars, { ...car, id: newId }]);
  }

  updateCar(updatedCar: Car): void {
    const currentCars = this.carsSubject.getValue();
    const index = currentCars.findIndex(car => car.id === updatedCar.id);
    if (index !== -1) {
      const updatedCars = [...currentCars];
      updatedCars[index] = updatedCar;
      this.carsSubject.next(updatedCars);
    }
  }

  deleteCar(id: number): void {
    const currentCars = this.carsSubject.getValue();
    this.carsSubject.next(currentCars.filter(car => car.id !== id));
  }

  addCustomer(customer: Customer): void {
    const currentCustomers = this.customersSubject.getValue();
    const newId = Math.max(...currentCustomers.map(c => c.id), 0) + 1;
    this.customersSubject.next([...currentCustomers, { ...customer, id: newId }]);
  }

  addSalesLead(lead: SalesLead): void {
    const currentLeads = this.salesLeadsSubject.getValue();
    const newId = Math.max(...currentLeads.map(l => l.id), 0) + 1;
    this.salesLeadsSubject.next([...currentLeads, { ...lead, id: newId }]);
  }

  addSale(sale: Sale): void {
    const currentSales = this.salesSubject.getValue();
    const newId = Math.max(...currentSales.map(s => s.id), 0) + 1;

    // Update car status to sold
    const currentCars = this.carsSubject.getValue();
    const carIndex = currentCars.findIndex(car => car.id === sale.car_id);
    if (carIndex !== -1) {
      const updatedCars = [...currentCars];
      updatedCars[carIndex] = { ...updatedCars[carIndex], status: 'sold' };
      this.carsSubject.next(updatedCars);
    }

    this.salesSubject.next([...currentSales, { ...sale, id: newId }]);
  }

  getInventoryMetric(): Observable<Metric> {
    return this.carsSubject.pipe(
      map(cars => {
        const inventory = cars.filter(car => car.status === 'available').length;
        return {
          value: inventory,
          percentage: 75, // 75% of target
          target: Math.round(inventory / 0.75),
          label: 'Total Inventory'
        };
      })
    );
  }

  getMonthlySalesMetric(): Observable<Metric> {
    return this.salesSubject.pipe(
      map(sales => {
        const monthlyTotal = sales.reduce((total, sale) => total + sale.price, 0);
        return {
          value: monthlyTotal,
          percentage: 85, // 85% of target
          target: Math.round(monthlyTotal / 0.85),
          label: 'Monthly Sales'
        };
      })
    );
  }

  getTotalCustomersMetric(): Observable<Metric> {
    return this.customersSubject.pipe(
      map(customers => {
        const total = customers.length;
        return {
          value: total,
          percentage: 65, // 65% of target
          target: Math.round(total / 0.65),
          label: 'Total Customers'
        };
      })
    );
  } getGrowthRateMetric(): Observable<Metric> {
    return of({
      value: 12.5, // +12.5%
      percentage: 90, // 90% of target
      target: Math.round(12.5 / 0.9),
      label: 'Growth Rate'
    });
  }
}
