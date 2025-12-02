import { z } from 'zod';

// --- Applicant Profile ---

export const ApplicantProfileSchema = z.object({
  userId: z.string(),
  salutation: z.string().optional(),
  firstName: z.string().min(1, 'Vorname ist erforderlich'),
  lastName: z.string().min(1, 'Nachname ist erforderlich'),
  email: z.string().email('Ungültige E-Mail-Adresse'),
  phone: z.string().optional(),
  birthDate: z.string().optional(), // ISO Date or YYYY-MM-DD
  street: z.string().optional(),
  zip: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  profilePictureUrl: z.string().optional(),
  location: z.string().optional(), // Deprecated, kept for compatibility
  bio: z.string().max(500, 'Bio darf maximal 500 Zeichen lang sein').optional(),
  skills: z.array(z.string()).optional(),
  experience: z
    .array(
      z.object({
        title: z.string().min(1, 'Titel ist erforderlich'),
        company: z.string().min(1, 'Unternehmen ist erforderlich'),
        location: z.string().min(1, 'Ort ist erforderlich'),
        startDate: z.string(), // ISO Date
        endDate: z.string().optional(), // ISO Date or null for current
        description: z.string().optional(),
        certificateUrl: z.string().optional(),
        fileName: z.string().optional(),
      })
    )
    .optional(),
  education: z
    .array(
      z.object({
        degree: z.string().min(1, 'Abschluss ist erforderlich'),
        institution: z.string().min(1, 'Institution ist erforderlich'),
        location: z.string().min(1, 'Ort ist erforderlich'),
        startDate: z.string(),
        endDate: z.string().optional(),
        description: z.string().optional(),
        certificateUrl: z.string().optional(),
        fileName: z.string().optional(),
      })
    )
    .optional(),
  languages: z
    .array(
      z.object({
        language: z.string().min(1, 'Sprache ist erforderlich'),
        level: z.string().min(1, 'Niveau ist erforderlich'),
      })
    )
    .optional(),
  qualifications: z
    .array(
      z.object({
        name: z.string().min(1, 'Bezeichnung ist erforderlich'),
        issuer: z.string().optional(),
        date: z.string().optional(),
        certificateUrl: z.string().optional(),
        fileName: z.string().optional(),
      })
    )
    .optional(),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  portfolioUrl: z.string().url().optional().or(z.literal('')),

  // Documents
  cvUrl: z.string().optional(),
  cvName: z.string().optional(),
  coverLetterUrl: z.string().optional(),
  coverLetterName: z.string().optional(),

  // Preferences
  desiredPosition: z.string().min(1, 'Position ist erforderlich'),
  jobField: z.string().optional(),
  activityField: z.array(z.string()).optional(),
  industries: z.array(z.string()).min(1, 'Mindestens eine Branche ist erforderlich'),

  // Ratings
  leadershipRating: z.number().min(1).max(5).optional(),
  teamRating: z.number().min(1).max(5).optional(),
  communicationRating: z.number().min(1).max(5).optional(),

  employmentTypes: z.array(z.string()).min(1, 'Anstellungsart ist erforderlich'),
  preferredLocations: z.array(z.string()).min(1, 'Arbeitsort ist erforderlich'),
  careerLevel: z.array(z.string()).min(1, 'Rang ist erforderlich'),
  relocationWillingness: z.string().optional(), // 'yes', 'no', 'conditional'
  noticePeriod: z
    .object({
      duration: z.string().optional(),
      timing: z.string().optional(),
    })
    .optional(),
  salaryExpectation: z
    .object({
      amount: z.number().optional(),
      currency: z.string().optional(),
      period: z.string().optional(),
    })
    .optional(),

  // Deprecated / Legacy fields (kept for type compatibility if needed, but should be removed/migrated)
  jobCategories: z.array(z.string()).optional(),
  jobFields: z.array(z.string()).optional(),
  hotelStars: z
    .object({
      min: z.string().optional(),
      max: z.string().optional(),
    })
    .optional(),
  gaultMillauPoints: z
    .object({
      min: z.string().optional(),
      max: z.string().optional(),
    })
    .optional(),
  michelinStars: z
    .object({
      min: z.string().optional(),
      max: z.string().optional(),
    })
    .optional(),
  willingnessToRelocate: z.boolean().optional(),

  updatedAt: z.string(), // ISO Date
});

export type ApplicantProfile = z.infer<typeof ApplicantProfileSchema>;

// --- Job Posting ---

export const JobPostingSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  companyName: z.string(),
  title: z.string().min(1, 'Titel ist erforderlich'),
  description: z.string().min(1, 'Beschreibung ist erforderlich'),
  tasks: z.string().optional(),
  location: z.string().min(1, 'Standort ist erforderlich'),
  type: z.enum(['full-time', 'part-time', 'contract', 'freelance', 'internship']),
  salaryRange: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      currency: z.string().default('EUR'),
    })
    .optional(),
  requirements: z.string().optional(),
  benefits: z.string().optional(),
  contactInfo: z.string().optional(),
  headerImageUrl: z.string().optional(),
  headerImagePositionY: z.number().optional().default(50), // 0-100%
  logoUrl: z.string().optional(),
  galleryImages: z.array(z.string()).optional(),
  postedAt: z.string(), // ISO Date
  expiresAt: z.string().optional(), // ISO Date
  status: z.enum(['active', 'closed', 'draft']),
});

export type JobPosting = z.infer<typeof JobPostingSchema>;

// --- Job Application ---

export const JobApplicationSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  companyId: z.string(),
  applicantId: z.string(), // User UID
  applicantProfile: ApplicantProfileSchema, // Snapshot of profile at time of application
  coverLetter: z.string().optional(),
  status: z.enum(['pending', 'reviewed', 'interview', 'rejected', 'accepted']),
  appliedAt: z.string(), // ISO Date
});

export type JobApplication = z.infer<typeof JobApplicationSchema>;
