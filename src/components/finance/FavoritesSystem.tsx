import React from 'react';
import { Star } from 'lucide-react';

/**
 * 🌟 DATEV FAVORITEN SYSTEM - INTEGRATION GUIDE
 * 
 * So integrieren Sie das Favoritensystem in Ihr CategorySelectionModal:
 * 
 * 1. FIRESTORE COLLECTION:
 *    companies/{companyId}/bookingAccounts/{datevCode}
 * 
 * 2. DATENSTRUKTUR:
 *    {
 *      id: "datev-6800",
 *      code: "6800", 
 *      name: "Porto",
 *      category: "buro",
 *      addedAt: timestamp,
 *      usageCount: 3,
 *      lastUsed: timestamp
 *    }
 * 
 * 3. UI KOMPONENTEN ZU HINZUFÜGEN:
 */

// React Component für Star-Icon (in CategorySelectionModal einfügen)
const FavoriteToggle = ({ 
  isFavorite, 
  onToggle,
  accountCode,
  size = 16 
}: {
  isFavorite: boolean;
  onToggle: (accountCode: string) => void;
  accountCode: string;
  size?: number;
}) => {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle(accountCode);
      }}
      className={`p-1 rounded-full hover:bg-gray-100 transition-colors ${
        isFavorite 
          ? 'text-yellow-500 hover:text-yellow-600' 
          : 'text-gray-400 hover:text-yellow-500'
      }`}
      title={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
    >
      {/* Star Icon from lucide-react */}
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill={isFavorite ? 'currentColor' : 'none'}
        stroke="currentColor" 
        strokeWidth="2"
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
      </svg>
    </button>
  );
};

// Favoriten Section (als separate Tab im Modal hinzufügen)
const FavoritesSection = ({ 
  favorites,
  onSelect,
  currentCompanyId 
}: {
  favorites: Array<{code: string, name: string, category: string, usageCount?: number}>;
  onSelect: (account: any) => void;
  currentCompanyId: string;
}) => {
  if (favorites.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Star className="mx-auto h-12 w-12 text-gray-300 mb-4" />
        <p className="text-sm">Noch keine Favoriten</p>
        <p className="text-xs mt-1">Klicken Sie auf ⭐ bei DATEV-Konten um sie zu favorisieren</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2 mb-4">
        <Star className="h-5 w-5 text-yellow-500" />
        <h3 className="font-medium text-gray-900">Favoriten ({favorites.length})</h3>
      </div>
      
      {favorites.map((favorite) => (
        <div
          key={favorite.code}
          onClick={() => onSelect({
            id: `datev-${favorite.code}`,
            name: `${favorite.code} - ${favorite.name}`,
            code: favorite.code,
            number: favorite.code,
            type: 'DATEV',
            automaticBooking: false
          })}
          className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
        >
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
              <div>
                <p className="font-medium text-gray-900 text-sm">
                  {favorite.code} - {favorite.name}
                </p>
                <p className="text-xs text-gray-500">
                  Kategorie: {favorite.category}
                  {favorite.usageCount && ` • ${favorite.usageCount}x verwendet`}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * 4. INTEGRATION IN CATEGORYSELECTIONMODAL:
 * 
 * A) State hinzufügen:
 * const [favoriteAccounts, setFavoriteAccounts] = useState([]);
 * const [showFavorites, setShowFavorites] = useState(false);
 * 
 * B) Favoriten laden:
 * useEffect(() => {
 *   if (currentCompanyId) {
 *     FavoriteDatevAccountService.getFavorites(currentCompanyId)
 *       .then(setFavoriteAccounts);
 *   }
 * }, [currentCompanyId]);
 * 
 * C) Tab-Navigation erweitern:
 * const tabs = [
 *   { id: 'categories', name: 'Kategorien', icon: Package },
 *   { id: 'favorites', name: 'Favoriten', icon: Star },
 *   { id: 'datev', name: 'DATEV', icon: Calculator }
 * ];
 * 
 * D) Star-Icon zu DATEV-Konten hinzufügen:
 * <div className="flex items-center justify-between">
 *   <div className="flex-1">
 *     <p className="font-medium text-gray-900 text-sm">{card.name}</p>
 *   </div>
 *   <FavoriteToggle 
 *     isFavorite={favoriteAccounts.some(fav => fav.code === card.code)}
 *     onToggle={handleToggleFavorite}
 *     accountCode={card.code}
 *   />
 * </div>
 * 
 * E) Toggle-Funktion:
 * const handleToggleFavorite = async (accountCode: string) => {
 *   const isFavorite = favoriteAccounts.some(fav => fav.code === accountCode);
 *   
 *   if (isFavorite) {
 *     await FavoriteDatevAccountService.removeFromFavorites(currentCompanyId, accountCode);
 *   } else {
 *     const card = datevCards.find(c => c.code === accountCode);
 *     const category = DatevCategoryMapper.mapDatevCardToExpenseCategory(card);
 *     await FavoriteDatevAccountService.addToFavorites(
 *       currentCompanyId, 
 *       accountCode, 
 *       card.name, 
 *       category
 *     );
 *   }
 *   
 *   // Favoriten neu laden
 *   const updatedFavorites = await FavoriteDatevAccountService.getFavorites(currentCompanyId);
 *   setFavoriteAccounts(updatedFavorites);
 * };
 */

export { FavoriteToggle, FavoritesSection };