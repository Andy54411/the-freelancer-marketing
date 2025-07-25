// firebase_functions/src/finance/models/base.model.ts

import {
    CollectionReference,
    Query,
    Timestamp
} from 'firebase-admin/firestore';
import { getDb } from '../../helpers';
import { BaseEntity, PaginationParams, BaseListResponse } from '../types';

export abstract class BaseModel<T extends BaseEntity> {
    protected collectionName: string;
    protected collection: CollectionReference;

    constructor(collectionName: string) {
        this.collectionName = collectionName;
        this.collection = getDb().collection(collectionName);
    }

    // Basis CRUD-Operationen
    async create(data: Omit<T, keyof BaseEntity> & { companyId: string }, userId: string): Promise<T> {
        const now = Timestamp.now();
        const docRef = this.collection.doc();

        const entityData: T = {
            ...data,
            id: docRef.id,
            createdAt: now,
            updatedAt: now,
            createdBy: userId,
            lastModifiedBy: userId,
        } as T;

        await docRef.set(entityData);
        return entityData;
    }

    async getById(id: string, companyId: string): Promise<T | null> {
        const doc = await this.collection.doc(id).get();

        if (!doc.exists) {
            return null;
        }

        const data = doc.data() as T;

        // Firmen-Zugehörigkeit prüfen
        if (data.companyId !== companyId) {
            throw new Error('Access denied: Entity belongs to different company');
        }

        return data;
    }

    async update(id: string, updates: Partial<Omit<T, keyof BaseEntity>>, userId: string, companyId: string): Promise<T> {
        const docRef = this.collection.doc(id);

        // Existenz und Berechtigung prüfen
        const existing = await this.getById(id, companyId);
        if (!existing) {
            throw new Error('Entity not found');
        }

        const updateData = {
            ...updates,
            updatedAt: Timestamp.now(),
            lastModifiedBy: userId,
        };

        await docRef.update(updateData);

        // Aktualisierte Daten zurückgeben
        return await this.getById(id, companyId) as T;
    }

    async delete(id: string, companyId: string): Promise<void> {
        // Existenz und Berechtigung prüfen
        const existing = await this.getById(id, companyId);
        if (!existing) {
            throw new Error('Entity not found');
        }

        await this.collection.doc(id).delete();
    }

    // Soft Delete (für GoBD-Compliance)
    async softDelete(id: string, userId: string, companyId: string): Promise<T> {
        return await this.update(id, {
            deletedAt: Timestamp.now(),
            deletedBy: userId
        } as any, userId, companyId);
    }

    // Paginierte Listen
    async list(
        companyId: string,
        pagination: PaginationParams = {},
        filters: Record<string, any> = {}
    ): Promise<BaseListResponse<T>> {
        const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;

        let query: Query = this.collection
            .where('companyId', '==', companyId);

        // Filter anwenden
        Object.entries(filters).forEach(([field, value]) => {
            if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                    query = query.where(field, 'in', value);
                } else {
                    query = query.where(field, '==', value);
                }
            }
        });

        // Sortierung
        query = query.orderBy(sortBy, sortOrder);

        // Pagination
        const offset = (page - 1) * limit;
        query = query.offset(offset).limit(limit + 1); // +1 um hasNext zu prüfen

        const snapshot = await query.get();
        const items = snapshot.docs.slice(0, limit).map(doc => doc.data() as T);
        const hasNext = snapshot.docs.length > limit;
        const hasPrevious = page > 1;

        // Gesamtanzahl ermitteln (für bessere UX separat)
        const totalQuery = this.collection.where('companyId', '==', companyId);
        Object.entries(filters).forEach(([field, value]) => {
            if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                    totalQuery.where(field, 'in', value);
                } else {
                    totalQuery.where(field, '==', value);
                }
            }
        });
        const totalSnapshot = await totalQuery.count().get();
        const total = totalSnapshot.data().count;

        return {
            items,
            total,
            page,
            limit,
            hasNext,
            hasPrevious,
        };
    }

    // Batch-Operationen
    async batchCreate(items: (Omit<T, keyof BaseEntity> & { companyId: string })[], userId: string): Promise<T[]> {
        const batch = getDb().batch();
        const now = Timestamp.now();
        const results: T[] = [];

        items.forEach(item => {
            const docRef = this.collection.doc();
            const entityData: T = {
                ...item,
                id: docRef.id,
                createdAt: now,
                updatedAt: now,
                createdBy: userId,
                lastModifiedBy: userId,
            } as T;

            batch.set(docRef, entityData);
            results.push(entityData);
        });

        await batch.commit();
        return results;
    }

    // Suche mit Text
    async search(
        companyId: string,
        searchTerm: string,
        searchFields: (keyof T)[],
        pagination: PaginationParams = {}
    ): Promise<BaseListResponse<T>> {
        // Da Firestore keine Volltext-Suche unterstützt, verwenden wir array-contains für Tags
        // und >= / <= für prefix-basierte Suche
        const { page = 1, limit = 20 } = pagination;

        let query: Query = this.collection
            .where('companyId', '==', companyId);

        // Einfache Prefix-Suche für String-Felder
        if (searchFields.length > 0 && searchTerm) {
            const field = searchFields[0] as string; // Nehme erstes Feld für Suche
            query = query
                .where(field, '>=', searchTerm)
                .where(field, '<=', searchTerm + '\uf8ff');
        }

        query = query.limit(limit);

        const snapshot = await query.get();
        const items = snapshot.docs.map(doc => doc.data() as T);

        return {
            items,
            total: items.length, // Approximation
            page,
            limit,
            hasNext: items.length === limit,
            hasPrevious: page > 1,
        };
    }

    // Archivierung für GoBD
    async archive(id: string, userId: string, companyId: string): Promise<T> {
        return await this.update(id, {
            'gobd.archived': true,
            'gobd.archivedAt': Timestamp.now(),
            'gobd.archivedBy': userId,
        } as any, userId, companyId);
    }

    // Unveränderlich machen (GoBD)
    async makeImmutable(id: string, userId: string, companyId: string, digitalSignature?: string): Promise<T> {
        return await this.update(id, {
            'gobd.immutable': true,
            'gobd.madeImmutableAt': Timestamp.now(),
            'gobd.madeImmutableBy': userId,
            'gobd.digitalSignature': digitalSignature,
        } as any, userId, companyId);
    }

    // Hilfsmethoden
    protected convertTimestamps(data: any): any {
        // Konvertiert Timestamp-Objekte zu ISO-Strings für JSON-Response
        if (data instanceof Timestamp) {
            return data.toDate().toISOString();
        }

        if (Array.isArray(data)) {
            return data.map(item => this.convertTimestamps(item));
        }

        if (data && typeof data === 'object') {
            const converted: any = {};
            Object.keys(data).forEach(key => {
                converted[key] = this.convertTimestamps(data[key]);
            });
            return converted;
        }

        return data;
    }

    protected generateNumber(prefix: string, companyId: string): string {
        // Generiert fortlaufende Nummern (vereinfacht)
        const timestamp = Date.now().toString();
        const shortCompanyId = companyId.slice(-4);
        return `${prefix}-${shortCompanyId}-${timestamp}`;
    }

    // Validierung
    protected validateRequired(data: any, requiredFields: string[]): void {
        const missing = requiredFields.filter(field => {
            const value = data[field];
            return value === undefined || value === null || value === '';
        });

        if (missing.length > 0) {
            throw new Error(`Required fields missing: ${missing.join(', ')}`);
        }
    }

    protected validateCompanyAccess(entityCompanyId: string, userCompanyId: string): void {
        if (entityCompanyId !== userCompanyId) {
            throw new Error('Access denied: Entity belongs to different company');
        }
    }
}
