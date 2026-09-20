// src/types/index.ts
/**
 * Barrel de exportación de tipos.
 *
 * Uso:
 *   import type { Usuario, Proyecto, ClaseUML } from '@/types';
 */

// Common
export type {
  PaginatedResponse,
  PaginationParams,
  ApiErrorBody,
  ISODateString,
  Id,
  LoadStatus,
  AsyncState,
  UmlVisibility,
} from './common';

// Usuarios
export type {
  RolGlobal,
  Usuario,
  UsuarioCreate,
  UsuarioUpdate,
  UsuarioLogin,
  RefreshTokenRequest,
  PasswordChange,
  TokenResponse,
} from './usuario';

// Proyectos
export type {
  EstadoProyecto,
  RolEnProyecto,
  Proyecto,
  ProyectoConMiembros,
  ProyectoCreate,
  ProyectoUpdate,
  MiembroProyecto,
  MiembroProyectoCreate,
  MiembroProyectoUpdate,
  ProyectosQuery,
} from './proyecto';

// Diagramas
export type {
  Diagrama,
  DiagramaCompleto,
  DiagramaCreate,
  DiagramaUpdate,
} from './diagrama';

// Clases UML
export type {
  AtributoUML,
  AtributoUMLCreate,
  AtributoUMLUpdate,
  ParametroOperacionUML,
  ParametroOperacionUMLCreate,
  ParametroOperacionUMLUpdate,
  OperacionUML,
  OperacionUMLCreate,
  OperacionUMLUpdate,
  ClaseUML,
  ClaseUMLCreate,
  ClaseUMLUpdate,
} from './claseUml';

// Relaciones / interfaces
export type {
  TipoRelacion,
  RelacionUML,
  RelacionUMLCreate,
  RelacionUMLUpdate,
  OperacionInterfazUML,
  OperacionInterfazUMLCreate,
  OperacionInterfazUMLUpdate,
  InterfazUML,
  InterfazUMLCreate,
  InterfazUMLUpdate,
} from './relacionUml';

// Generación
export type {
  EstadoTrabajoGeneracion,
  StackDestino,
  ReglaMapeo,
  EntidadGenerada,
  TrabajoGeneracion,
  TrabajoGeneracionDetalle,
  GenerarBackendRequest,
  EstadoGeneracion,
  DescargaProyecto,
} from './generacion';