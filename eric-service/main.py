"""
ELSTER ERiC Service - Python FastAPI Microservice für Steuerübermittlung

Dieser Service nutzt die offizielle ERiC-Bibliothek (Release 43) zur
elektronischen Übermittlung von Steuerdaten an ELSTER.
"""

import os
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ERiC-Bibliothek wird beim Start initialisiert
eric_instance = None

# Logging konfigurieren
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('eric-service')

# Pfade
ERIC_HOME = os.environ.get('ERIC_HOME', '/opt/taskilo/eric/lib')
ERIC_LOG_DIR = os.environ.get('ERIC_LOG_DIR', '/opt/taskilo/logs/eric')
ERIC_CERT_DIR = os.environ.get('ERIC_CERT_DIR', '/opt/taskilo/eric/certificates')


# ============================================================================
# ERiC Python Wrapper (basierend auf offiziellen Beispielen)
# ============================================================================

import ctypes
from ctypes import c_int, c_uint32, c_char_p, c_void_p, POINTER, byref, string_at, cast, CFUNCTYPE, Structure


class EricRueckgabepufferHandle(c_void_p):
    """Handle für ERiC-Rückgabepuffer"""
    pass


# ERiC verwendet c_uint32 für Zertifikat- und Transfer-Handles (laut offizieller Dokumentation)
EricZertifikatHandle = c_uint32
EricTransferHandle = c_uint32


# Callback-Typen
EricLogCallback = CFUNCTYPE(None, c_char_p, c_int, c_char_p, c_void_p)
EricFortschrittCallback = CFUNCTYPE(None, c_uint32, c_uint32, c_uint32, c_void_p)


class eric_verschluesselungs_parameter_t(Structure):
    """Verschlüsselungsparameter für signierte Übermittlung"""
    _fields_ = [
        ('version', c_uint32),
        ('zertifikatHandle', EricZertifikatHandle),
        ('pin', c_char_p)
    ]


def encode_str(s):
    """String zu UTF-8 bytes konvertieren"""
    if s is None:
        return None
    if isinstance(s, bytes):
        return s
    return s.encode('utf-8')


def decode_bytes(b):
    """Bytes zu String konvertieren"""
    if b is None:
        return None
    if isinstance(b, str):
        return b
    return b.decode('utf-8')


class PyEric:
    """Python-Wrapper für die ERiC-Bibliothek"""
    
    def __init__(self, home_dir: str, log_dir: Optional[str] = None):
        self._lib = None
        self._initialized = False
        
        # Bibliothek laden
        lib_path = os.path.join(home_dir, 'libericapi.so')
        if not os.path.exists(lib_path):
            raise RuntimeError(f'ERiC-Bibliothek nicht gefunden: {lib_path}')
        
        # LD_LIBRARY_PATH setzen für abhängige Bibliotheken
        current_ld_path = os.environ.get('LD_LIBRARY_PATH', '')
        if home_dir not in current_ld_path:
            os.environ['LD_LIBRARY_PATH'] = f'{home_dir}:{current_ld_path}'
        
        try:
            self._lib = ctypes.cdll.LoadLibrary(lib_path)
            self._setup_functions()
        except OSError as e:
            raise RuntimeError(f'ERiC-Bibliothek konnte nicht geladen werden: {e}')
        
        # ERiC initialisieren
        plugins_dir = home_dir.replace('/lib', '/plugins') if '/lib' in home_dir else os.path.join(home_dir, '..', 'plugins')
        rc = self._lib.EricInitialisiere(
            encode_str(plugins_dir),
            encode_str(log_dir) if log_dir else None
        )
        
        if rc != 0:
            raise RuntimeError(f'ERiC-Initialisierung fehlgeschlagen: Fehlercode {rc}')
        
        self._initialized = True
        logger.info(f'ERiC erfolgreich initialisiert (Home: {home_dir}, Logs: {log_dir})')
    
    def _setup_functions(self):
        """Funktions-Signaturen für ERiC-API definieren"""
        
        # EricInitialisiere
        self._lib.EricInitialisiere.restype = c_int
        self._lib.EricInitialisiere.argtypes = [c_char_p, c_char_p]
        
        # EricBeende
        self._lib.EricBeende.restype = c_int
        self._lib.EricBeende.argtypes = None
        
        # EricVersion
        self._lib.EricVersion.restype = c_int
        self._lib.EricVersion.argtypes = [EricRueckgabepufferHandle]
        
        # EricRueckgabepufferErzeugen
        self._lib.EricRueckgabepufferErzeugen.restype = EricRueckgabepufferHandle
        self._lib.EricRueckgabepufferErzeugen.argtypes = None
        
        # EricRueckgabepufferFreigeben
        self._lib.EricRueckgabepufferFreigeben.restype = c_int
        self._lib.EricRueckgabepufferFreigeben.argtypes = [EricRueckgabepufferHandle]
        
        # EricRueckgabepufferInhalt
        self._lib.EricRueckgabepufferInhalt.restype = POINTER(ctypes.c_char)
        self._lib.EricRueckgabepufferInhalt.argtypes = [EricRueckgabepufferHandle]
        
        # EricRueckgabepufferLaenge
        self._lib.EricRueckgabepufferLaenge.restype = c_uint32
        self._lib.EricRueckgabepufferLaenge.argtypes = [EricRueckgabepufferHandle]
        
        # EricPruefeSteuernummer
        self._lib.EricPruefeSteuernummer.restype = c_int
        self._lib.EricPruefeSteuernummer.argtypes = [c_char_p]
        
        # EricPruefeIBAN
        self._lib.EricPruefeIBAN.restype = c_int
        self._lib.EricPruefeIBAN.argtypes = [c_char_p]
        
        # EricPruefeBIC
        self._lib.EricPruefeBIC.restype = c_int
        self._lib.EricPruefeBIC.argtypes = [c_char_p]
        
        # EricHoleTestfinanzaemter
        self._lib.EricHoleTestfinanzaemter.restype = c_int
        self._lib.EricHoleTestfinanzaemter.argtypes = [EricRueckgabepufferHandle]
        
        # EricHoleFinanzaemter
        self._lib.EricHoleFinanzaemter.restype = c_int
        self._lib.EricHoleFinanzaemter.argtypes = [c_char_p, EricRueckgabepufferHandle]
        
        # EricHoleFinanzamtLandNummern
        self._lib.EricHoleFinanzamtLandNummern.restype = c_int
        self._lib.EricHoleFinanzamtLandNummern.argtypes = [EricRueckgabepufferHandle]
        
        # EricCheckXML
        self._lib.EricCheckXML.restype = c_int
        self._lib.EricCheckXML.argtypes = [c_char_p, c_char_p, EricRueckgabepufferHandle]
        
        # EricHoleFehlerText
        self._lib.EricHoleFehlerText.restype = c_int
        self._lib.EricHoleFehlerText.argtypes = [c_int, EricRueckgabepufferHandle]
        
        # EricSystemCheck
        self._lib.EricSystemCheck.restype = c_int
        self._lib.EricSystemCheck.argtypes = None
        
        # EricGetHandleToCertificate - Zertifikat-Handle holen (RICHTIGE Funktion!)
        self._lib.EricGetHandleToCertificate.restype = c_int
        self._lib.EricGetHandleToCertificate.argtypes = [
            POINTER(EricZertifikatHandle),  # Handle (output)
            POINTER(c_uint32),  # PIN-Support Info (output)
            c_char_p,  # Pfad zum Zertifikat
        ]
        
        # EricCloseHandleToCertificate - Zertifikat-Handle schließen
        self._lib.EricCloseHandleToCertificate.restype = c_int
        self._lib.EricCloseHandleToCertificate.argtypes = [EricZertifikatHandle]
        
        # EricBearbeiteVorgang - Hauptfunktion für Übermittlung
        self._lib.EricBearbeiteVorgang.restype = c_int
        self._lib.EricBearbeiteVorgang.argtypes = [
            c_char_p,  # XML-Daten
            c_char_p,  # Datenart-Version
            c_uint32,  # Bearbeitungsflags
            c_void_p,  # Druckparameter (optional)
            c_void_p,  # Zertifikat-Handle (optional)
            c_char_p,  # Abrufcode (optional)
            EricRueckgabepufferHandle,  # Rückgabepuffer
            EricRueckgabepufferHandle,  # Serverpuffer
        ]
    
    def __del__(self):
        if self._initialized and self._lib:
            self._lib.EricBeende()
            self._initialized = False
    
    def create_buffer(self) -> EricRueckgabepufferHandle:
        """Neuen Rückgabepuffer erstellen"""
        return self._lib.EricRueckgabepufferErzeugen()
    
    def free_buffer(self, handle: EricRueckgabepufferHandle) -> int:
        """Rückgabepuffer freigeben"""
        return self._lib.EricRueckgabepufferFreigeben(handle)
    
    def get_buffer_content(self, handle: EricRueckgabepufferHandle) -> bytes:
        """Inhalt eines Rückgabepuffers abrufen"""
        length = self._lib.EricRueckgabepufferLaenge(handle)
        if length == 0:
            return b''
        ptr = self._lib.EricRueckgabepufferInhalt(handle)
        return string_at(ptr, length)
    
    def get_version(self) -> str:
        """ERiC-Version abrufen"""
        buf = self.create_buffer()
        try:
            rc = self._lib.EricVersion(buf)
            if rc != 0:
                return f'Fehler: {rc}'
            return decode_bytes(self.get_buffer_content(buf))
        finally:
            self.free_buffer(buf)
    
    def validate_steuernummer(self, steuernummer: str) -> bool:
        """Steuernummer validieren"""
        rc = self._lib.EricPruefeSteuernummer(encode_str(steuernummer))
        return rc == 0
    
    def validate_iban(self, iban: str) -> bool:
        """IBAN validieren"""
        rc = self._lib.EricPruefeIBAN(encode_str(iban))
        return rc == 0
    
    def validate_bic(self, bic: str) -> bool:
        """BIC validieren"""
        rc = self._lib.EricPruefeBIC(encode_str(bic))
        return rc == 0
    
    def get_test_finanzaemter(self) -> str:
        """Liste der Testfinanzämter abrufen"""
        buf = self.create_buffer()
        try:
            rc = self._lib.EricHoleTestfinanzaemter(buf)
            if rc != 0:
                return f'<error code="{rc}"/>'
            return decode_bytes(self.get_buffer_content(buf))
        finally:
            self.free_buffer(buf)
    
    def get_finanzaemter(self, land_nummer: str) -> str:
        """Finanzämter für ein Bundesland abrufen"""
        buf = self.create_buffer()
        try:
            rc = self._lib.EricHoleFinanzaemter(encode_str(land_nummer), buf)
            if rc != 0:
                return f'<error code="{rc}"/>'
            return decode_bytes(self.get_buffer_content(buf))
        finally:
            self.free_buffer(buf)
    
    def get_bundeslaender(self) -> str:
        """Bundesländer-Nummern abrufen"""
        buf = self.create_buffer()
        try:
            rc = self._lib.EricHoleFinanzamtLandNummern(buf)
            if rc != 0:
                return f'<error code="{rc}"/>'
            return decode_bytes(self.get_buffer_content(buf))
        finally:
            self.free_buffer(buf)
    
    def check_xml(self, xml: str, datenart_version: str) -> dict:
        """XML gegen ERiC-Schema validieren"""
        buf = self.create_buffer()
        try:
            rc = self._lib.EricCheckXML(
                encode_str(xml),
                encode_str(datenart_version),
                buf
            )
            content = decode_bytes(self.get_buffer_content(buf))
            return {
                'valid': rc == 0,
                'error_code': rc,
                'message': content if content else None
            }
        finally:
            self.free_buffer(buf)
    
    def get_error_text(self, error_code: int) -> str:
        """Fehlertext für Fehlercode abrufen"""
        buf = self.create_buffer()
        try:
            rc = self._lib.EricHoleFehlerText(error_code, buf)
            if rc != 0:
                return f'Unbekannter Fehler: {error_code}'
            return decode_bytes(self.get_buffer_content(buf))
        finally:
            self.free_buffer(buf)
    
    def system_check(self) -> bool:
        """Systemprüfung durchführen"""
        rc = self._lib.EricSystemCheck()
        return rc == 0
    
    def load_certificate(self, cert_path: str) -> tuple:
        """
        Zertifikat laden und Handle zurückgeben.
        WICHTIG: Die PIN wird NICHT hier übergeben, sondern erst beim Bearbeiten!
        
        Returns: (success: bool, handle: int, pin_support: int, error_code: int)
        """
        cert_handle = EricZertifikatHandle(0)
        pin_support = c_uint32(0)
        
        rc = self._lib.EricGetHandleToCertificate(
            byref(cert_handle),
            byref(pin_support),
            encode_str(cert_path)
        )
        
        if rc != 0:
            error_text = self.get_error_text(rc)
            logger.error(f'Zertifikat laden fehlgeschlagen: {rc} - {error_text}')
            return (False, 0, 0, rc)
        
        logger.info(f'Zertifikat erfolgreich geladen: {cert_path} (Handle: {cert_handle.value}, PIN-Support: {pin_support.value})')
        return (True, cert_handle.value, pin_support.value, 0)
    
    def close_certificate(self, cert_handle: int) -> bool:
        """Zertifikat-Handle schließen"""
        if cert_handle == 0:
            return True
        rc = self._lib.EricCloseHandleToCertificate(EricZertifikatHandle(cert_handle))
        return rc == 0
    
    def submit_to_elster(
        self,
        xml: str,
        datenart_version: str,
        cert_handle: int = 0,
        pin: str = None,
        test_mode: bool = True
    ) -> dict:
        """
        Daten an ELSTER übermitteln.
        
        Args:
            xml: Die zu übermittelnden XML-Daten
            datenart_version: z.B. 'UStVA_2025'
            cert_handle: Zertifikat-Handle (int, 0 = keine Signatur)
            pin: Zertifikat-PIN für signierte Übermittlung
            test_mode: True für Testübermittlung
        
        Returns:
            dict mit success, transfer_ticket, server_response, error_code
        """
        response_buf = self.create_buffer()
        server_buf = self.create_buffer()
        
        try:
            # Bearbeitungsflags
            # 1 = Validieren, 2 = Senden, 4 = Drucken
            flags = 3  # Validieren + Senden
            
            # Verschlüsselungsparameter erstellen wenn Zertifikat vorhanden
            crypto_param = None
            if cert_handle != 0 and pin:
                crypto_param = eric_verschluesselungs_parameter_t()
                crypto_param.version = 3  # Version 3 laut offizieller ERiC-Dokumentation!
                crypto_param.zertifikatHandle = EricZertifikatHandle(cert_handle)
                crypto_param.pin = encode_str(pin)
                logger.info(f'Verschlüsselungsparameter erstellt (Handle: {cert_handle})')
            
            rc = self._lib.EricBearbeiteVorgang(
                encode_str(xml),
                encode_str(datenart_version),
                c_uint32(flags),
                None,  # Druckparameter
                byref(crypto_param) if crypto_param else None,  # Verschlüsselungsparameter
                None,  # Abrufcode
                response_buf,
                server_buf
            )
            
            response_content = decode_bytes(self.get_buffer_content(response_buf))
            server_content = decode_bytes(self.get_buffer_content(server_buf))
            
            if rc == 0:
                # Transfer-Ticket aus Server-Antwort extrahieren
                transfer_ticket = self._extract_transfer_ticket(server_content)
                
                return {
                    'success': True,
                    'error_code': 0,
                    'transfer_ticket': transfer_ticket,
                    'server_response': server_content,
                    'eric_response': response_content,
                    'message': 'Übermittlung erfolgreich'
                }
            else:
                error_text = self.get_error_text(rc)
                return {
                    'success': False,
                    'error_code': rc,
                    'transfer_ticket': None,
                    'server_response': server_content,
                    'eric_response': response_content,
                    'message': error_text
                }
        finally:
            self.free_buffer(response_buf)
            self.free_buffer(server_buf)
    
    def _extract_transfer_ticket(self, server_response: str) -> str:
        """Transfer-Ticket aus Server-Antwort extrahieren"""
        if not server_response:
            return None
        
        # Einfaches Pattern-Matching für Transfer-Ticket
        import re
        match = re.search(r'<TransferTicket>([^<]+)</TransferTicket>', server_response)
        if match:
            return match.group(1)
        
        # Alternative: Telenummer
        match = re.search(r'<Telenummer>([^<]+)</Telenummer>', server_response)
        if match:
            return match.group(1)
        
        return None


# ============================================================================
# API-Modelle
# ============================================================================

class StatusResponse(BaseModel):
    success: bool
    version: Optional[str] = None
    initialized: bool
    timestamp: str
    message: Optional[str] = None


class ValidateSteuernummerRequest(BaseModel):
    steuernummer: str = Field(..., min_length=10, max_length=20)


class ValidateSteuernummerResponse(BaseModel):
    valid: bool
    steuernummer: str
    message: Optional[str] = None


class ValidateIBANRequest(BaseModel):
    iban: str = Field(..., min_length=15, max_length=34)


class ValidateBICRequest(BaseModel):
    bic: str = Field(..., min_length=8, max_length=11)


class ValidateBankResponse(BaseModel):
    valid: bool
    value: str
    message: Optional[str] = None


class CheckXMLRequest(BaseModel):
    xml: str
    datenart_version: str = Field(..., description="z.B. 'UStVA_2025' oder 'ESt_2024'")


class CheckXMLResponse(BaseModel):
    valid: bool
    error_code: int
    message: Optional[str] = None


class ErrorTextRequest(BaseModel):
    error_code: int


class ErrorTextResponse(BaseModel):
    error_code: int
    message: str


class UStVAData(BaseModel):
    """Daten für UStVA (Umsatzsteuer-Voranmeldung)"""
    steuernummer: str
    jahr: int = Field(..., ge=2020, le=2030)
    zeitraum: str = Field(..., description="Monat (01-12) oder Quartal (41-44)")
    
    # Lieferungen und Leistungen
    kz81: float = Field(default=0, description="Steuerpflichtige Umsätze 19%")
    kz86: float = Field(default=0, description="Steuerpflichtige Umsätze 7%")
    kz35: float = Field(default=0, description="Umsätze land/forstwirtschaftl. Betriebe")
    kz36: float = Field(default=0, description="Umsätze Sägewerke")
    kz77: float = Field(default=0, description="Steuerpflichtige Innergemeinschaftl. Erwerbe 19%")
    kz76: float = Field(default=0, description="Steuerpflichtige Innergemeinschaftl. Erwerbe 7%")
    
    # Steuerfreie Umsätze
    kz41: float = Field(default=0, description="Innergemeinschaftliche Lieferungen")
    kz44: float = Field(default=0, description="Steuerfreie Umsätze mit Vorsteuerabzug")
    kz49: float = Field(default=0, description="Steuerfreie Umsätze ohne Vorsteuerabzug")
    
    # Vorsteuer
    kz66: float = Field(default=0, description="Vorsteuerbeträge aus Rechnungen")
    kz61: float = Field(default=0, description="Vorsteuer aus innergemeinschaftl. Erwerb")
    kz62: float = Field(default=0, description="Entstandene Einfuhrumsatzsteuer")
    kz67: float = Field(default=0, description="Vorsteuer nach §13b UStG")
    kz63: float = Field(default=0, description="Vorsteuerberichtigung")
    kz64: float = Field(default=0, description="Vorsteuerberichtigung §15a")
    
    # Sonstiges
    kz83: float = Field(default=0, description="Verbleibende USt-Vorauszahlung/Überschuss")
    
    # Dauerfristverlängerung
    kz26: float = Field(default=0, description="Sondervorauszahlung 1/11")
    
    # Kontaktdaten
    name: Optional[str] = None
    strasse: Optional[str] = None
    plz: Optional[str] = None
    ort: Optional[str] = None
    telefon: Optional[str] = None
    email: Optional[str] = None


class GenerateXMLResponse(BaseModel):
    success: bool
    xml: Optional[str] = None
    message: Optional[str] = None


class SubmitUStVARequest(BaseModel):
    """Anfrage für UStVA-Übermittlung"""
    company_id: str = Field(..., description="Firmen-ID für Zertifikat-Zuordnung")
    pin: str = Field(..., min_length=4, max_length=20, description="Zertifikat-PIN")
    ustva_data: UStVAData
    test_mode: bool = Field(default=True, description="Testmodus (Finanzamt 9198)")


class SubmitUStVAResponse(BaseModel):
    """Antwort für UStVA-Übermittlung"""
    success: bool
    transfer_ticket: Optional[str] = None
    server_response: Optional[str] = None
    eric_response: Optional[str] = None
    error_code: int = 0
    message: Optional[str] = None
    submitted_at: Optional[str] = None
    test_mode: bool = True


class CertificateStatusResponse(BaseModel):
    """Zertifikat-Status Antwort"""
    success: bool
    company_id: str
    certificate_exists: bool
    file_info: Optional[dict] = None
    message: Optional[str] = None


# ============================================================================
# FastAPI App
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle-Management für ERiC-Initialisierung"""
    global eric_instance
    
    try:
        # ERiC beim Start initialisieren
        os.makedirs(ERIC_LOG_DIR, exist_ok=True)
        eric_instance = PyEric(ERIC_HOME, ERIC_LOG_DIR)
        logger.info('ERiC-Service erfolgreich gestartet')
        yield
    except Exception as e:
        logger.error(f'ERiC-Initialisierung fehlgeschlagen: {e}')
        eric_instance = None
        yield
    finally:
        # ERiC beim Beenden freigeben
        if eric_instance:
            del eric_instance
            eric_instance = None
        logger.info('ERiC-Service beendet')


app = FastAPI(
    title='Taskilo ERiC Service',
    description='ELSTER ERiC API für elektronische Steuerübermittlung',
    version='1.0.0',
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=['https://taskilo.de', 'https://www.taskilo.de', 'https://mail.taskilo.de'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


def get_eric() -> PyEric:
    """Dependency für ERiC-Instanz"""
    if eric_instance is None:
        raise HTTPException(
            status_code=503,
            detail='ERiC-Bibliothek nicht initialisiert'
        )
    return eric_instance


# ============================================================================
# API-Endpunkte
# ============================================================================

@app.get('/health')
async def health_check():
    """Health Check Endpunkt"""
    return {'status': 'ok', 'service': 'eric-service'}


@app.get('/status', response_model=StatusResponse)
async def get_status():
    """ERiC-Status und Version abrufen"""
    if eric_instance is None:
        return StatusResponse(
            success=False,
            initialized=False,
            timestamp=datetime.utcnow().isoformat(),
            message='ERiC-Bibliothek nicht initialisiert'
        )
    
    try:
        version = eric_instance.get_version()
        system_ok = eric_instance.system_check()
        
        return StatusResponse(
            success=True,
            version=version,
            initialized=True,
            timestamp=datetime.utcnow().isoformat(),
            message='System OK' if system_ok else 'Systemprüfung fehlgeschlagen'
        )
    except Exception as e:
        return StatusResponse(
            success=False,
            initialized=True,
            timestamp=datetime.utcnow().isoformat(),
            message=str(e)
        )


@app.get('/testfinanzaemter')
async def get_testfinanzaemter(eric: PyEric = Depends(get_eric)):
    """Liste der Testfinanzämter abrufen"""
    xml = eric.get_test_finanzaemter()
    return {'success': True, 'data': xml}


@app.get('/bundeslaender')
async def get_bundeslaender(eric: PyEric = Depends(get_eric)):
    """Bundesländer-Nummern für Finanzämter abrufen"""
    xml = eric.get_bundeslaender()
    return {'success': True, 'data': xml}


@app.get('/finanzaemter/{land_nummer}')
async def get_finanzaemter(land_nummer: str, eric: PyEric = Depends(get_eric)):
    """Finanzämter für ein Bundesland abrufen"""
    xml = eric.get_finanzaemter(land_nummer)
    return {'success': True, 'data': xml}


@app.post('/validate-steuernummer', response_model=ValidateSteuernummerResponse)
async def validate_steuernummer(
    request: ValidateSteuernummerRequest,
    eric: PyEric = Depends(get_eric)
):
    """Steuernummer validieren"""
    # Formatierung entfernen
    clean_stnr = request.steuernummer.replace('/', '').replace(' ', '')
    
    valid = eric.validate_steuernummer(clean_stnr)
    
    return ValidateSteuernummerResponse(
        valid=valid,
        steuernummer=request.steuernummer,
        message=None if valid else 'Ungültige Steuernummer'
    )


@app.post('/validate-iban', response_model=ValidateBankResponse)
async def validate_iban(
    request: ValidateIBANRequest,
    eric: PyEric = Depends(get_eric)
):
    """IBAN validieren"""
    clean_iban = request.iban.replace(' ', '').upper()
    valid = eric.validate_iban(clean_iban)
    
    return ValidateBankResponse(
        valid=valid,
        value=request.iban,
        message=None if valid else 'Ungültige IBAN'
    )


@app.post('/validate-bic', response_model=ValidateBankResponse)
async def validate_bic(
    request: ValidateBICRequest,
    eric: PyEric = Depends(get_eric)
):
    """BIC validieren"""
    clean_bic = request.bic.replace(' ', '').upper()
    valid = eric.validate_bic(clean_bic)
    
    return ValidateBankResponse(
        valid=valid,
        value=request.bic,
        message=None if valid else 'Ungültiger BIC'
    )


@app.post('/check-xml', response_model=CheckXMLResponse)
async def check_xml(
    request: CheckXMLRequest,
    eric: PyEric = Depends(get_eric)
):
    """XML gegen ERiC-Schema validieren"""
    result = eric.check_xml(request.xml, request.datenart_version)
    return CheckXMLResponse(**result)


@app.post('/error-text', response_model=ErrorTextResponse)
async def get_error_text(
    request: ErrorTextRequest,
    eric: PyEric = Depends(get_eric)
):
    """Fehlertext für ERiC-Fehlercode abrufen"""
    message = eric.get_error_text(request.error_code)
    return ErrorTextResponse(
        error_code=request.error_code,
        message=message
    )


@app.post('/generate-ustva-xml', response_model=GenerateXMLResponse)
async def generate_ustva_xml(data: UStVAData):
    """UStVA-XML generieren"""
    try:
        xml = generate_ustva_xml_content(data)
        return GenerateXMLResponse(success=True, xml=xml)
    except Exception as e:
        return GenerateXMLResponse(success=False, message=str(e))


@app.post('/submit-ustva', response_model=SubmitUStVAResponse)
async def submit_ustva(
    request: SubmitUStVARequest,
    eric: PyEric = Depends(get_eric)
):
    """
    UStVA an ELSTER übermitteln.
    
    WICHTIG: Testmodus ist standardmäßig aktiviert!
    Im Testmodus wird an Testfinanzamt 9198 gesendet.
    """
    cert_handle = 0
    
    try:
        # 1. Zertifikat-Pfad ermitteln
        cert_path = os.path.join(ERIC_CERT_DIR, request.company_id, 'elster.pfx')
        
        if not os.path.exists(cert_path):
            return SubmitUStVAResponse(
                success=False,
                error_code=610201001,
                message=f'ELSTER-Zertifikat nicht gefunden. Bitte laden Sie zuerst ein Zertifikat hoch.',
                test_mode=request.test_mode
            )
        
        # 2. Zertifikat-Handle holen (ohne PIN - die kommt erst beim Bearbeiten!)
        success, cert_handle, pin_support, error_code = eric.load_certificate(cert_path)
        
        if not success:
            error_text = eric.get_error_text(error_code)
            
            # Spezifische Fehlermeldung für Zertifikat-Fehler
            if error_code == 610201002:
                message = 'Zertifikat konnte nicht gelesen werden. Möglicherweise ist die Datei beschädigt.'
            else:
                message = f'Zertifikat konnte nicht geladen werden: {error_text}'
            
            return SubmitUStVAResponse(
                success=False,
                error_code=error_code,
                message=message,
                test_mode=request.test_mode
            )
        
        logger.info(f'Zertifikat geladen: Handle={cert_handle}, PIN-Support={pin_support}')
        
        # 3. XML generieren
        # Im Testmodus: Testfinanzamt 9198 verwenden
        ustva_data = request.ustva_data
        if request.test_mode:
            # Testmerker im XML aktivieren (700000004 = Test)
            logger.info(f'Testmodus aktiv: Sende an Testfinanzamt 9198')
        
        xml = generate_ustva_xml_content(ustva_data, test_mode=request.test_mode)
        
        # 4. XML validieren
        datenart_version = f'UStVA_{ustva_data.jahr}'
        check_result = eric.check_xml(xml, datenart_version)
        
        if not check_result['valid']:
            return SubmitUStVAResponse(
                success=False,
                error_code=check_result['error_code'],
                message=f'XML-Validierung fehlgeschlagen: {check_result["message"]}',
                test_mode=request.test_mode
            )
        
        # 5. An ELSTER übermitteln (mit PIN für signierte Übermittlung)
        result = eric.submit_to_elster(
            xml=xml,
            datenart_version=datenart_version,
            cert_handle=cert_handle,
            pin=request.pin,
            test_mode=request.test_mode
        )
        
        return SubmitUStVAResponse(
            success=result['success'],
            transfer_ticket=result.get('transfer_ticket'),
            server_response=result.get('server_response'),
            eric_response=result.get('eric_response'),
            error_code=result.get('error_code', 0),
            message=result.get('message'),
            submitted_at=datetime.utcnow().isoformat() if result['success'] else None,
            test_mode=request.test_mode
        )
        
    except Exception as e:
        logger.error(f'Fehler bei UStVA-Übermittlung: {e}')
        return SubmitUStVAResponse(
            success=False,
            error_code=610001001,
            message=str(e),
            test_mode=request.test_mode
        )
    finally:
        # Zertifikat-Handle immer schließen
        if cert_handle != 0:
            eric.close_certificate(cert_handle)


@app.get('/certificate/{company_id}/status', response_model=CertificateStatusResponse)
async def get_certificate_status(company_id: str):
    """Prüft ob ein ELSTER-Zertifikat für die Firma vorhanden ist"""
    cert_path = os.path.join(ERIC_CERT_DIR, company_id, 'elster.pfx')
    
    if os.path.exists(cert_path):
        stat = os.stat(cert_path)
        return CertificateStatusResponse(
            success=True,
            company_id=company_id,
            certificate_exists=True,
            file_info={
                'size': stat.st_size,
                'uploaded_at': datetime.fromtimestamp(stat.st_mtime).isoformat()
            }
        )
    
    return CertificateStatusResponse(
        success=True,
        company_id=company_id,
        certificate_exists=False,
        message='Kein Zertifikat vorhanden'
    )


@app.delete('/certificate/{company_id}')
async def delete_certificate(company_id: str):
    """Löscht das ELSTER-Zertifikat einer Firma"""
    cert_path = os.path.join(ERIC_CERT_DIR, company_id, 'elster.pfx')
    
    if not os.path.exists(cert_path):
        raise HTTPException(status_code=404, detail='Zertifikat nicht gefunden')
    
    try:
        os.remove(cert_path)
        # Verzeichnis auch löschen wenn leer
        cert_dir = os.path.dirname(cert_path)
        if os.path.isdir(cert_dir) and not os.listdir(cert_dir):
            os.rmdir(cert_dir)
        
        return {'success': True, 'message': 'Zertifikat erfolgreich gelöscht'}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def generate_ustva_xml_content(data: UStVAData, test_mode: bool = True) -> str:
    """UStVA-XML-Struktur generieren (konform mit ELSTER Schema v11)
    
    Args:
        data: UStVA-Daten
        test_mode: True für Testübermittlung (Finanzamt 9198)
    """
    
    # Testmerker: 700000004 = Testfall, 000000000 = Echtfall
    testmerker = '700000004' if test_mode else '000000000'
    
    # Steuernummer
    steuernummer = data.steuernummer
    
    # Finanzamt aus Steuernummer extrahieren (erste 4 Ziffern)
    finanzamt = steuernummer[:4] if len(steuernummer) >= 4 else '9198'
    
    # Im Testmodus immer Testfinanzamt
    if test_mode:
        finanzamt = '9198'
        logger.info(f'Testmodus: Verwende Testfinanzamt {finanzamt}')
    
    # Erstellungsdatum
    erstellungsdatum = datetime.now().strftime('%Y%m%d')
    
    # DatenLieferant-String (Semikolon-separiert) - nur nicht-leere Werte
    dl_parts = [
        data.name or 'Taskilo',
        data.strasse or '',
        '',  # Hausnummer
        '',  # HausNrZusatz
        '',  # AnschriftenZusatz
        data.plz or '',
        data.ort or '',
        'Deutschland',
        data.telefon or '',
        data.email or ''
    ]
    datenlieferant_str = ';'.join(dl_parts)
    
    # DatenLieferant-Block nur mit nicht-leeren Werten
    datenlieferant_xml = f'<Name>{data.name or "Taskilo GmbH"}</Name>'
    if data.strasse:
        datenlieferant_xml += f'\n                        <Strasse>{data.strasse}</Strasse>'
    if data.plz:
        datenlieferant_xml += f'\n                        <PLZ>{data.plz}</PLZ>'
    if data.ort:
        datenlieferant_xml += f'\n                        <Ort>{data.ort}</Ort>'
    if data.telefon:
        datenlieferant_xml += f'\n                        <Telefon>{data.telefon}</Telefon>'
    if data.email:
        datenlieferant_xml += f'\n                        <Email>{data.email}</Email>'
    
    xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<Elster xmlns="http://www.elster.de/elsterxml/schema/v11">
    <TransferHeader version="11">
        <Verfahren>ElsterAnmeldung</Verfahren>
        <DatenArt>UStVA</DatenArt>
        <Vorgang>send-Auth</Vorgang>
        <Testmerker>{testmerker}</Testmerker>
        <HerstellerID>74931</HerstellerID>
        <DatenLieferant>{datenlieferant_str}</DatenLieferant>
        <Datei>
            <Verschluesselung>CMSEncryptedData</Verschluesselung>
            <Kompression>GZIP</Kompression>
        </Datei>
    </TransferHeader>
    <DatenTeil>
        <Nutzdatenblock>
            <NutzdatenHeader version="11">
                <NutzdatenTicket>1</NutzdatenTicket>
                <Empfaenger id="F">{finanzamt}</Empfaenger>
                <Hersteller>
                    <ProduktName>Taskilo</ProduktName>
                    <ProduktVersion>1.0.0</ProduktVersion>
                </Hersteller>
            </NutzdatenHeader>
            <Nutzdaten>
                <Anmeldungssteuern xmlns="http://finkonsens.de/elster/elsteranmeldung/ustva/v{data.jahr}" version="{data.jahr}">
                    <Erstellungsdatum>{erstellungsdatum}</Erstellungsdatum>
                    <DatenLieferant>
                        {datenlieferant_xml}
                    </DatenLieferant>
                    <Steuerfall>
                        <Umsatzsteuervoranmeldung>
                            <Jahr>{data.jahr}</Jahr>
                            <Zeitraum>{data.zeitraum}</Zeitraum>
                            <Steuernummer>{steuernummer}</Steuernummer>
                            <Kz09>74931</Kz09>'''
    
    # Kennzahlen formatieren:
    # - Bemessungsgrundlagen (Umsätze wie Kz81, Kz86, Kz35, Kz41, Kz44, Kz49, Kz77, Kz76): ganze Zahlen
    # - Steuerbeträge (wie Kz83, Kz66, Kz26, Kz36, Kz61, Kz62, Kz67, Kz63, Kz64): mit 2 Dezimalstellen
    
    # Bemessungsgrundlagen (ganze Zahlen)
    if data.kz81 != 0:
        xml += f'''
                            <Kz81>{int(data.kz81)}</Kz81>'''
    if data.kz86 != 0:
        xml += f'''
                            <Kz86>{int(data.kz86)}</Kz86>'''
    if data.kz35 != 0:
        xml += f'''
                            <Kz35>{int(data.kz35)}</Kz35>'''
    if data.kz77 != 0:
        xml += f'''
                            <Kz77>{int(data.kz77)}</Kz77>'''
    if data.kz76 != 0:
        xml += f'''
                            <Kz76>{int(data.kz76)}</Kz76>'''
    if data.kz41 != 0:
        xml += f'''
                            <Kz41>{int(data.kz41)}</Kz41>'''
    if data.kz44 != 0:
        xml += f'''
                            <Kz44>{int(data.kz44)}</Kz44>'''
    if data.kz49 != 0:
        xml += f'''
                            <Kz49>{int(data.kz49)}</Kz49>'''
    
    # Steuerbeträge (2 Dezimalstellen mit Punkt!)
    if data.kz36 != 0:
        xml += f'''
                            <Kz36>{data.kz36:.2f}</Kz36>'''
    if data.kz66 != 0:
        xml += f'''
                            <Kz66>{data.kz66:.2f}</Kz66>'''
    if data.kz61 != 0:
        xml += f'''
                            <Kz61>{data.kz61:.2f}</Kz61>'''
    if data.kz62 != 0:
        xml += f'''
                            <Kz62>{data.kz62:.2f}</Kz62>'''
    if data.kz67 != 0:
        xml += f'''
                            <Kz67>{data.kz67:.2f}</Kz67>'''
    if data.kz63 != 0:
        xml += f'''
                            <Kz63>{data.kz63:.2f}</Kz63>'''
    if data.kz64 != 0:
        xml += f'''
                            <Kz64>{data.kz64:.2f}</Kz64>'''
    if data.kz83 != 0:
        xml += f'''
                            <Kz83>{data.kz83:.2f}</Kz83>'''
    if data.kz26 != 0:
        xml += f'''
                            <Kz26>{data.kz26:.2f}</Kz26>'''
    
    xml += '''
                        </Umsatzsteuervoranmeldung>
                    </Steuerfall>
                </Anmeldungssteuern>
            </Nutzdaten>
        </Nutzdatenblock>
    </DatenTeil>
</Elster>'''
    
    return xml


# ============================================================================
# Hauptprogramm
# ============================================================================

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8001)
