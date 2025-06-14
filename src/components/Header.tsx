// Header.tsx
'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import AppHeaderNavigation from './AppHeaderNavigation'; // Pfad anpassen, falls nötig
import Link from 'next/link';
import { FiSearch, FiBell, FiMail, FiHelpCircle, FiChevronDown, FiGrid, FiBriefcase, FiUsers, FiAward, FiSettings, FiLogOut, FiFilePlus, FiInbox, FiCheckSquare } from 'react-icons/fi'; // Beispiel-Icons
import { User, getAuth, signOut } from 'firebase/auth'; // Für Benutzer-Infos und Logout
import { app } from '@/firebase/clients'; // Firebase App-Instanz
import { categories, Category } from '@/lib/categoriesData'; // Importiere Kategorien und Typ
import { useRouter } from 'next/navigation';

const auth = getAuth(app);

const Header: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false); // State für Such-Dropdown
    const [searchTerm, setSearchTerm] = useState(''); // NEU: State für den Suchbegriff
    const profileDropdownRef = useRef<HTMLDivElement>(null);
    const searchDropdownContainerRef = useRef<HTMLDivElement>(null); // Ref für Such-Dropdown-Container
    const searchInputRef = useRef<HTMLInputElement>(null); // Ref für das Such-Inputfeld
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            setCurrentUser(user);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        // Schließt das Dropdown, wenn außerhalb geklickt wird
        function handleClickOutside(event: MouseEvent) {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node) && isProfileDropdownOpen) {
                setIsProfileDropdownOpen(false);
            }
            // Schließt Such-Dropdown, wenn außerhalb geklickt wird
            if (searchDropdownContainerRef.current && !searchDropdownContainerRef.current.contains(event.target as Node) && isSearchDropdownOpen) {
                setIsSearchDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [profileDropdownRef, searchDropdownContainerRef, isProfileDropdownOpen, isSearchDropdownOpen]); // States hinzugefügt

    const handleSubcategorySelect = () => {
        setIsSearchDropdownOpen(false);
        if (searchInputRef.current) {
            // Suchfeld leeren nach Auswahl
            searchInputRef.current.value = '';
            setSearchTerm(''); // Auch den State zurücksetzen
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setIsProfileDropdownOpen(false);
            router.push('/login'); // Oder zur Startseite
        } catch (error) {
            console.error("Fehler beim Abmelden:", error);
        }
    };

    // NEU: Gefilterte Kategorien basierend auf dem Suchbegriff
    const filteredCategories = useMemo(() => {
        if (!searchTerm.trim()) {
            return categories; // Zeige alle, wenn kein Suchbegriff vorhanden ist
        }
        const lowerSearchTerm = searchTerm.toLowerCase();
        return categories
            .map(category => ({
                ...category,
                subcategories: category.subcategories.filter(subcategory =>
                    subcategory.toLowerCase().includes(lowerSearchTerm)
                ),
            }))
            .filter(category => category.subcategories.length > 0); // Nur Kategorien mit passenden Unterkategorien anzeigen
    }, [searchTerm]);

    return (
        <header className="bg-white shadow-sm sticky top-0 z-50">
            <div className="container mx-auto px-4 py-3">
                <div className="flex justify-between items-center">
                    {/* Logo */}
                    <Link href="/" className="text-3xl font-bold text-[#14ad9f]">
                        Tasko
                    </Link>

                    {/* Suchleiste (vereinfacht) */}
                    <div className="relative flex-grow max-w-xl mx-4" ref={searchDropdownContainerRef}>
                        <input
                            ref={searchInputRef}
                            type="search"
                            placeholder="Dienstleistung auswählen oder suchen..."
                            className="w-full p-2 pl-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#14ad9f] focus:border-transparent"
                            onFocus={() => setIsSearchDropdownOpen(true)}
                            onChange={(e) => setSearchTerm(e.target.value)} // NEU: Suchbegriff aktualisieren
                            value={searchTerm} // NEU: Input-Wert an State binden
                        />
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        {isSearchDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 w-full max-h-96 overflow-y-auto bg-white rounded-md shadow-lg z-30 ring-1 ring-black ring-opacity-5">
                                {filteredCategories.map((category: Category) => (
                                    <div key={category.title} className="p-2">
                                        <h3 className="font-semibold text-gray-700 px-2 text-sm sticky top-0 bg-gray-50 py-1">{category.title}</h3>
                                        <ul className="mt-1">
                                            {category.subcategories.map(subcategory => (
                                                <li key={subcategory}>
                                                    <Link
                                                        href={`/services/${encodeURIComponent(category.title.toLowerCase().replace(/\s+/g, '-'))}/${encodeURIComponent(subcategory.toLowerCase().replace(/\s+/g, '-'))}`}
                                                        className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-[#14ad9f] rounded"
                                                        onClick={handleSubcategorySelect}
                                                    >
                                                        {subcategory}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                                {filteredCategories.length === 0 && searchTerm.trim() && <p className="p-4 text-sm text-gray-500">Keine Übereinstimmungen für "{searchTerm}" gefunden.</p>}
                            </div>
                        )}
                    </div>

                    {/* Icons und Benutzerprofil */}
                    <div className="flex items-center space-x-4">
                        <button className="text-gray-600 hover:text-[#14ad9f]"><FiBell size={22} /></button>
                        <button className="text-gray-600 hover:text-[#14ad9f]"><FiMail size={22} /></button>
                        <button className="text-gray-600 hover:text-[#14ad9f]"><FiHelpCircle size={22} /></button>

                        {currentUser ? (
                            <div className="relative" ref={profileDropdownRef}>
                                <button onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)} className="flex items-center">
                                    <img src={currentUser.photoURL || '/default-avatar.png'} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                                    <FiChevronDown className={`ml-1 transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isProfileDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg py-1 z-30 ring-1 ring-black ring-opacity-5">
                                        <div className="px-4 py-3">
                                            <p className="text-sm font-semibold">{currentUser.displayName || currentUser.email}</p>
                                            <p className="text-xs text-gray-500">Benutzer</p>
                                        </div>
                                        <hr />
                                        <Link href={`/dashboard/user/${currentUser.uid}`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsProfileDropdownOpen(false)}><FiGrid className="inline mr-2" />Dashboard</Link>
                                        {/* Weitere Menüpunkte hier einfügen */}
                                        <Link href={`/dashboard/user/${currentUser.uid}/projects`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsProfileDropdownOpen(false)}><FiBriefcase className="inline mr-2" />Projekte</Link>
                                        <Link href={`/dashboard/user/${currentUser.uid}/orders/overview`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsProfileDropdownOpen(false)}><FiInbox className="inline mr-2" />Aufträge</Link>
                                        {/* ... weitere Links ... */}
                                        <Link href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsProfileDropdownOpen(false)}><FiFilePlus className="inline mr-2" />Eine Projektanfrage posten</Link>
                                        <hr />
                                        <Link href={`/dashboard/user/${currentUser.uid}/settings`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setIsProfileDropdownOpen(false)}><FiSettings className="inline mr-2" />Meine Einstellungen</Link>
                                        <button onClick={handleLogout} className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-gray-100"><FiLogOut className="inline mr-2" />Abmelden</button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link href="/login" className="text-sm font-medium text-[#14ad9f] hover:underline">
                                Anmelden
                            </Link>
                        )}
                    </div>
                </div>
            </div>
            {/* Die eigentliche Kategorien-Navigation kommt darunter */}
            <AppHeaderNavigation />
        </header>
    );
};

export default Header;
