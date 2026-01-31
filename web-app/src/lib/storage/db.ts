import Dexie, { type EntityTable } from 'dexie';
import type { Session } from '@/types/results';
import type { SensorSession } from '@/types/sensor';

// Custom config types with numeric IDs for IndexedDB
interface CustomKart {
  id?: number;
  name: string;
  weight: number;
  frontalArea: number;
  dragCoefficient: number;
}

interface CustomEngine {
  id?: number;
  name: string;
  category: string;
  inertia: number;
  gearbox: {
    primary: { input: number; output: number };
    gears: { input: number; output: number }[];
  };
}

interface CustomTyre {
  id?: number;
  name: string;
  diameter: number;
  inertia: number;
  rollingCoeff1: number;
  rollingCoeff2: number;
  rimType: 'aluminum' | 'magnesium';
}

// Database schema
export const db = new Dexie('EngineAnalysisDB') as Dexie & {
  sessions: EntityTable<Session, 'id'>;
  customKarts: EntityTable<CustomKart, 'id'>;
  customEngines: EntityTable<CustomEngine, 'id'>;
  customTyres: EntityTable<CustomTyre, 'id'>;
  sensorSessions: EntityTable<SensorSession, 'id'>;
};

db.version(1).stores({
  sessions: '++id, name, createdAt, updatedAt',
  customKarts: '++id, name',
  customEngines: '++id, name',
  customTyres: '++id, name',
});

// Version 2: Add sensor sessions table
db.version(2).stores({
  sessions: '++id, name, createdAt, updatedAt',
  customKarts: '++id, name',
  customEngines: '++id, name',
  customTyres: '++id, name',
  sensorSessions: '++id, name, createdAt, updatedAt',
});

// Session operations
export async function saveSession(session: Omit<Session, 'id'>): Promise<number> {
  const id = await db.sessions.add(session as Session);
  return id as number;
}

export async function updateSession(id: number, updates: Partial<Session>): Promise<void> {
  await db.sessions.update(id, { ...updates, updatedAt: new Date() });
}

export async function getSession(id: number): Promise<Session | undefined> {
  return await db.sessions.get(id);
}

export async function getAllSessions(): Promise<Session[]> {
  return await db.sessions.orderBy('updatedAt').reverse().toArray();
}

export async function deleteSession(id: number): Promise<void> {
  await db.sessions.delete(id);
}

// Custom config operations
export async function saveCustomKart(kart: Omit<CustomKart, 'id'>): Promise<number> {
  const id = await db.customKarts.add(kart);
  return id as number;
}

export async function getCustomKarts(): Promise<CustomKart[]> {
  return await db.customKarts.toArray();
}

export async function deleteCustomKart(id: number): Promise<void> {
  await db.customKarts.delete(id);
}

export async function saveCustomEngine(engine: Omit<CustomEngine, 'id'>): Promise<number> {
  const id = await db.customEngines.add(engine);
  return id as number;
}

export async function getCustomEngines(): Promise<CustomEngine[]> {
  return await db.customEngines.toArray();
}

export async function deleteCustomEngine(id: number): Promise<void> {
  await db.customEngines.delete(id);
}

export async function saveCustomTyre(tyre: Omit<CustomTyre, 'id'>): Promise<number> {
  const id = await db.customTyres.add(tyre);
  return id as number;
}

export async function getCustomTyres(): Promise<CustomTyre[]> {
  return await db.customTyres.toArray();
}

export async function deleteCustomTyre(id: number): Promise<void> {
  await db.customTyres.delete(id);
}

// Sensor session operations
export async function saveSensorSession(
  session: Omit<SensorSession, 'id'>
): Promise<number> {
  const id = await db.sensorSessions.add(session as SensorSession);
  return id as number;
}

export async function updateSensorSession(
  id: number,
  updates: Partial<SensorSession>
): Promise<void> {
  await db.sensorSessions.update(id, { ...updates, updatedAt: new Date() });
}

export async function getSensorSession(id: number): Promise<SensorSession | undefined> {
  return await db.sensorSessions.get(id);
}

export async function getAllSensorSessions(): Promise<SensorSession[]> {
  return await db.sensorSessions.orderBy('updatedAt').reverse().toArray();
}

export async function deleteSensorSession(id: number): Promise<void> {
  await db.sensorSessions.delete(id);
}

export type { CustomKart, CustomEngine, CustomTyre };
