import { Injectable } from '@angular/core';

export interface Medicamento {
  id?: number;
  nombre: string;
  descripcion?: string;
  dosis?: string;
  foto_url?: string;
  color: string;
  activo: boolean;
  fecha_inicio?: string;
  fecha_fin?: string;
  notas?: string;
  created_at?: string;
}

export interface Horario {
  id?: number;
  medicamento_id: number;
  hora: string;
  dias_semana: string;
  con_comida: boolean;
  activo: boolean;
}

export interface Toma {
  id?: number;
  medicamento_id: number;
  horario_id: number;
  fecha_hora_programada: string;
  fecha_hora_tomada?: string;
  estado: 'pendiente' | 'tomada' | 'omitida' | 'pospuesta';
  notas?: string;
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private medicamentos: Medicamento[] = [];
  private horarios: Horario[] = [];
  private tomas: Toma[] = [];
  private nextId = { medicamentos: 1, horarios: 1, tomas: 1 };

  constructor() {
    this.loadFromLocalStorage();
    if (this.medicamentos.length === 0) {
      this.insertTestData();
    }
  }

  // === MÉTODOS PARA MEDICAMENTOS ===
  
  async getMedicamentos(): Promise<Medicamento[]> {
    return [...this.medicamentos.filter(m => m.activo)];
  }

  async getMedicamento(id: number): Promise<Medicamento | undefined> {
    return this.medicamentos.find(m => m.id === id);
  }

  async addMedicamento(medicamento: Medicamento): Promise<number> {
    const newMed = {
      ...medicamento,
      id: this.nextId.medicamentos++,
      created_at: new Date().toISOString()
    };
    this.medicamentos.push(newMed);
    this.saveToLocalStorage();
    return newMed.id!;
  }

  async updateMedicamento(id: number, medicamento: Partial<Medicamento>): Promise<void> {
    const index = this.medicamentos.findIndex(m => m.id === id);
    if (index !== -1) {
      this.medicamentos[index] = { ...this.medicamentos[index], ...medicamento };
      this.saveToLocalStorage();
    }
  }

  async deleteMedicamento(id: number): Promise<void> {
    const index = this.medicamentos.findIndex(m => m.id === id);
    if (index !== -1) {
      this.medicamentos[index].activo = false;
      this.horarios.forEach(h => {
        if (h.medicamento_id === id) {
          h.activo = false;
        }
      });
      this.saveToLocalStorage();
    }
  }

  // === MÉTODOS PARA HORARIOS ===
  
  async getHorarios(medicamentoId?: number): Promise<Horario[]> {
    if (medicamentoId) {
      return this.horarios.filter(h => h.medicamento_id === medicamentoId && h.activo);
    }
    return [...this.horarios.filter(h => h.activo)];
  }

  async addHorario(horario: Horario): Promise<number> {
    const newHorario = {
      ...horario,
      id: this.nextId.horarios++
    };
    this.horarios.push(newHorario);
    this.saveToLocalStorage();
    return newHorario.id!;
  }

  async updateHorario(id: number, horario: Partial<Horario>): Promise<void> {
    const index = this.horarios.findIndex(h => h.id === id);
    if (index !== -1) {
      this.horarios[index] = { ...this.horarios[index], ...horario };
      this.saveToLocalStorage();
    }
  }

  async deleteHorario(id: number): Promise<void> {
    const index = this.horarios.findIndex(h => h.id === id);
    if (index !== -1) {
      this.horarios[index].activo = false;
      this.saveToLocalStorage();
    }
  }

  // === MÉTODOS PARA TOMAS ===
  
  async getTomasHoy(): Promise<any[]> {
    const hoy = new Date().toISOString().split('T')[0];
    const tomasHoy: any[] = [];
    
    for (const medicamento of this.medicamentos.filter(m => m.activo)) {
      const horariosM = this.horarios.filter(h => 
        h.medicamento_id === medicamento.id && h.activo
      );
      
      for (const horario of horariosM) {
        const fechaHora = `${hoy}T${horario.hora}:00`;
        let toma = this.tomas.find(t => 
          t.medicamento_id === medicamento.id && 
          t.horario_id === horario.id &&
          t.fecha_hora_programada.startsWith(hoy)
        );
        
        if (!toma) {
          // Crear toma para hoy si no existe
          toma = {
            id: this.nextId.tomas++,
            medicamento_id: medicamento.id!,
            horario_id: horario.id!,
            fecha_hora_programada: fechaHora,
            estado: 'pendiente'
          };
          this.tomas.push(toma);
        }
        
        tomasHoy.push({
          ...toma,
          medicamento_nombre: medicamento.nombre,
          medicamento_dosis: medicamento.dosis,
          medicamento_color: medicamento.color,
          hora: horario.hora,
          con_comida: horario.con_comida
        });
      }
    }    

    tomasHoy.sort((a, b) => a.hora.localeCompare(b.hora));
    this.saveToLocalStorage();
    return tomasHoy;
  }

  async marcarTomada(tomaId: number): Promise<void> {
    const toma = this.tomas.find(t => t.id === tomaId);
    if (toma) {
      toma.estado = 'tomada';
      toma.fecha_hora_tomada = new Date().toISOString();
      this.saveToLocalStorage();
    }
  }

  async marcarOmitida(tomaId: number): Promise<void> {
    const toma = this.tomas.find(t => t.id === tomaId);
    if (toma) {
      toma.estado = 'omitida';
      this.saveToLocalStorage();
    }
  }

  // === MÉTODOS DE ALMACENAMIENTO ===
  
  private saveToLocalStorage(): void {
    localStorage.setItem('medicamentos', JSON.stringify(this.medicamentos));
    localStorage.setItem('horarios', JSON.stringify(this.horarios));
    localStorage.setItem('tomas', JSON.stringify(this.tomas));
    localStorage.setItem('nextId', JSON.stringify(this.nextId));
  }

  private loadFromLocalStorage(): void {
    const medicamentos = localStorage.getItem('medicamentos');
    const horarios = localStorage.getItem('horarios');
    const tomas = localStorage.getItem('tomas');
    const nextId = localStorage.getItem('nextId');
    
    if (medicamentos) this.medicamentos = JSON.parse(medicamentos);
    if (horarios) this.horarios = JSON.parse(horarios);
    if (tomas) this.tomas = JSON.parse(tomas);
    if (nextId) this.nextId = JSON.parse(nextId);
  }

  private insertTestData(): void {
    // Medicamento 1: Ibuprofeno
    const med1Id = this.nextId.medicamentos++;
    this.medicamentos.push({
      id: med1Id,
      nombre: 'Ibuprofeno',
      descripcion: 'Para el dolor y inflamación',
      dosis: '600mg - 1 comprimido',
      color: '#FF5722',
      activo: true,
      created_at: new Date().toISOString()
    });
    
    // Horarios para Ibuprofeno
    this.horarios.push(
      {
        id: this.nextId.horarios++,
        medicamento_id: med1Id,
        hora: '08:00',
        dias_semana: 'DIARIO',
        con_comida: true,
        activo: true
      },
      {
        id: this.nextId.horarios++,
        medicamento_id: med1Id,
        hora: '14:00',
        dias_semana: 'DIARIO',
        con_comida: true,
        activo: true
      },
      {
        id: this.nextId.horarios++,
        medicamento_id: med1Id,
        hora: '22:00',
        dias_semana: 'DIARIO',
        con_comida: false,
        activo: true
      }
    );
    
    // Medicamento 2: Omeprazol
    const med2Id = this.nextId.medicamentos++;
    this.medicamentos.push({
      id: med2Id,
      nombre: 'Omeprazol',
      descripcion: 'Protector de estómago',
      dosis: '20mg - 1 cápsula',
      color: '#2196F3',
      activo: true,
      created_at: new Date().toISOString()
    });
    
    this.horarios.push({
      id: this.nextId.horarios++,
      medicamento_id: med2Id,
      hora: '08:00',
      dias_semana: 'DIARIO',
      con_comida: true,
      activo: true
    });
    
    // Medicamento 3: Vitamina D
    const med3Id = this.nextId.medicamentos++;
    this.medicamentos.push({
      id: med3Id,
      nombre: 'Vitamina D',
      descripcion: 'Suplemento vitamínico',
      dosis: '1000 UI - 1 comprimido',
      color: '#4CAF50',
      activo: true,
      created_at: new Date().toISOString()
    });
    
    this.horarios.push({
      id: this.nextId.horarios++,
      medicamento_id: med3Id,
      hora: '12:00',
      dias_semana: 'DIARIO',
      con_comida: true,
      activo: true
    });
    
    this.saveToLocalStorage();
    console.log('✅ Datos de prueba insertados');
  }

  // Limpiar todos los datos (útil para testing)
  async clearAll(): Promise<void> {
    this.medicamentos = [];
    this.horarios = [];
    this.tomas = [];
    this.nextId = { medicamentos: 1, horarios: 1, tomas: 1 };
    localStorage.clear();
  }
}