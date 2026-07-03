import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalesLeadsComponent } from './sales-leads.component';

describe('SalesLeadsComponent', () => {
  let component: SalesLeadsComponent;
  let fixture: ComponentFixture<SalesLeadsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesLeadsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalesLeadsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
