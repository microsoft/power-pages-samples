import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DataService, SalesLead } from '../../services/data.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-sales-leads',
  templateUrl: './sales-leads.component.html',
  styleUrls: ['./sales-leads.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule
  ]
})
export class SalesLeadsComponent implements OnInit {
  leads$!: Observable<SalesLead[]>;
  displayedColumns: string[] = ['id', 'name', 'email', 'phone', 'interested_in', 'status', 'actions'];

  constructor(private dataService: DataService) { }

  ngOnInit(): void {
    this.leads$ = this.dataService.getSalesLeads();
  }
}
