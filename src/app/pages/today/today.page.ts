import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonBadge,
  IonChip,
  IonGrid,
  IonRow,
  IonCol,
  IonText,
  IonRefresher,
  IonRefresherContent,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  checkmarkCircle, 
  closeCircle, 
  time, 
  restaurant,
  alarm,
  medkit,
  checkmarkDone
} from 'ionicons/icons';
import { StorageService } from 'src/app/services/storage.service';

@Component({
  selector: 'app-today',
  templateUrl: 'today.page.html',
  styleUrls: ['today.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonIcon,
    IonBadge,
    IonChip,
    IonGrid,
    IonRow,
    IonCol,
    IonText,
    IonRefresher,
    IonRefresherContent
  ],
})
export class TodayPage implements OnInit {
  tomastoday: any[] = [];
  proximaToma: any = null;
  saludo: string = '';
  fechatoday: string = '';
  estadisticastoday = {
    total: 0,
    tomadas: 0,
    pendientes: 0,
    omitidas: 0
  };

  constructor(
    private storageService: StorageService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    // Registrar iconos
    addIcons({
      checkmarkCircle,
      closeCircle,
      time,
      restaurant,
      alarm,
      medkit,
      checkmarkDone
    });
  }

  async ngOnInit() {
    this.configurarFechaYSaludo();
    await this.cargarTomasDelDia();
  }

  configurarFechaYSaludo() {
    const ahora = new Date();
    const hora = ahora.getHours();
    
    // Saludo según la hora
    if (hora < 12) {
      this.saludo = 'Buenos días';
    } else if (hora < 20) {
      this.saludo = 'Buenas tardes';
    } else {
      this.saludo = 'Buenas noches';
    }

    // Fecha formateada
    const opciones: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    this.fechatoday = ahora.toLocaleDateString('es-ES', opciones);
    // Capitalizar primera letra
    this.fechatoday = this.fechatoday.charAt(0).toUpperCase() + this.fechatoday.slice(1);
  }

  async cargarTomasDelDia() {
    try {
      this.tomastoday = await this.storageService.getTomastoday();
      this.calcularEstadisticas();
      this.encontrarProximaToma();
    } catch (error) {
      console.error('Error cargando tomas:', error);
    }
  }

  calcularEstadisticas() {
    this.estadisticastoday = {
      total: this.tomastoday.length,
      tomadas: this.tomastoday.filter(t => t.estado === 'tomada').length,
      pendientes: this.tomastoday.filter(t => t.estado === 'pendiente').length,
      omitidas: this.tomastoday.filter(t => t.estado === 'omitida').length
    };
  }

  encontrarProximaToma() {
    const ahora = new Date();
    const horaActual = ahora.getHours() * 60 + ahora.getMinutes(); // Convertir a minutos

    // Buscar la próxima toma pendiente
    this.proximaToma = this.tomastoday
      .filter(t => t.estado === 'pendiente')
      .find(t => {
        const [horas, minutos] = t.hora.split(':').map(Number);
        const horaTomaEnMinutos = horas * 60 + minutos;
        return horaTomaEnMinutos >= horaActual;
      });

    // Si no hay más tomas today, tomar la primera pendiente de mañana
    if (!this.proximaToma && this.estadisticastoday.pendientes > 0) {
      this.proximaToma = this.tomastoday.find(t => t.estado === 'pendiente');
    }
  }

  async marcarComoTomada(toma: any) {
    const alert = await this.alertController.create({
      header: 'Confirmar toma',
      message: `¿Has tomado ${toma.medicamento_nombre} ${toma.medicamento_dosis}?`,
      buttons: [
        {
          text: 'No',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Sí, tomado',
          cssClass: 'primary',
          handler: async () => {
            await this.storageService.marcarTomada(toma.id);
            await this.cargarTomasDelDia();
            await this.mostrarToast('✅ Medicamento marcado como tomado');
          }
        }
      ]
    });

    await alert.present();
  }

  async marcarComoOmitida(toma: any) {
    const alert = await this.alertController.create({
      header: 'Omitir toma',
      message: `¿Estás seguro de que quieres omitir ${toma.medicamento_nombre}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Sí, omitir',
          cssClass: 'danger',
          handler: async () => {
            await this.storageService.marcarOmitida(toma.id);
            await this.cargarTomasDelDia();
            await this.mostrarToast('⚠️ Medicamento omitido', 'warning');
          }
        }
      ]
    });

    await alert.present();
  }

  async mostrarToast(mensaje: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2000,
      position: 'bottom',
      color: color
    });
    await toast.present();
  }

  async handleRefresh(event: any) {
    await this.cargarTomasDelDia();
    event.target.complete();
  }

  getIconoEstado(estado: string) {
    switch(estado) {
      case 'tomada': return 'checkmark-circle';
      case 'omitida': return 'close-circle';
      default: return 'time';
    }
  }

  getColorEstado(estado: string) {
    switch(estado) {
      case 'tomada': return 'success';
      case 'omitida': return 'danger';
      default: return 'medium';
    }
  }

  estaRetrasada(hora: string): boolean {
    const ahora = new Date();
    const [horas, minutos] = hora.split(':').map(Number);
    const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
    const horaToma = horas * 60 + minutos;
    return horaToma < horaActual;
  }
}