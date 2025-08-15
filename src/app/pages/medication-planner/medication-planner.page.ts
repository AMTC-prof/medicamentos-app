import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonFab,
  IonFabButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonBadge,
  IonChip,
  IonAvatar,
  IonButtons,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  AlertController,
  ModalController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  add,
  medkit,
  time,
  create,
  trash,
  alarm,
  calendar,
  colorPalette,
  restaurant
} from 'ionicons/icons';
import { Horario, Medicamento, StorageService } from 'src/app/services/storage.service';
import { FormsModule } from '@angular/forms';


interface MedicationDisplay extends Medicamento {
  schedules?: Horario[];
  scheduleCount?: number;
  scheduleText?: string;
}

@Component({
  selector: 'app-medications',
  templateUrl: 'medication-planner.page.html',
  styleUrls: ['medication-planner.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonIcon,
    IonFab,
    IonFabButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonBadge,
    IonChip,
    IonAvatar,
    IonButtons,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    FormsModule
  ]
})
export class MedicationPlannerPage implements OnInit {
  medications: MedicationDisplay[] = [];
  filteredMedications: MedicationDisplay[] = [];
  searchTerm: string = '';
  selectedSegment: string = 'active';

  constructor(
    private storageService: StorageService,
    private alertController: AlertController,
    private modalController: ModalController,
    private toastController: ToastController
  ) {
    addIcons({
      add,
      medkit,
      time,
      create,
      trash,
      alarm,
      calendar,
      colorPalette,
      restaurant
    });
  }

  async ngOnInit() {
    await this.loadMedications();
  }

  async ionViewWillEnter() {
    // Reload medications when returning to this tab
    await this.loadMedications();
  }

 async loadMedications() {
    try {
      const meds = await this.storageService.getMedicamentos();
      
      // Load schedules for each medication and add display properties
      this.medications = await Promise.all(meds.map(async (med) => {
        const schedules = await this.storageService.getHorarios(med.id);
        return {
          ...med,
          schedules: schedules,
          scheduleCount: schedules.length,
          scheduleText: this.getScheduleText(schedules)
        };
      }));
      
      this.filterMedications();
    } catch (error) {
      console.error('Error loading medications:', error);
    }
  }

  getScheduleText(schedules: Horario[]): string {
    if (schedules.length === 0) return 'Sin horarios';
    if (schedules.length === 1) return `${schedules[0].hora}`;
    if (schedules.length === 2) return `${schedules[0].hora} y ${schedules[1].hora}`;
    return `${schedules.length} tomas al día`;
  }

  filterMedications() {
    let filtered = this.medications;

    // Filter by search term
    if (this.searchTerm) {
      filtered = filtered.filter(med =>
        med.nombre.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        med.descripcion?.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    // Filter by segment (active/all)
    if (this.selectedSegment === 'active') {
      filtered = filtered.filter(med => med.activo);
    }

    this.filteredMedications = filtered;
  }

  onSearchChange(event: any) {
    this.searchTerm = event.detail.value || '';
    this.filterMedications();
  }

  onSegmentChange(event: any) {
    this.selectedSegment = event.detail.value;
    this.filterMedications();
  }

  async openAddMedicationModal() {
    // For now, we'll use a simple alert
    // Later we'll create a proper modal component
    const alert = await this.alertController.create({
      header: 'Nuevo Medicamento',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Nombre del medicamento',
          attributes: {
            required: true
          }
        },
        {
          name: 'dose',
          type: 'text',
          placeholder: 'Dosis (ej: 500mg, 1 comprimido)'
        },
        {
          name: 'description',
          type: 'textarea',
          placeholder: 'Descripción (opcional)'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Siguiente',
          handler: async (data) => {
            if (!data.name) {
              await this.showToast('El nombre es obligatorio', 'warning');
              return false;
            }
            await this.addMedicationWithSchedule(data);
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  async addMedicationWithSchedule(medicationData: any) {
    // Add schedule times
    const alert = await this.alertController.create({
      header: 'Horarios de toma',
      message: `¿Cuándo debe tomarse ${medicationData.name}?`,
      inputs: [
        {
          name: 'time1',
          type: 'time',
          value: '08:00',
          label: 'Primera toma'
        },
        {
          name: 'time2',
          type: 'time',
          value: '',
          label: 'Segunda toma (opcional)'
        },
        {
          name: 'time3',
          type: 'time',
          value: '',
          label: 'Tercera toma (opcional)'
        },
        {
          name: 'withFood',
          type: 'checkbox',
          label: 'Tomar con comida',
          value: 'withFood',
          checked: false
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Guardar',
          handler: async (scheduleData) => {
            await this.saveMedication(medicationData, scheduleData);
          }
        }
      ]
    });

    await alert.present();
  }

  async saveMedication(medicationData: any, scheduleData: any) {
    try {
      // Create medication
      const medication: Medicamento = {
        nombre: medicationData.name,
        descripcion: medicationData.description || '',
        dosis: medicationData.dose || '',
        color: this.getRandomColor(),
        activo: true
      };

      const medicationId = await this.storageService.addMedicamento(medication);

      // Add schedules
      const withFood = scheduleData.includes('withFood');
      
      if (scheduleData.time1) {
        await this.storageService.addHorario({
          medicamento_id: medicationId,
          hora: scheduleData.time1,
          dias_semana: 'DIARIO',
          con_comida: withFood,
          activo: true
        });
      }

      if (scheduleData.time2) {
        await this.storageService.addHorario({
          medicamento_id: medicationId,
          hora: scheduleData.time2,
          dias_semana: 'DIARIO',
          con_comida: withFood,
          activo: true
        });
      }

      if (scheduleData.time3) {
        await this.storageService.addHorario({
          medicamento_id: medicationId,
          hora: scheduleData.time3,
          dias_semana: 'DIARIO',
          con_comida: withFood,
          activo: true
        });
      }

      await this.loadMedications();
      await this.showToast('Medicamento añadido correctamente', 'success');
    } catch (error) {
      console.error('Error saving medication:', error);
      await this.showToast('Error al guardar el medicamento', 'danger');
    }
  }

  async editMedication(medication: any) {
    const alert = await this.alertController.create({
      header: 'Editar Medicamento',
      inputs: [
        {
          name: 'name',
          type: 'text',
          value: medication.nombre,
          placeholder: 'Nombre del medicamento'
        },
        {
          name: 'dose',
          type: 'text',
          value: medication.dosis,
          placeholder: 'Dosis'
        },
        {
          name: 'description',
          type: 'textarea',
          value: medication.descripcion,
          placeholder: 'Descripción'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Guardar',
          handler: async (data) => {
            await this.storageService.updateMedicamento(medication.id, {
              nombre: data.name,
              dosis: data.dose,
              descripcion: data.description
            });
            await this.loadMedications();
            await this.showToast('Medicamento actualizado', 'success');
          }
        }
      ]
    });

    await alert.present();
  }

  async deleteMedication(medication: any) {
    const alert = await this.alertController.create({
      header: 'Eliminar Medicamento',
      message: `¿Estás seguro de que quieres eliminar ${medication.nombre}?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await this.storageService.deleteMedicamento(medication.id);
            await this.loadMedications();
            await this.showToast('Medicamento eliminado', 'success');
          }
        }
      ]
    });

    await alert.present();
  }

  async editSchedules(medication: any) {
    // This would open a modal to edit schedules
    // For now, just show a message
    await this.showToast('Función en desarrollo', 'warning');
  }

  getRandomColor(): string {
    const colors = [
      '#FF5722', // Deep Orange
      '#2196F3', // Blue
      '#4CAF50', // Green
      '#9C27B0', // Purple
      '#FF9800', // Orange
      '#00BCD4', // Cyan
      '#E91E63', // Pink
      '#795548', // Brown
      '#607D8B', // Blue Grey
      '#009688'  // Teal
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  async showToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      color: color
    });
    await toast.present();
  }
}