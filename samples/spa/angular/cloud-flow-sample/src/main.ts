import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

// One standalone component, no router, no NgModules. The app exists only to
// demonstrate the cloud-flow call in cloud-flow.service.ts.
bootstrapApplication(AppComponent).catch(err => console.error(err));
