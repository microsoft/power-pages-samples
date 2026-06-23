import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

// Standalone bootstrap — no NgModule, no router. The whole sample is one
// AppComponent that talks to one injectable FileService.
bootstrapApplication(AppComponent).catch(err => console.error(err));
