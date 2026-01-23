/**
 * ContactsServiceMongo - MongoDB-basierte Kontaktverwaltung
 * ==========================================================
 * 
 * Ersetzt die CardDAV/SOGo-basierte Version.
 * Speichert alle Kontakte in MongoDB.
 * 
 * Jeder Benutzer hat seine eigenen Kontakte.
 * Kontakte können aus verschiedenen Quellen stammen:
 * - manual: Manuell erstellt
 * - email-header: Automatisch aus E-Mail-Headern extrahiert
 * - carddav-migration: Aus CardDAV migriert
 */

import mongoDBService, { ObjectId } from './MongoDBService';
import { z } from 'zod';

// Contact Schema
export const ContactSchema = z.object({
  _id: z.any().optional(),
  ownerEmail: z.string().email(), // E-Mail des Besitzers
  uid: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  displayName: z.string().optional(),
  nickname: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  emails: z.array(z.object({
    value: z.string().email(),
    label: z.string().default('Privat'),
  })).default([]),
  phones: z.array(z.object({
    value: z.string(),
    label: z.string().default('Mobil'),
  })).default([]),
  addresses: z.array(z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    label: z.string().default('Privat'),
  })).default([]),
  websites: z.array(z.object({
    value: z.string(),
    label: z.string().default('Website'),
  })).default([]),
  birthday: z.string().optional(),
  notes: z.string().optional(),
  photo: z.string().optional(), // Base64 oder URL
  labels: z.array(z.string()).default([]),
  source: z.enum(['manual', 'email-header', 'carddav-migration']).default('manual'),
  lastContacted: z.date().optional(),
  contactCount: z.number().default(0),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Contact = z.infer<typeof ContactSchema>;

// Input Schema (ohne automatisch generierte Felder)
export const ContactInputSchema = ContactSchema.omit({
  _id: true,
  ownerEmail: true,
  uid: true,
  createdAt: true,
  updatedAt: true,
});

export type ContactInput = z.infer<typeof ContactInputSchema>;

// Label Schema
export const LabelSchema = z.object({
  _id: z.any().optional(),
  ownerEmail: z.string().email(),
  id: z.string(),
  name: z.string(),
  color: z.string().optional().default('#808080'),
});

export type Label = z.infer<typeof LabelSchema>;

// MongoDB Document Interface
interface ContactDocument {
  _id?: ObjectId;
  ownerEmail: string;
  uid: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  nickname?: string;
  company?: string;
  jobTitle?: string;
  department?: string;
  emails: Array<{ value: string; label: string }>;
  phones: Array<{ value: string; label: string }>;
  addresses: Array<{ street?: string; city?: string; postalCode?: string; country?: string; label: string }>;
  websites: Array<{ value: string; label: string }>;
  birthday?: string;
  notes?: string;
  photo?: string;
  labels: string[];
  source: 'manual' | 'email-header' | 'carddav-migration';
  lastContacted?: Date;
  contactCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface LabelDocument {
  _id?: ObjectId;
  ownerEmail: string;
  id: string;
  name: string;
  color: string;
}

export class ContactsServiceMongo {
  private collectionName = 'webmail_contacts';
  private labelsCollectionName = 'webmail_contact_labels';

  private getCollection() {
    return mongoDBService.getCollection<ContactDocument>(this.collectionName);
  }

  private getLabelsCollection() {
    return mongoDBService.getCollection<LabelDocument>(this.labelsCollectionName);
  }

  private generateUID(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 12)}`;
  }

  // ==================== KONTAKTE ====================

  /**
   * Alle Kontakte eines Benutzers abrufen
   */
  async getContacts(ownerEmail: string): Promise<{ contacts: Contact[]; total: number }> {
    const collection = this.getCollection();
    const contacts = await collection
      .find({ ownerEmail: ownerEmail.toLowerCase() })
      .sort({ displayName: 1 })
      .toArray();

    return { contacts: contacts as unknown as Contact[], total: contacts.length };
  }

  /**
   * Kontakte suchen
   */
  async searchContacts(ownerEmail: string, query: string): Promise<Contact[]> {
    const collection = this.getCollection();
    const queryLower = query.toLowerCase();

    // Text-Suche über mehrere Felder
    const contacts = await collection.find({
      ownerEmail: ownerEmail.toLowerCase(),
      $or: [
        { displayName: { $regex: queryLower, $options: 'i' } },
        { firstName: { $regex: queryLower, $options: 'i' } },
        { lastName: { $regex: queryLower, $options: 'i' } },
        { company: { $regex: queryLower, $options: 'i' } },
        { nickname: { $regex: queryLower, $options: 'i' } },
        { 'emails.value': { $regex: queryLower, $options: 'i' } },
        { 'phones.value': { $regex: query, $options: 'i' } },
      ],
    }).sort({ contactCount: -1, displayName: 1 }).toArray();

    return contacts as unknown as Contact[];
  }

  /**
   * Einzelnen Kontakt abrufen
   */
  async getContact(ownerEmail: string, contactId: string): Promise<Contact | null> {
    const collection = this.getCollection();
    
    // Versuche ObjectId oder uid
    const contact = await collection.findOne({
      ownerEmail: ownerEmail.toLowerCase(),
      $or: [
        { _id: ObjectId.isValid(contactId) ? new ObjectId(contactId) : undefined },
        { uid: contactId },
      ],
    });

    return contact as unknown as Contact | null;
  }

  /**
   * Kontakt erstellen
   */
  async createContact(ownerEmail: string, contactData: ContactInput): Promise<Contact> {
    const collection = this.getCollection();
    const now = new Date();

    const contact: ContactDocument = {
      ownerEmail: ownerEmail.toLowerCase(),
      uid: this.generateUID(),
      firstName: contactData.firstName,
      lastName: contactData.lastName,
      displayName: contactData.displayName || 
        `${contactData.firstName || ''} ${contactData.lastName || ''}`.trim() ||
        contactData.emails?.[0]?.value || 
        'Unbenannt',
      nickname: contactData.nickname,
      company: contactData.company,
      jobTitle: contactData.jobTitle,
      department: contactData.department,
      emails: contactData.emails || [],
      phones: contactData.phones || [],
      addresses: contactData.addresses || [],
      websites: contactData.websites || [],
      birthday: contactData.birthday,
      notes: contactData.notes,
      photo: contactData.photo,
      labels: contactData.labels || [],
      source: contactData.source || 'manual',
      lastContacted: contactData.lastContacted,
      contactCount: contactData.contactCount || 0,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(contact);
    return { ...contact, _id: result.insertedId } as unknown as Contact;
  }

  /**
   * Kontakt aktualisieren
   */
  async updateContact(ownerEmail: string, contactId: string, updates: Partial<ContactInput>): Promise<Contact | null> {
    const collection = this.getCollection();
    
    const updateData: Partial<ContactDocument> & { updatedAt: Date } = {
      ...updates,
      updatedAt: new Date(),
    };

    // Aktualisiere displayName wenn Name geändert wurde
    if (updates.firstName !== undefined || updates.lastName !== undefined) {
      const existing = await this.getContact(ownerEmail, contactId);
      if (existing) {
        updateData.displayName = updates.displayName || 
          `${updates.firstName ?? existing.firstName ?? ''} ${updates.lastName ?? existing.lastName ?? ''}`.trim() ||
          existing.displayName;
      }
    }

    const result = await collection.findOneAndUpdate(
      {
        ownerEmail: ownerEmail.toLowerCase(),
        $or: [
          { _id: ObjectId.isValid(contactId) ? new ObjectId(contactId) : undefined },
          { uid: contactId },
        ],
      },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return result as unknown as Contact | null;
  }

  /**
   * Kontakt löschen
   */
  async deleteContact(ownerEmail: string, contactId: string): Promise<boolean> {
    const collection = this.getCollection();
    
    const result = await collection.deleteOne({
      ownerEmail: ownerEmail.toLowerCase(),
      $or: [
        { _id: ObjectId.isValid(contactId) ? new ObjectId(contactId) : undefined },
        { uid: contactId },
      ],
    });

    return result.deletedCount > 0;
  }

  /**
   * Kontakt aus E-Mail-Header automatisch erstellen/aktualisieren
   */
  async upsertFromEmailHeader(
    ownerEmail: string, 
    email: string, 
    name?: string
  ): Promise<Contact> {
    const collection = this.getCollection();
    const emailLower = email.toLowerCase();
    const now = new Date();

    // Suche existierenden Kontakt mit dieser E-Mail
    const existing = await collection.findOne({
      ownerEmail: ownerEmail.toLowerCase(),
      'emails.value': { $regex: `^${emailLower}$`, $options: 'i' },
    });

    if (existing) {
      // Aktualisiere lastContacted und contactCount
      await collection.updateOne(
        { _id: existing._id },
        {
          $set: { lastContacted: now, updatedAt: now },
          $inc: { contactCount: 1 },
        }
      );
      return { ...existing, lastContacted: now, contactCount: (existing.contactCount || 0) + 1 } as unknown as Contact;
    }

    // Parse Name wenn vorhanden
    let firstName: string | undefined;
    let lastName: string | undefined;
    
    if (name) {
      const nameParts = name.trim().split(/\s+/);
      if (nameParts.length >= 2) {
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(' ');
      } else {
        firstName = name;
      }
    }

    // Erstelle neuen Kontakt
    const contact: ContactDocument = {
      ownerEmail: ownerEmail.toLowerCase(),
      uid: this.generateUID(),
      displayName: name || email.split('@')[0],
      firstName,
      lastName,
      emails: [{ value: email, label: 'Privat' }],
      phones: [],
      addresses: [],
      websites: [],
      labels: [],
      source: 'email-header',
      lastContacted: now,
      contactCount: 1,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(contact);
    return { ...contact, _id: result.insertedId } as unknown as Contact;
  }

  // ==================== LABELS ====================

  /**
   * Alle Labels eines Benutzers abrufen
   */
  async getLabels(ownerEmail: string): Promise<Label[]> {
    const collection = this.getLabelsCollection();
    const labels = await collection
      .find({ ownerEmail: ownerEmail.toLowerCase() })
      .sort({ name: 1 })
      .toArray();
    return labels as unknown as Label[];
  }

  /**
   * Label erstellen
   */
  async createLabel(ownerEmail: string, name: string, color?: string): Promise<Label> {
    const collection = this.getLabelsCollection();
    
    const label: LabelDocument = {
      ownerEmail: ownerEmail.toLowerCase(),
      id: this.generateUID(),
      name,
      color: color || '#808080',
    };

    const result = await collection.insertOne(label);
    return { ...label, _id: result.insertedId } as unknown as Label;
  }

  /**
   * Label aktualisieren
   */
  async updateLabel(ownerEmail: string, labelId: string, updates: { name?: string; color?: string }): Promise<Label | null> {
    const collection = this.getLabelsCollection();
    
    const result = await collection.findOneAndUpdate(
      {
        ownerEmail: ownerEmail.toLowerCase(),
        id: labelId,
      },
      { $set: updates },
      { returnDocument: 'after' }
    );

    return result as unknown as Label | null;
  }

  /**
   * Label löschen (und von allen Kontakten entfernen)
   */
  async deleteLabel(ownerEmail: string, labelId: string): Promise<boolean> {
    const labelsCollection = this.getLabelsCollection();
    const contactsCollection = this.getCollection();
    
    // Entferne Label von allen Kontakten
    await contactsCollection.updateMany(
      { ownerEmail: ownerEmail.toLowerCase() },
      { $pull: { labels: labelId } }
    );

    // Lösche Label
    const result = await labelsCollection.deleteOne({
      ownerEmail: ownerEmail.toLowerCase(),
      id: labelId,
    });

    return result.deletedCount > 0;
  }

  /**
   * Kontakte nach Label filtern
   */
  async getContactsByLabel(ownerEmail: string, labelId: string): Promise<Contact[]> {
    const collection = this.getCollection();
    
    const contacts = await collection.find({
      ownerEmail: ownerEmail.toLowerCase(),
      labels: labelId,
    }).sort({ displayName: 1 }).toArray();
    
    return contacts as unknown as Contact[];
  }

  /**
   * Label zu Kontakt hinzufügen
   */
  async addLabelToContact(ownerEmail: string, contactId: string, labelId: string): Promise<boolean> {
    const collection = this.getCollection();
    
    const result = await collection.updateOne(
      {
        ownerEmail: ownerEmail.toLowerCase(),
        $or: [
          { _id: ObjectId.isValid(contactId) ? new ObjectId(contactId) : undefined },
          { uid: contactId },
        ],
      },
      { $addToSet: { labels: labelId } }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Label von Kontakt entfernen
   */
  async removeLabelFromContact(ownerEmail: string, contactId: string, labelId: string): Promise<boolean> {
    const collection = this.getCollection();
    
    const result = await collection.updateOne(
      {
        ownerEmail: ownerEmail.toLowerCase(),
        $or: [
          { _id: ObjectId.isValid(contactId) ? new ObjectId(contactId) : undefined },
          { uid: contactId },
        ],
      },
      { $pull: { labels: labelId } }
    );

    return result.modifiedCount > 0;
  }

  // ==================== STATISTIKEN ====================

  /**
   * Kontakt-Statistiken für Benutzer
   */
  async getStats(ownerEmail: string): Promise<{
    total: number;
    bySource: { [key: string]: number };
    withEmail: number;
    withPhone: number;
    recentlyContacted: number;
  }> {
    const collection = this.getCollection();
    const ownerLower = ownerEmail.toLowerCase();

    const total = await collection.countDocuments({ ownerEmail: ownerLower });
    
    const bySourceAgg = await collection.aggregate([
      { $match: { ownerEmail: ownerLower } },
      { $group: { _id: '$source', count: { $sum: 1 } } },
    ]).toArray();

    const bySource: { [key: string]: number } = {};
    for (const item of bySourceAgg) {
      bySource[item._id || 'unknown'] = item.count;
    }

    const withEmail = await collection.countDocuments({
      ownerEmail: ownerLower,
      'emails.0': { $exists: true },
    });

    const withPhone = await collection.countDocuments({
      ownerEmail: ownerLower,
      'phones.0': { $exists: true },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentlyContacted = await collection.countDocuments({
      ownerEmail: ownerLower,
      lastContacted: { $gte: thirtyDaysAgo },
    });

    return { total, bySource, withEmail, withPhone, recentlyContacted };
  }

  // ==================== INDICES ====================

  /**
   * Indices für bessere Performance erstellen
   */
  async ensureIndices(): Promise<void> {
    const contactsCollection = this.getCollection();
    const labelsCollection = this.getLabelsCollection();

    // Contacts Indices
    await contactsCollection.createIndex({ ownerEmail: 1 });
    await contactsCollection.createIndex({ ownerEmail: 1, uid: 1 }, { unique: true });
    await contactsCollection.createIndex({ ownerEmail: 1, 'emails.value': 1 });
    await contactsCollection.createIndex({ ownerEmail: 1, displayName: 1 });
    await contactsCollection.createIndex({ ownerEmail: 1, labels: 1 });
    await contactsCollection.createIndex(
      { ownerEmail: 1, displayName: 'text', firstName: 'text', lastName: 'text', 'emails.value': 'text' },
      { name: 'contacts_text_search' }
    );

    // Labels Indices
    await labelsCollection.createIndex({ ownerEmail: 1 });
    await labelsCollection.createIndex({ ownerEmail: 1, id: 1 }, { unique: true });
  }
}

// Singleton Export
export const contactsServiceMongo = new ContactsServiceMongo();
export default ContactsServiceMongo;
