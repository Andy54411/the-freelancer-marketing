'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Image as ImageIcon,
  User,
  MapPin,
  Globe,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Tag,
  Plus,
  X,
  Search,
  Copy,
  Eye,
  Edit3,
  Video,
  Play,
  Trash2,
} from 'lucide-react';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { UserDataForSettings } from '@/types/settings';
import Image from 'next/image';
import Link from 'next/link';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '@/firebase/clients';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';
import { categories as allCategories } from '@/data/categories';
import { getSkillsForSubcategory } from '@/data/skills';
import { generateProfilePrompt } from '@/config/ai-prompts';
import { AIFeedbackService } from '@/services/AIFeedbackService';
import { KeywordAnalysisService } from '@/services/KeywordAnalysisService';
import { useAuth } from '@/contexts/AuthContext';

export interface TaskerProfileFormProps {
  formData: UserDataForSettings;
  handleChange: (path: string, value: string | number | boolean | null | string[]) => void;
  userId?: string;
}

const TaskerProfileForm: React.FC<TaskerProfileFormProps> = ({ formData, handleChange, userId }) => {
  // Auth Hook für Firebase User
  const { firebaseUser } = useAuth();
  
  // Profile states
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // AI Description Generator states
  const [showAiGenerator, setShowAiGenerator] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Search Tags states
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);

  // Form data - check root level first, then step3
  const [profileTitle, setProfileTitle] = useState('');
  const [bio, setBio] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [hourlyRate, setHourlyRate] = useState(0);
  const [location, setLocation] = useState('');
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [offersVideoConsultation, setOffersVideoConsultation] = useState(false);

  // Get profile image URL - check root level first, then step3
  const profileImageUrl = formData.profilePictureURL || formData.step3?.profilePictureURL;
  const bannerImageUrl = formData.profileBannerImage || formData.step3?.profileBannerImage;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileVideoUrl = (formData as any).profileVideoURL || (formData.step3 as any)?.profileVideoURL;

  // Helper function to find category ID by title or ID
  const findCategoryId = (categoryValue: string): string => {
    if (!categoryValue) return '';
    // First check if it's already an ID
    const byId = allCategories.find(cat => cat.id === categoryValue);
    if (byId) return byId.id;
    // Then check if it's a title
    const byTitle = allCategories.find(cat => cat.title === categoryValue);
    if (byTitle) return byTitle.id;
    return categoryValue;
  };

  // Initialize state from formData ONLY on mount (not on every formData change)
  // This prevents the "ping-pong" effect where typing gets reset
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return; // Skip if already initialized
    initializedRef.current = true;
    
    const rawCategory = formData.selectedCategory || formData.step3?.selectedCategory || '';
    const categoryId = findCategoryId(rawCategory);
    const subcategory = formData.selectedSubcategory || formData.step3?.selectedSubcategory || '';
    
    setBio(formData.bio || formData.step3?.bio || '');
    setSelectedCategory(categoryId);
    setSelectedSubcategory(subcategory);
    setSkills(formData.skills || formData.step3?.skills || []);
    setHourlyRate(formData.hourlyRate || formData.step3?.hourlyRate || 0);
    setLocation(formData.location || formData.step3?.location || formData.step2?.companyAddress?.city || '');
    setOffersVideoConsultation(formData.offersVideoConsultation ?? formData.step3?.offersVideoConsultation ?? false);
    
    // Load profile title - type-safe access
    const formDataWithTitle = formData as unknown as { profileTitle?: string };
    setProfileTitle(formDataWithTitle.profileTitle || '');
    
    // Load search tags - type-safe access
    const formDataWithTags = formData as unknown as { searchTags?: string[] };
    setSearchTags(formDataWithTags.searchTags || []);
    
    // Generate suggested tags based on category
    if (categoryId && subcategory) {
      const suggestions = KeywordAnalysisService.getSuggestedTags(categoryId, subcategory);
      setSuggestedTags(suggestions);
    }
  }, [formData]);

  // Load available skills when subcategory changes
  useEffect(() => {
    if (selectedCategory && selectedSubcategory) {
      const skillsForSubcat = getSkillsForSubcategory(selectedCategory, selectedSubcategory);
      setAvailableSkills(skillsForSubcat);
    } else {
      setAvailableSkills([]);
    }
  }, [selectedCategory, selectedSubcategory]);

  // Get subcategories for selected category
  const getSubcategoriesForCategory = (categoryId: string): string[] => {
    const category = allCategories.find(cat => cat.id === categoryId);
    return category ? category.subcategories : [];
  };

  // Upload image to Firebase Storage
  const uploadImageToStorage = async (
    file: File,
    folder: string,
    uId: string
  ): Promise<string> => {
    const timestamp = Date.now();
    const imagePath = `${folder}/${uId}/${timestamp}_${file.name}`;
    const imageRef = ref(storage, imagePath);
    const snapshot = await uploadBytes(imageRef, file);
    return await getDownloadURL(snapshot.ref);
  };

  // Handle profile image upload
  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!userId) {
      toast.error('Benutzer-ID fehlt');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Bitte nur Bilddateien hochladen');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Bild darf maximal 5MB gross sein');
      return;
    }

    setIsUploadingProfile(true);
    try {
      const downloadUrl = await uploadImageToStorage(file, 'profile-pictures', userId);
      
      // Update Firestore
      const docRef = doc(db, 'companies', userId);
      await updateDoc(docRef, {
        profilePictureURL: downloadUrl,
        'step3.profilePictureURL': downloadUrl,
        lastUpdated: serverTimestamp(),
      });

      handleChange('profilePictureURL', downloadUrl);
      handleChange('step3.profilePictureURL', downloadUrl);
      toast.success('Profilbild erfolgreich hochgeladen');
    } catch {
      toast.error('Fehler beim Hochladen des Profilbildes');
    } finally {
      setIsUploadingProfile(false);
      // Reset input value um erneute Auswahl derselben Datei zu ermöglichen
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  // Handle banner image upload
  const handleBannerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!userId) {
      toast.error('Benutzer-ID fehlt');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Bitte nur Bilddateien hochladen');
      return;
    }

    // Validate file size (max 10MB for banner)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Banner darf maximal 10MB gross sein');
      return;
    }

    setIsUploadingBanner(true);
    try {
      const downloadUrl = await uploadImageToStorage(file, 'profile-banners', userId);
      
      // Update Firestore
      const docRef = doc(db, 'companies', userId);
      await updateDoc(docRef, {
        profileBannerImage: downloadUrl,
        'step3.profileBannerImage': downloadUrl,
        lastUpdated: serverTimestamp(),
      });

      handleChange('profileBannerImage', downloadUrl);
      handleChange('step3.profileBannerImage', downloadUrl);
      toast.success('Banner erfolgreich hochgeladen');
    } catch {
      toast.error('Fehler beim Hochladen des Banners');
    } finally {
      setIsUploadingBanner(false);
      // Reset input value um erneute Auswahl derselben Datei zu ermöglichen
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  // Handle video upload
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!userId) {
      toast.error('Benutzer-ID fehlt');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Bitte nur Videodateien hochladen (MP4, WebM, MOV)');
      return;
    }

    // Validate file size (max 50MB for video)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video darf maximal 50MB gross sein');
      return;
    }

    // Validate video duration (max 60 seconds)
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    const checkDuration = new Promise<boolean>((resolve) => {
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        if (video.duration > 75) {
          toast.error('Video darf maximal 75 Sekunden lang sein');
          resolve(false);
        } else {
          resolve(true);
        }
      };
      video.onerror = () => {
        toast.error('Video konnte nicht gelesen werden');
        resolve(false);
      };
    });
    
    video.src = URL.createObjectURL(file);
    const isValidDuration = await checkDuration;
    if (!isValidDuration) return;

    setIsUploadingVideo(true);
    setVideoUploadProgress(0);
    
    try {
      // Simuliere Progress (da uploadBytes keinen Progress-Callback hat)
      const progressInterval = setInterval(() => {
        setVideoUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      const timestamp = Date.now();
      const videoPath = `profile-videos/${userId}/${timestamp}_${file.name}`;
      const videoRef = ref(storage, videoPath);
      const snapshot = await uploadBytes(videoRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      clearInterval(progressInterval);
      setVideoUploadProgress(100);
      
      // Update Firestore
      const docRef = doc(db, 'companies', userId);
      await updateDoc(docRef, {
        profileVideoURL: downloadUrl,
        'step3.profileVideoURL': downloadUrl,
        lastUpdated: serverTimestamp(),
      });

      handleChange('profileVideoURL', downloadUrl);
      toast.success('Video erfolgreich hochgeladen');
    } catch {
      toast.error('Fehler beim Hochladen des Videos');
    } finally {
      setIsUploadingVideo(false);
      setVideoUploadProgress(0);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  // Delete video
  const handleVideoDelete = async () => {
    if (!userId) return;
    
    try {
      const docRef = doc(db, 'companies', userId);
      await updateDoc(docRef, {
        profileVideoURL: null,
        'step3.profileVideoURL': null,
        lastUpdated: serverTimestamp(),
      });
      
      handleChange('profileVideoURL', null);
      toast.success('Video entfernt');
    } catch {
      toast.error('Fehler beim Entfernen des Videos');
    }
  };

  // Handle profile title change
  const handleProfileTitleChange = (value: string) => {
    // Max 80 Zeichen für SEO-optimierte Titel
    if (value.length <= 80) {
      setProfileTitle(value);
      handleChange('profileTitle', value);
    }
  };

  // Handle bio change
  const handleBioChange = (value: string) => {
    setBio(value);
    handleChange('step3.bio', value);
    // Also save as description for backwards compatibility
    handleChange('description', value);
  };

  // State für Feedback nach KI-Generierung
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastGeneratedOutput, setLastGeneratedOutput] = useState('');
  const [lastUserInput, setLastUserInput] = useState('');

  // Generate description using Taskilo KI
  const generateAiDescription = async () => {
    if (!aiInput.trim()) {
      toast.error('Bitte gib einige Stichpunkte oder Informationen ein');
      return;
    }

    setIsGeneratingDescription(true);
    try {
      // Get category and subcategory names for context
      const categoryObj = allCategories.find(cat => cat.id === selectedCategory);
      const categoryName = categoryObj?.title || selectedCategory;
      const subcategoryName = selectedSubcategory;

      // Nutze die zentrale Prompt-Konfiguration
      const prompt = generateProfilePrompt(categoryName, subcategoryName, aiInput);

      // Firebase Auth Token abrufen
      if (!firebaseUser) {
        throw new Error('Nicht angemeldet. Bitte melden Sie sich erneut an.');
      }
      
      const token = await firebaseUser.getIdToken(true);
      
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Taskilo KI-Service nicht verfügbar');
      }

      const data = await response.json();
      
      if (data.response) {
        // Clean up the response
        let cleanedResponse = data.response;
        cleanedResponse = cleanedResponse.replace(/```html/g, '');
        cleanedResponse = cleanedResponse.replace(/```/g, '');
        cleanedResponse = cleanedResponse.trim();
        
        // Zeige Vorschau statt direkt zu speichern
        setGeneratedPreview(cleanedResponse);
        setShowPreview(true);
        
        // Speichere für Feedback
        setLastGeneratedOutput(cleanedResponse);
        setLastUserInput(aiInput);
        
        setShowAiGenerator(false);
        toast.success('Vorschau erstellt - prüfe den Text und passe ihn an');
      } else {
        throw new Error('Keine Antwort von der KI erhalten');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Fehler bei der Generierung';
      toast.error(errorMessage);
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  // Übernehme generierten Text in die Beschreibung
  const applyGeneratedText = () => {
    handleBioChange(generatedPreview);
    setShowPreview(false);
    setShowFeedback(true);
    toast.success('Text übernommen - du kannst ihn jetzt weiter bearbeiten');
  };

  // Kopiere generierten Text in Zwischenablage
  const copyGeneratedText = async () => {
    try {
      // Entferne HTML-Tags für Klartext-Kopie
      const plainText = generatedPreview.replace(/<[^>]*>/g, '');
      await navigator.clipboard.writeText(plainText);
      toast.success('Text in Zwischenablage kopiert');
    } catch {
      toast.error('Kopieren fehlgeschlagen');
    }
  };

  // Handle Feedback zur KI-Generierung
  const handleFeedback = async (rating: 'good' | 'bad') => {
    try {
      const categoryObj = allCategories.find(cat => cat.id === selectedCategory);
      const categoryName = categoryObj?.title || selectedCategory;
      
      await AIFeedbackService.saveFeedback({
        promptId: 'profile-description',
        promptVersion: '1.0.0',
        category: categoryName,
        subcategory: selectedSubcategory,
        userInput: lastUserInput,
        generatedOutput: lastGeneratedOutput,
        rating,
        userId: userId || 'unknown',
        companyId: userId || 'unknown',
      });
      
      setShowFeedback(false);
      toast.success(rating === 'good' ? 'Danke für dein positives Feedback' : 'Danke für dein Feedback - wir verbessern uns');
    } catch (error) {
      console.error('Fehler beim Speichern des Feedbacks:', error);
    }
  };

  // Search Tags Management
  const addTag = (tag: string) => {
    if (searchTags.length >= 5) {
      toast.error('Maximal 5 Such-Tags erlaubt');
      return;
    }
    
    const normalizedTag = tag.trim().toLowerCase();
    if (normalizedTag.length < 2) {
      toast.error('Tag muss mindestens 2 Zeichen haben');
      return;
    }
    
    if (searchTags.some(t => t.toLowerCase() === normalizedTag)) {
      toast.error('Tag existiert bereits');
      return;
    }
    
    const newTags = [...searchTags, tag.trim()];
    setSearchTags(newTags);
    setNewTag('');
    handleChange('searchTags', newTags);
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = searchTags.filter(t => t !== tagToRemove);
    setSearchTags(newTags);
    handleChange('searchTags', newTags);
  };

  // Handle skill toggle
  const handleSkillToggle = (skill: string) => {
    const newSkills = skills.includes(skill)
      ? skills.filter(s => s !== skill)
      : [...skills, skill];
    setSkills(newSkills);
    handleChange('step3.skills', newSkills);
  };

  // Handle hourly rate change
  const handleHourlyRateChange = (value: string) => {
    const rate = parseInt(value) || 0;
    setHourlyRate(rate);
    handleChange('step3.hourlyRate', rate);
  };

  // Handle location change
  const handleLocationChange = (value: string) => {
    setLocation(value);
    handleChange('step3.location', value);
  };

  // Handle video consultation toggle
  const handleVideoConsultationToggle = () => {
    const newValue = !offersVideoConsultation;
    setOffersVideoConsultation(newValue);
    handleChange('step3.offersVideoConsultation', newValue);
  };

  return (
    <div className="space-y-8">
      {/* Info Banner */}
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium text-teal-900">Tasker-Profil</h4>
          <p className="text-sm text-teal-700 mt-1">
            Hier kannst du dein öffentliches Tasker-Profil bearbeiten. Diese Informationen werden auf deiner Profilseite und in den Suchergebnissen angezeigt.
          </p>
        </div>
      </div>

      {/* Banner Image Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Banner-Bild</h3>
        <p className="text-sm text-gray-600">
          Das Banner wird oben auf deinen Gig-Karten angezeigt. Empfohlene Groesse: 1200x800 Pixel (4:3 Format)
        </p>
        
        <div 
          className="relative aspect-video w-full rounded-lg overflow-hidden border-2 border-dashed border-gray-300 hover:border-teal-400 transition-colors cursor-pointer bg-gray-50"
          onClick={() => bannerInputRef.current?.click()}
        >
          {bannerImageUrl ? (
            <>
              <Image
                src={bannerImageUrl}
                alt="Banner"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white font-medium">Banner ändern</span>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {isUploadingBanner ? (
                <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
              ) : (
                <>
                  <ImageIcon className="w-12 h-12 text-gray-400 mb-3" />
                  <span className="text-gray-600 font-medium">Banner hochladen</span>
                  <span className="text-sm text-gray-500 mt-1">Klicken oder Bild hierher ziehen</span>
                </>
              )}
            </div>
          )}
          
          {isUploadingBanner && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
            </div>
          )}
        </div>
        
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          onChange={handleBannerImageUpload}
          className="hidden"
        />
      </div>

      {/* Profile Video Section - Fiverr Style */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">Profil-Video</h3>
          <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-medium rounded">Optional</span>
          
          {/* Tooltip mit Tipps */}
          <div className="relative group">
            <button
              type="button"
              className="p-1 text-gray-400 hover:text-teal-600 transition-colors"
              aria-label="Video-Tipps anzeigen"
            >
              <Info className="w-4 h-4" />
            </button>
            <div className="absolute left-0 top-full mt-2 w-72 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="absolute -top-1.5 left-3 w-3 h-3 bg-gray-900 rotate-45" />
              <p className="font-medium mb-2">Tipps für ein gutes Video:</p>
              <ul className="space-y-1.5 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-teal-400 mt-0.5">-</span>
                  <span>Stelle dich und deine Dienstleistung kurz vor</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-400 mt-0.5">-</span>
                  <span>Zeige Beispiele deiner Arbeit</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-400 mt-0.5">-</span>
                  <span>Sprich direkt in die Kamera</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-400 mt-0.5">-</span>
                  <span>Achte auf gute Beleuchtung und Tonqualität</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Ein kurzes Video (max. 75 Sekunden) hilft Kunden, dich besser kennenzulernen. Videos erhöhen die Conversion-Rate um bis zu 40%.
        </p>
        
        <div className="relative aspect-video w-full max-w-md rounded-lg overflow-hidden border-2 border-dashed border-gray-300 hover:border-teal-400 transition-colors bg-gray-50">
          {profileVideoUrl ? (
            <>
              <video
                src={profileVideoUrl}
                className="w-full h-full object-cover"
                controls
                preload="metadata"
              />
              <button
                type="button"
                onClick={handleVideoDelete}
                className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                title="Video entfernen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div 
              className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
              onClick={() => videoInputRef.current?.click()}
            >
              {isUploadingVideo ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
                  <div className="w-48">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-teal-500 transition-all duration-300"
                        style={{ width: `${videoUploadProgress}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 mt-1">{videoUploadProgress}%</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Video className="w-12 h-12 text-gray-400" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                      <Play className="w-3 h-3 text-white fill-white" />
                    </div>
                  </div>
                  <span className="text-gray-600 font-medium mt-3">Video hochladen</span>
                  <span className="text-sm text-gray-500 mt-1">MP4, WebM oder MOV (max. 50MB, 75 Sek.)</span>
                </>
              )}
            </div>
          )}
        </div>
        
        {!profileVideoUrl && !isUploadingVideo && (
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 border border-teal-600 text-teal-600 rounded-lg hover:bg-teal-50 text-sm font-medium"
          >
            <Upload className="w-4 h-4" />
            Video auswählen
          </button>
        )}
        
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          onChange={handleVideoUpload}
          className="hidden"
        />
      </div>

      {/* Profile Image Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Profilbild</h3>
        <p className="text-sm text-gray-600">
          Dein Profilbild wird neben deinem Namen angezeigt. Empfohlene Groesse: 200x200 Pixel
        </p>
        
        <div className="flex items-center gap-6">
          <div 
            className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-gray-300 hover:border-teal-400 transition-colors cursor-pointer bg-gray-50"
            onClick={() => profileInputRef.current?.click()}
          >
            {profileImageUrl ? (
              <>
                <Image
                  src={profileImageUrl}
                  alt="Profilbild"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Upload className="w-6 h-6 text-white" />
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                {isUploadingProfile ? (
                  <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
                ) : (
                  <User className="w-10 h-10 text-gray-400" />
                )}
              </div>
            )}
            
            {isUploadingProfile && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
              </div>
            )}
          </div>
          
          <div>
            <button
              type="button"
              onClick={() => profileInputRef.current?.click()}
              disabled={isUploadingProfile}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {isUploadingProfile ? 'Hochladen...' : 'Bild auswählen'}
            </button>
          </div>
        </div>
        
        <input
          ref={profileInputRef}
          type="file"
          accept="image/*"
          onChange={handleProfileImageUpload}
          className="hidden"
        />
      </div>

      {/* Profile Title Section */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">Profil-Titel</h3>
              
              {/* Tooltip mit Tipp */}
              <div className="relative group">
                <button
                  type="button"
                  className="p-1 text-gray-400 hover:text-teal-600 transition-colors"
                  aria-label="Titel-Tipps anzeigen"
                >
                  <Info className="w-4 h-4" />
                </button>
                <div className="absolute left-0 top-full mt-2 w-80 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="absolute -top-1.5 left-3 w-3 h-3 bg-gray-900 rotate-45" />
                  <p className="font-medium mb-2">Tipp für einen guten Titel:</p>
                  <p className="text-gray-300 mb-2">Ein guter Titel enthält Keywords wie deine Dienstleistung, Spezialisierung oder Region.</p>
                  <p className="text-gray-400 text-xs italic">Beispiel: &quot;Erfahrener Elektriker für Sanierung und Neuinstallation in München&quot;</p>
                </div>
              </div>
            </div>
            <span className="text-sm text-gray-500">{profileTitle.length}/80 Zeichen</span>
          </div>
          <p className="text-sm text-gray-600">
            Der Titel wird prominent auf deinem Profil angezeigt. Nutze relevante Keywords, die deine Dienstleistung beschreiben.
          </p>
        </div>
        
        <div className="relative">
          <input
            type="text"
            value={profileTitle}
            onChange={(e) => handleProfileTitleChange(e.target.value)}
            placeholder="z.B.: Professioneller Koch für Events und Private Anlässe"
            maxLength={80}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
      </div>

      {/* Bio Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Beschreibung</h3>
            <p className="text-sm text-gray-600">
              Beschreibe dich und deine Dienstleistungen. Diese Beschreibung wird auf deinem Profil angezeigt.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAiGenerator(true)}
            className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-teal-500 to-teal-600 text-white rounded-lg hover:from-teal-600 hover:to-teal-700 text-sm font-medium shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            Mit Taskilo KI erstellen
          </button>
        </div>
        
        {/* Taskilo KI Generator Modal */}
        {showAiGenerator && (
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <Sparkles className="w-5 h-5 text-teal-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">Taskilo KI-Assistent</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Gib einige Stichpunkte oder Informationen ein und Taskilo KI erstellt eine professionelle Beschreibung für dich.
                </p>
              </div>
            </div>
            
            <textarea
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="z.B.: 10 Jahre Erfahrung, spezialisiert auf italienische Küche, flexible Arbeitszeiten, eigenes Equipment vorhanden..."
              rows={4}
              className="w-full px-4 py-3 border border-teal-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none bg-white"
            />
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={generateAiDescription}
                disabled={isGeneratingDescription || !aiInput.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {isGeneratingDescription ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Taskilo KI erstellt...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Mit Taskilo KI generieren
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAiGenerator(false);
                  setAiInput('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
        
        {/* KI-generierte Vorschau */}
        {showPreview && generatedPreview && (
          <div className="p-4 bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                <h4 className="font-medium text-gray-900">KI-generierte Vorschau</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: generatedPreview }}
              />
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">
                <strong>Hinweis:</strong> Dies ist ein von KI generierter Vorschlag. 
                Du solltest den Text überprüfen und mit deinen eigenen Keywords und Informationen anpassen.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={applyGeneratedText}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium"
              >
                <Edit3 className="w-4 h-4" />
                Übernehmen und bearbeiten
              </button>
              <button
                type="button"
                onClick={copyGeneratedText}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
              >
                <Copy className="w-4 h-4" />
                Text kopieren
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
              >
                Verwerfen
              </button>
            </div>
          </div>
        )}
        
        {/* Rich Text Editor */}
        <RichTextEditor
          value={bio}
          onChange={handleBioChange}
          placeholder="Erzähle potenziellen Kunden, was dich besonders macht und welche Dienstleistungen du anbietest..."
        />
        
        {/* KI Haftungsausschluss - erscheint nach KI-Generierung */}
        {showFeedback && (
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <strong>Wichtiger Hinweis:</strong> Dieser Text wurde von Taskilo KI generiert und kann Fehler oder ungenaue Informationen enthalten. 
              Bitte überprüfe den Inhalt sorgfältig und passe ihn bei Bedarf an, bevor du ihn speicherst.
            </div>
          </div>
        )}
        
        {/* Feedback nach KI-Generierung */}
        {showFeedback && (
          <div className="flex items-center justify-between p-3 bg-teal-50 border border-teal-200 rounded-lg">
            <span className="text-sm text-teal-700">
              Wie zufrieden bist du mit der generierten Beschreibung?
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleFeedback('good')}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
              >
                <ThumbsUp className="w-4 h-4" />
                Gut
              </button>
              <button
                type="button"
                onClick={() => handleFeedback('bad')}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
              >
                <ThumbsDown className="w-4 h-4" />
                Nicht gut
              </button>
              <button
                type="button"
                onClick={() => setShowFeedback(false)}
                className="text-gray-400 hover:text-gray-600 text-sm ml-2"
              >
                Schließen
              </button>
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Info className="w-4 h-4" />
          <span>Nutze die Formatierungsoptionen um deine Beschreibung ansprechend zu gestalten.</span>
        </div>
      </div>

      {/* Search Tags Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Tag className="w-5 h-5 text-teal-600" />
              Such-Tags
              <span className="text-sm font-normal text-gray-500">({searchTags.length}/5)</span>
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Such-Tags helfen Kunden, dich in der Suche zu finden. Wähle bis zu 5 relevante Keywords.
            </p>
          </div>
          {userId && (
            <Link
              href={`/dashboard/company/${userId}/settings/keyword-analysis`}
              className="flex items-center gap-2 px-3 py-2 text-teal-600 hover:bg-teal-50 rounded-lg text-sm font-medium transition-colors"
            >
              <Search className="w-4 h-4" />
              Keyword-Analyse
            </Link>
          )}
        </div>
        
        {/* Aktuelle Tags */}
        <div className="flex flex-wrap gap-2">
          {searchTags.map((tag) => (
            <span 
              key={tag}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-100 text-teal-800 rounded-full text-sm font-medium"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:bg-teal-200 rounded-full p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
          {searchTags.length === 0 && (
            <span className="text-sm text-gray-500">Noch keine Tags hinzugefügt</span>
          )}
        </div>
        
        {/* Tag hinzufügen */}
        {searchTags.length < 5 && (
          <div className="flex gap-2">
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTag.trim()) {
                    e.preventDefault();
                    addTag(newTag);
                  }
                }}
                placeholder="Tag eingeben und Enter drücken..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <button
              type="button"
              onClick={() => newTag.trim() && addTag(newTag)}
              disabled={!newTag.trim()}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        )}
        
        {/* Vorgeschlagene Tags */}
        {suggestedTags.length > 0 && searchTags.length < 5 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Vorgeschlagene Tags:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedTags
                .filter(tag => !searchTags.some(t => t.toLowerCase() === tag.toLowerCase()))
                .slice(0, 8)
                .map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag(tag)}
                    disabled={searchTags.length >= 5}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    {tag}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Category & Subcategory Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Kategorie & Dienstleistung</h3>
        <p className="text-sm text-gray-600">
          Diese Angaben wurden bei der Registrierung festgelegt und können nicht geändert werden.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category - LOCKED */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kategorie
              <span className="ml-2 text-xs text-gray-500">(gesperrt)</span>
            </label>
            <select
              value={selectedCategory}
              disabled
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
            >
              <option value="">Kategorie wählen...</option>
              {allCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.title}
                </option>
              ))}
            </select>
          </div>
          
          {/* Subcategory - LOCKED */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dienstleistung
              <span className="ml-2 text-xs text-gray-500">(gesperrt)</span>
            </label>
            <select
              value={selectedSubcategory}
              disabled
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
            >
              <option value="">Dienstleistung wählen...</option>
              {getSubcategoriesForCategory(selectedCategory).map((subcat) => (
                <option key={subcat} value={subcat}>
                  {subcat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Skills Section */}
      {selectedSubcategory && availableSkills.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Fähigkeiten</h3>
          <p className="text-sm text-gray-600">
            Wähle die Fähigkeiten, die du anbietest. Diese werden als Badges auf deinem Profil angezeigt.
          </p>
          
          <div className="flex flex-wrap gap-2">
            {availableSkills.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => handleSkillToggle(skill)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  skills.includes(skill)
                    ? 'bg-teal-100 text-teal-800 border-2 border-teal-500'
                    : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                {skill}
                {skills.includes(skill) && (
                  <CheckCircle className="w-3.5 h-3.5 inline-block ml-1.5" />
                )}
              </button>
            ))}
          </div>
          
          {skills.length === 0 && (
            <p className="text-sm text-amber-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Bitte wähle mindestens eine Fähigkeit
            </p>
          )}
        </div>
      )}

      {/* Pricing Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Preis</h3>
        <p className="text-sm text-gray-600">
          Dein Stundensatz wird als &quot;ab €XX&quot; auf deinen Gig-Karten angezeigt.
        </p>
        
        <div className="max-w-xs">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stundensatz (€)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
            <input
              type="number"
              value={hourlyRate || ''}
              onChange={(e) => handleHourlyRateChange(e.target.value)}
              min="0"
              step="5"
              placeholder="0"
              className="w-full pl-8 pr-12 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">/h</span>
          </div>
        </div>
      </div>

      {/* Location Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Standort</h3>
        <p className="text-sm text-gray-600">
          Gib deinen Standort an, damit Kunden wissen, wo du tätig bist.
        </p>
        
        <div className="max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stadt / Region
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={location}
              onChange={(e) => handleLocationChange(e.target.value)}
              placeholder="z.B. Berlin, Hamburg, München..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Video Consultation Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Zusätzliche Optionen</h3>
        
        <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
          <input
            type="checkbox"
            checked={offersVideoConsultation}
            onChange={handleVideoConsultationToggle}
            className="mt-0.5 w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
          />
          <div>
            <span className="font-medium text-gray-900 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Video-Beratung anbieten
            </span>
            <p className="text-sm text-gray-600 mt-1">
              Zeige an, dass du auch Video-Beratungen und Online-Meetings anbietest
            </p>
          </div>
        </label>
      </div>
    </div>
  );
};

export default TaskerProfileForm;
