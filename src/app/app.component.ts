import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { StorageService } from './services/storage.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  constructor(
    private storageService: StorageService  // Usar StorageService
  ) {}

  async ngOnInit() {
    console.log('🚀 Inicializando aplicación...');
    console.log('✅ Aplicación lista con datos de prueba');
    
    // Verificar que hay datos
    const medicamentos = await this.storageService.getMedicamentos();
    console.log('💊 Medicamentos cargados:', medicamentos);
  }
}