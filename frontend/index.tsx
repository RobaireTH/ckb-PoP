 // Critical for JIT
import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { inject } from '@vercel/analytics';
import { AppComponent } from './src/app.component';
import { routes } from './src/app.routes';

// Initialize Vercel Analytics
inject();

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withHashLocation())
  ]
}).catch(err => console.error(err));

