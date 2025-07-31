import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/clients';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('id');

    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider ID parameter is required. Use ?id=PROVIDER_ID' },
        { status: 400 }
      );
    }

    console.log('🔍 Debug Provider Loading Process for ID:', providerId);

    // EXACT SAME LOGIC AS PROVIDER DETAIL PAGE
    let providerData: any = null;
    let foundIn: string | null = null;

    // 1. First check in firma collection (same as provider detail page)
    const firmaDoc = await getDoc(doc(db, 'firma', providerId));

    if (firmaDoc.exists()) {
      const data = firmaDoc.data();
      foundIn = 'firma';

      // Reviews calculation (simplified)
      const reviewsQuery = query(collection(db, 'reviews'), where('providerId', '==', firmaDoc.id));
      const reviewsSnapshot = await getDocs(reviewsQuery);

      let calculatedRating = 0;
      let calculatedCount = 0;

      if (!reviewsSnapshot.empty) {
        const ratings = reviewsSnapshot.docs
          .map((doc: any) => doc.data().rating)
          .filter((rating: any) => rating);
        calculatedCount = ratings.length;
        if (calculatedCount > 0) {
          calculatedRating =
            ratings.reduce((sum: number, rating: number) => sum + rating, 0) / calculatedCount;
        }
      }

      providerData = {
        id: firmaDoc.id,
        companyName: data.companyName,
        profilePictureFirebaseUrl: data.profilePictureFirebaseUrl,
        profilePictureURL: data.profilePictureURL,
        photoURL: data.photoURL,
        bio: data.description || data.bio,
        description: data.description,
        location:
          data.location ||
          `${data.companyCity || ''}, ${data.companyCountry || ''}`.trim().replace(/^,\s*/, ''),
        skills: data.services || data.skills || [],
        selectedCategory: data.selectedCategory,
        selectedSubcategory: data.selectedSubcategory,
        rating: calculatedRating,
        reviewCount: calculatedCount,
        completedJobs: data.completedJobs || 0,
        isCompany: true,
        priceRange: data.priceRange,
        responseTime: data.responseTime,
        hourlyRate: data.hourlyRate,
        email: data.email,
        phone: data.phone,
        website: data.website,
        founded: data.founded,
        teamSize: data.teamSize,
        languages: data.languages || [],
        portfolio: data.portfolio || [],
        services: data.services || [],
        stripeAccountId: data.stripeAccountId, // Top-level field from database
      };
    } else {
      // 2. Check in users collection (same as provider detail page)
      const userDoc = await getDoc(doc(db, 'users', providerId));

      if (userDoc.exists()) {
        const data = userDoc.data();
        foundIn = 'users';

        // Reviews calculation for user (simplified)
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('providerId', '==', userDoc.id)
        );
        const reviewsSnapshot = await getDocs(reviewsQuery);

        let calculatedRating = 0;
        let calculatedCount = 0;

        if (!reviewsSnapshot.empty) {
          const ratings = reviewsSnapshot.docs
            .map((doc: any) => doc.data().rating)
            .filter((rating: any) => rating);
          calculatedCount = ratings.length;
          if (calculatedCount > 0) {
            calculatedRating =
              ratings.reduce((sum: number, rating: number) => sum + rating, 0) / calculatedCount;
          }
        }

        providerData = {
          id: userDoc.id,
          userName: data.userName || data.displayName,
          profilePictureFirebaseUrl: data.profilePictureFirebaseUrl,
          profilePictureURL: data.profilePictureURL,
          photoURL: data.photoURL,
          bio: data.bio,
          location: data.location,
          skills: data.skills || [],
          rating: calculatedRating,
          reviewCount: calculatedCount,
          completedJobs: data.completedJobs || 0,
          isCompany: false,
          priceRange: data.priceRange,
          responseTime: data.responseTime,
          hourlyRate: data.hourlyRate,
          email: data.email,
          phone: data.phone,
          website: data.website,
          languages: data.languages || [],
          portfolio: data.portfolio || [],
          stripeAccountId: data.stripeAccountId, // Top-level field from database
        };
      }
    }

    const result = {
      providerId,
      foundIn,
      timestamp: new Date().toISOString(),
      providerExists: !!providerData,
      providerData,
      // Specific stripe debugging
      stripeDebug: providerData
        ? {
            stripeAccountId: providerData.stripeAccountId,
            stripeAccountIdType: typeof providerData.stripeAccountId,
            stripeAccountIdExists: !!providerData.stripeAccountId,
            stripeAccountIdValid: providerData.stripeAccountId?.startsWith('acct_'),
            allKeys: Object.keys(providerData).filter(key => key.toLowerCase().includes('stripe')),
          }
        : null,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Provider Debug API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
