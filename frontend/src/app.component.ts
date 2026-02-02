import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { BottomNavComponent } from './components/bottom-nav/bottom-nav.component';
import { ToastComponent } from './components/toast/toast.component';
import { OfflineService } from './services/offline.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, BottomNavComponent, ToastComponent],
  templateUrl: './app.component.html'
})
export class AppComponent {
  offlineService = inject(OfflineService);
}