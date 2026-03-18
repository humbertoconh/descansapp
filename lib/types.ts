export type Grupo = 'Capataces' | 'Clasificadores' | 'Manipuladores' | 'Desconocido'

export interface Profile {
  id: string
  chapa: string
  nombre: string
  apellidos: string
  grupo: Grupo
  aprobado: boolean
  is_admin: boolean
  aprobado_at?: string
  created_at: string
  updated_at: string
}

export type EstadoDescanso = 'propio' | 'en_mercado' | 'en_intercambio' | 'cedido'

export interface Descanso {
  id: string
  user_id: string
  fecha: string
  estado: EstadoDescanso
  notas?: string
  created_at: string
  updated_at: string
  profile?: Profile
}

export function getGrupoFromChapa(chapa: string): Grupo {
  if (chapa.startsWith('24')) return 'Capataces'
  if (chapa.startsWith('63')) return 'Clasificadores'
  if (chapa.startsWith('71') || chapa.startsWith('72')) return 'Manipuladores'
  return 'Desconocido'
}

export function validarChapa(chapa: string): boolean {
  return /^\d{5}$/.test(chapa) && getGrupoFromChapa(chapa) !== 'Desconocido'
}
