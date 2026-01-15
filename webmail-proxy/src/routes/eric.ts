/**
 * ERiC Router - API-Endpunkte für ELSTER-Übermittlung
 * 
 * Dieser Router leitet Anfragen an den Python ERiC-Microservice weiter.
 * Der Python-Service lädt die eigentliche ERiC C-Bibliothek.
 * 
 * @author Taskilo Team
 * @version 2.0.0
 */

import { Router, Request, Response } from 'express';
import { getEricService, UStVAData, SubmitUStVARequest } from '../services/EricService';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

// Zertifikate-Verzeichnis
const CERT_PATH = process.env.ERIC_CERT_PATH || '/opt/taskilo/eric/certificates';

// ERiC-Service Singleton
const ericService = getEricService();

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/eric/status
 * Gibt den Status des ERiC-Services zurück
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = await ericService.getStatus();
    
    // Prüfen ob Zertifikate vorhanden
    const certsExist = fs.existsSync(CERT_PATH);
    const certFiles = certsExist 
      ? fs.readdirSync(CERT_PATH).filter((f: string) => f.endsWith('.pfx')) 
      : [];

    res.json({
      success: status.success,
      service: 'taskilo-eric-proxy',
      version: '2.0.0',
      ericVersion: status.version,
      initialized: status.initialized,
      certificatesPath: CERT_PATH,
      certificatesAvailable: certFiles.length,
      capabilities: [
        'UStVA (Umsatzsteuer-Voranmeldung)',
        'Steuernummer-Validierung',
        'IBAN/BIC-Validierung',
        'Testfinanzämter-Abfrage',
      ],
      timestamp: new Date().toISOString(),
      message: status.message,
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'ERiC-Service nicht erreichbar',
      details: String(error),
    });
  }
});

/**
 * GET /api/eric/testfinanzaemter
 * Gibt die Liste der Testfinanzämter zurück
 */
router.get('/testfinanzaemter', async (req: Request, res: Response) => {
  try {
    const result = await ericService.getTestfinanzaemter();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Testfinanzämter',
      details: String(error),
    });
  }
});

/**
 * GET /api/eric/bundeslaender
 * Gibt die Bundesländer-Nummern zurück
 */
router.get('/bundeslaender', async (req: Request, res: Response) => {
  try {
    const result = await ericService.getBundeslaender();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Bundesländer',
      details: String(error),
    });
  }
});

/**
 * GET /api/eric/finanzaemter/:landNummer
 * Gibt die Finanzämter für ein Bundesland zurück
 */
router.get('/finanzaemter/:landNummer', async (req: Request, res: Response) => {
  try {
    const { landNummer } = req.params;
    const result = await ericService.getFinanzaemter(landNummer);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen der Finanzämter',
      details: String(error),
    });
  }
});

/**
 * POST /api/eric/validate-steuernummer
 * Validiert eine Steuernummer
 */
router.post('/validate-steuernummer', async (req: Request, res: Response) => {
  try {
    const { steuernummer } = req.body;

    if (!steuernummer) {
      return res.status(400).json({
        success: false,
        error: 'Steuernummer ist erforderlich',
      });
    }

    const result = await ericService.validateSteuernummer(steuernummer);
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Validierungsfehler',
      details: String(error),
    });
  }
});

/**
 * POST /api/eric/validate-iban
 * Validiert eine IBAN
 */
router.post('/validate-iban', async (req: Request, res: Response) => {
  try {
    const { iban } = req.body;

    if (!iban) {
      return res.status(400).json({
        success: false,
        error: 'IBAN ist erforderlich',
      });
    }

    const result = await ericService.validateIBAN(iban);
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'IBAN-Validierungsfehler',
      details: String(error),
    });
  }
});

/**
 * POST /api/eric/validate-bic
 * Validiert einen BIC
 */
router.post('/validate-bic', async (req: Request, res: Response) => {
  try {
    const { bic } = req.body;

    if (!bic) {
      return res.status(400).json({
        success: false,
        error: 'BIC ist erforderlich',
      });
    }

    const result = await ericService.validateBIC(bic);
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'BIC-Validierungsfehler',
      details: String(error),
    });
  }
});

/**
 * POST /api/eric/check-xml
 * Validiert XML gegen ERiC-Schema
 */
router.post('/check-xml', async (req: Request, res: Response) => {
  try {
    const { xml, datenartVersion } = req.body;

    if (!xml || !datenartVersion) {
      return res.status(400).json({
        success: false,
        error: 'XML und Datenart-Version sind erforderlich',
      });
    }

    const result = await ericService.checkXML(xml, datenartVersion);
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'XML-Validierungsfehler',
      details: String(error),
    });
  }
});

/**
 * POST /api/eric/generate-ustva-xml
 * Generiert UStVA-XML
 */
router.post('/generate-ustva-xml', async (req: Request, res: Response) => {
  try {
    const data = req.body as UStVAData;

    if (!data.steuernummer || !data.jahr || !data.zeitraum) {
      return res.status(400).json({
        success: false,
        error: 'Steuernummer, Jahr und Zeitraum sind erforderlich',
      });
    }

    const result = await ericService.generateUStVAXml(data);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Fehler bei der XML-Generierung',
      details: String(error),
    });
  }
});

/**
 * POST /api/eric/error-text
 * Holt Fehlertext für ERiC-Fehlercode
 */
router.post('/error-text', async (req: Request, res: Response) => {
  try {
    const { errorCode } = req.body;

    if (typeof errorCode !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Fehlercode ist erforderlich',
      });
    }

    const result = await ericService.getErrorText(errorCode);
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Fehler beim Abrufen des Fehlertexts',
      details: String(error),
    });
  }
});

/**
 * POST /api/eric/upload-certificate
 * Lädt ein ELSTER-Zertifikat für eine Firma hoch
 */
router.post('/upload-certificate', async (req: Request, res: Response) => {
  try {
    const { companyId, certificate, filename } = req.body;

    if (!companyId || !certificate) {
      return res.status(400).json({
        success: false,
        error: 'CompanyId und Zertifikat sind erforderlich',
      });
    }

    // Verzeichnis für Firma erstellen
    const companyDir = path.join(CERT_PATH, companyId);
    if (!fs.existsSync(companyDir)) {
      fs.mkdirSync(companyDir, { recursive: true });
    }

    // Zertifikat speichern
    const certBuffer = Buffer.from(certificate, 'base64');
    const certFilename = filename || 'elster.pfx';
    const certPath = path.join(companyDir, certFilename);
    
    fs.writeFileSync(certPath, certBuffer);
    
    // Berechtigungen setzen (nur lesbar für Owner)
    fs.chmodSync(certPath, 0o400);

    res.json({
      success: true,
      message: 'Zertifikat erfolgreich hochgeladen',
      path: certPath,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Fehler beim Hochladen des Zertifikats',
      details: String(error),
    });
  }
});

/**
 * GET /api/eric/certificate/:companyId/status
 * Prüft ob ein Zertifikat für die Firma vorhanden ist
 */
router.get('/certificate/:companyId/status', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    // Zuerst lokalen Dateistatus prüfen
    const certPath = path.join(CERT_PATH, companyId, 'elster.pfx');
    const localExists = fs.existsSync(certPath);

    let localFileInfo = null;
    if (localExists) {
      const stats = fs.statSync(certPath);
      localFileInfo = {
        size: stats.size,
        uploadedAt: stats.mtime.toISOString(),
      };
    }

    // Auch Python-Service fragen für zusätzliche Infos
    let pythonStatus = null;
    try {
      pythonStatus = await ericService.getCertificateStatus(companyId);
    } catch (error) {
      // Python-Service nicht erreichbar, nur lokale Infos nutzen
    }

    res.json({
      success: true,
      companyId,
      certificateExists: localExists || (pythonStatus?.certificate_exists ?? false),
      fileInfo: localFileInfo ?? pythonStatus?.file_info,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Fehler beim Prüfen des Zertifikatstatus',
      details: String(error),
    });
  }
});

/**
 * DELETE /api/eric/certificate/:companyId
 * Löscht das Zertifikat einer Firma
 */
router.delete('/certificate/:companyId', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    // Lokale Datei löschen
    const certPath = path.join(CERT_PATH, companyId, 'elster.pfx');
    if (fs.existsSync(certPath)) {
      fs.unlinkSync(certPath);
    }

    // Python-Service informieren
    try {
      await ericService.deleteCertificate(companyId);
    } catch (error) {
      // Ignorieren falls Service nicht erreichbar
    }

    res.json({
      success: true,
      message: 'Zertifikat erfolgreich gelöscht',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Fehler beim Löschen des Zertifikats',
      details: String(error),
    });
  }
});

/**
 * POST /api/eric/submit-ustva
 * Übermittelt UStVA an ELSTER
 * 
 * WICHTIG: Test-Modus ist standardmäßig aktiv!
 * Sendet an Testfinanzamt 9198, Testmerker 700000004
 */
router.post('/submit-ustva', async (req: Request, res: Response) => {
  try {
    const { companyId, pin, ustvaData, testMode } = req.body;

    if (!companyId || !pin || !ustvaData) {
      return res.status(400).json({
        success: false,
        error: 'CompanyId, PIN und UStVA-Daten sind erforderlich',
      });
    }

    // Zertifikat prüfen
    const certPath = path.join(CERT_PATH, companyId, 'elster.pfx');
    if (!fs.existsSync(certPath)) {
      return res.status(400).json({
        success: false,
        error: 'Kein ELSTER-Zertifikat vorhanden',
        details: 'Bitte laden Sie zuerst Ihr ELSTER-Zertifikat in den Einstellungen hoch.',
      });
    }

    // An Python ERiC-Service weiterleiten
    const request: SubmitUStVARequest = {
      company_id: companyId,
      pin,
      ustva_data: ustvaData,
      test_mode: testMode ?? true, // Standardmäßig Testmodus!
    };

    const result = await ericService.submitUStVA(request);

    res.json({
      success: result.success,
      transferTicket: result.transfer_ticket,
      serverResponse: result.server_response,
      errorCode: result.error_code,
      errorMessage: result.error_message,
      message: result.message,
      testMode: result.test_mode,
      submittedAt: result.submitted_at,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Fehler bei der ELSTER-Übermittlung',
      details: String(error),
    });
  }
});

export { router as ericRouter };
