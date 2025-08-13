import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private isWeb: boolean;
  private dbName: string = 'medicamentos_db';
  private dbReady: boolean = false;

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
    this.isWeb = Capacitor.getPlatform() === 'web';
  }

  /**
   * Inicializar la base de datos
   */
  async initializeDatabase(): Promise<void> {
    try {
      // Si estamos en web, necesitamos configuración especial
      if (this.isWeb) {
        await this.initWebStore();
      }

      // Verificar conexión
      const retCC = await this.sqlite.checkConnectionsConsistency();
      const isConn = (await this.sqlite.isConnection(this.dbName, false)).result;
      
      if (retCC.result && isConn) {
        this.db = await this.sqlite.retrieveConnection(this.dbName, false);
      } else {
        this.db = await this.sqlite.createConnection(
          this.dbName,
          false,
          'no-encryption',
          1,
          false
        );
      }

      await this.db.open();
      await this.createTables();
      this.dbReady = true;
      
      console.log('✅ Base de datos inicializada correctamente');
    } catch (error) {
      console.error('❌ Error inicializando base de datos:', error);
      throw error;
    }
  }

  /**
   * Configuración especial para web (desarrollo)
   */
  private async initWebStore(): Promise<void> {
    try {
      // Definir la configuración de jeep-sqlite
      const jeepSqliteEl = document.querySelector('jeep-sqlite');
      
      if (jeepSqliteEl) {
        await this.sqlite.initWebStore();
      } else {
        // Crear el elemento jeep-sqlite si no existe
        const jeepSqlite = document.createElement('jeep-sqlite');
        document.body.appendChild(jeepSqlite);
        
        // Esperar a que el elemento esté listo
        await customElements.whenDefined('jeep-sqlite');
        
        // Ahora inicializar el store
        await this.sqlite.initWebStore();
      }
      
      console.log('✅ Web Store inicializado');
    } catch (error) {
      console.error('❌ Error inicializando Web Store:', error);
      // En desarrollo, podemos continuar sin SQLite
      console.warn('⚠️ Continuando sin SQLite - usando memoria temporal');
    }
  }

  /**
   * Crear las tablas de la base de datos
   */
  private async createTables(): Promise<void> {
    const sqlStatements = `
      -- Tabla de medicamentos
      CREATE TABLE IF NOT EXISTS medicamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        dosis TEXT,
        foto_url TEXT,
        color TEXT DEFAULT '#4CAF50',
        activo INTEGER DEFAULT 1,
        fecha_inicio TEXT,
        fecha_fin TEXT,
        notas TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabla de horarios
      CREATE TABLE IF NOT EXISTS horarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        medicamento_id INTEGER NOT NULL,
        hora TEXT NOT NULL,
        dias_semana TEXT DEFAULT 'DIARIO',
        con_comida INTEGER DEFAULT 0,
        activo INTEGER DEFAULT 1,
        FOREIGN KEY (medicamento_id) REFERENCES medicamentos(id) ON DELETE CASCADE
      );

      -- Tabla de tomas (historial)
      CREATE TABLE IF NOT EXISTS tomas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        medicamento_id INTEGER NOT NULL,
        horario_id INTEGER NOT NULL,
        fecha_hora_programada TEXT NOT NULL,
        fecha_hora_tomada TEXT,
        estado TEXT DEFAULT 'pendiente',
        notas TEXT,
        FOREIGN KEY (medicamento_id) REFERENCES medicamentos(id) ON DELETE CASCADE,
        FOREIGN KEY (horario_id) REFERENCES horarios(id) ON DELETE CASCADE
      );

      -- Tabla de configuración
      CREATE TABLE IF NOT EXISTS configuracion (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clave TEXT UNIQUE NOT NULL,
        valor TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabla de notificaciones
      CREATE TABLE IF NOT EXISTS notificaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        medicamento_id INTEGER NOT NULL,
        horario_id INTEGER NOT NULL,
        fecha_hora TEXT NOT NULL,
        notificacion_id_sistema INTEGER,
        estado TEXT DEFAULT 'programada',
        FOREIGN KEY (medicamento_id) REFERENCES medicamentos(id) ON DELETE CASCADE,
        FOREIGN KEY (horario_id) REFERENCES horarios(id) ON DELETE CASCADE
      );

      -- Índices para mejorar rendimiento
      CREATE INDEX IF NOT EXISTS idx_horarios_medicamento ON horarios(medicamento_id);
      CREATE INDEX IF NOT EXISTS idx_tomas_medicamento ON tomas(medicamento_id);
      CREATE INDEX IF NOT EXISTS idx_tomas_fecha ON tomas(fecha_hora_programada);
      CREATE INDEX IF NOT EXISTS idx_notificaciones_fecha ON notificaciones(fecha_hora);
    `;

    try {
      await this.db!.execute(sqlStatements);
      console.log('✅ Tablas creadas correctamente');
      
      // Insertar configuración por defecto si no existe
      await this.insertDefaultConfig();
    } catch (error) {
      console.error('❌ Error creando tablas:', error);
      throw error;
    }
  }

  /**
   * Insertar configuración por defecto
   */
  private async insertDefaultConfig(): Promise<void> {
    const checkQuery = `SELECT COUNT(*) as count FROM configuracion`;
    const result = await this.db!.query(checkQuery);
    
    if (result.values && result.values[0].count === 0) {
      const insertQuery = `
        INSERT OR IGNORE INTO configuracion (clave, valor) VALUES 
        ('nombre_usuario', 'Usuario'),
        ('sonido_notificacion', 'default'),
        ('vibrar', 'true'),
        ('recordatorio_minutos_antes', '5'),
        ('tema', 'claro'),
        ('tamano_texto', 'grande');
      `;
      await this.db!.execute(insertQuery);
      console.log('✅ Configuración por defecto insertada');
    }
  }

  /**
   * Ejecutar una consulta SELECT
   */
  async query(statement: string, values: any[] = []): Promise<any[]> {
    if (!this.dbReady || !this.db) {
      throw new Error('Base de datos no inicializada');
    }

    try {
      const result = await this.db.query(statement, values);
      return result.values || [];
    } catch (error) {
      console.error('❌ Error en query:', error);
      throw error;
    }
  }

  /**
   * Ejecutar INSERT, UPDATE, DELETE
   */
  async run(statement: string, values: any[] = []): Promise<any> {
    if (!this.dbReady || !this.db) {
      throw new Error('Base de datos no inicializada');
    }

    try {
      const result = await this.db.run(statement, values);
      return result;
    } catch (error) {
      console.error('❌ Error en run:', error);
      throw error;
    }
  }

  /**
   * Ejecutar múltiples statements en una transacción
   */
  async executeTransaction(statements: { statement: string, values?: any[] }[]): Promise<void> {
    if (!this.dbReady || !this.db) {
      throw new Error('Base de datos no inicializada');
    }

    try {
      await this.db.beginTransaction();
      
      for (const stmt of statements) {
        await this.db.run(stmt.statement, stmt.values || []);
      }
      
      await this.db.commitTransaction();
    } catch (error) {
      await this.db.rollbackTransaction();
      console.error('❌ Error en transacción:', error);
      throw error;
    }
  }

  /**
   * Cerrar la conexión a la base de datos
   */
  async closeDatabase(): Promise<void> {
    if (this.db) {
      await this.sqlite.closeConnection(this.dbName, false);
      this.db = null;
      this.dbReady = false;
    }
  }

  /**
   * Verificar si la base de datos está lista
   */
  isDatabaseReady(): boolean {
    return this.dbReady;
  }

  /**
   * Insertar datos de prueba (para desarrollo)
   */
  async insertTestData(): Promise<void> {
    try {
      // Verificar si ya hay datos
      const medicamentos = await this.query('SELECT COUNT(*) as count FROM medicamentos');
      if (medicamentos[0].count > 0) {
        console.log('ℹ️ Ya existen datos en la base de datos');
        return;
      }

      // Insertar medicamentos de prueba
      const statements = [
        {
          statement: `INSERT INTO medicamentos (nombre, descripcion, dosis, color) 
                     VALUES (?, ?, ?, ?)`,
          values: ['Ibuprofeno', 'Para el dolor y inflamación', '600mg - 1 comprimido', '#FF5722']
        },
        {
          statement: `INSERT INTO medicamentos (nombre, descripcion, dosis, color) 
                     VALUES (?, ?, ?, ?)`,
          values: ['Omeprazol', 'Protector de estómago', '20mg - 1 cápsula', '#2196F3']
        },
        {
          statement: `INSERT INTO medicamentos (nombre, descripcion, dosis, color) 
                     VALUES (?, ?, ?, ?)`,
          values: ['Vitamina D', 'Suplemento vitamínico', '1000 UI - 1 comprimido', '#4CAF50']
        }
      ];

      for (const stmt of statements) {
        const result = await this.run(stmt.statement, stmt.values);
        const medId = result.changes?.lastId;
        
        // Añadir horarios para cada medicamento
        if (medId) {
          if (stmt.values![0] === 'Ibuprofeno') {
            await this.run(
              `INSERT INTO horarios (medicamento_id, hora, con_comida) VALUES (?, ?, ?)`,
              [medId, '08:00', 1]
            );
            await this.run(
              `INSERT INTO horarios (medicamento_id, hora, con_comida) VALUES (?, ?, ?)`,
              [medId, '14:00', 1]
            );
            await this.run(
              `INSERT INTO horarios (medicamento_id, hora, con_comida) VALUES (?, ?, ?)`,
              [medId, '22:00', 0]
            );
          } else if (stmt.values![0] === 'Omeprazol') {
            await this.run(
              `INSERT INTO horarios (medicamento_id, hora, con_comida) VALUES (?, ?, ?)`,
              [medId, '08:00', 1]
            );
          } else {
            await this.run(
              `INSERT INTO horarios (medicamento_id, hora, con_comida) VALUES (?, ?, ?)`,
              [medId, '12:00', 1]
            );
          }
        }
      }

      console.log('✅ Datos de prueba insertados correctamente');
    } catch (error) {
      console.error('❌ Error insertando datos de prueba:', error);
    }
  }
}