/**
 * Escrow API Routes
 * 
 * POST /api/payment/escrow - Escrow Operationen
 * 
 * Actions:
 * - create: Neuen Escrow erstellen
 * - hold: Escrow als gehalten markieren (Zahlung eingegangen)
 * - release: Escrow freigeben (Auszahlung initiieren)
 * - refund: Escrow erstatten
 * - dispute: Escrow disputieren
 * - early-release: Vorzeitige Freigabe durch Käufer
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth, authErrorResponse, isAuthorizedForCompany } from '@/lib/apiAuth';
import { EscrowServiceServer as EscrowService } from '@/services/payment/EscrowServiceServer';
import { RevolutCheckoutService } from '@/services/payment/RevolutCheckoutService';

export async function POST(request: NextRequest) {
  try {
    // Authentifizierung prüfen
    const authResult = await verifyApiAuth(request);
    if (!authResult.success) {
      return authErrorResponse(authResult);
    }

    const body = await request.json();
    const { action, ...params } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'create': {
        const { 
          orderId, 
          buyerId, 
          providerId, 
          amount, 
          currency, 
          clearingDays, 
          description, 
          paymentMethod,
          // Marktplatz-spezifische Felder
          proposalId,
          projectId,
          isMarketplaceOrder,
          orderDetails,
        } = params;

        if (!orderId || !buyerId || !providerId || !amount) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields: orderId, buyerId, providerId, amount' },
            { status: 400 }
          );
        }

        // Nur Käufer oder Admin darf Escrow erstellen
        if (authResult.userId !== buyerId) {
          const hasAccess = isAuthorizedForCompany(authResult.userId, buyerId, authResult.token);
          if (!hasAccess) {
            return NextResponse.json(
              { success: false, error: 'Not authorized to create escrow for this buyer' },
              { status: 403 }
            );
          }
        }

        // Metadata für Marktplatz-Aufträge vorbereiten
        const metadata: Record<string, unknown> = {};
        if (isMarketplaceOrder) {
          metadata.isMarketplaceOrder = true;
          metadata.proposalId = proposalId;
          metadata.projectId = projectId;
          metadata.orderDetails = orderDetails;
        }

        const escrow = await EscrowService.create({
          orderId,
          buyerId,
          providerId,
          amount: Number(amount),
          currency,
          clearingDays: clearingDays ? Number(clearingDays) : undefined,
          description,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        });

        // Bei Kartenzahlung: Revolut Checkout erstellen
        if (paymentMethod === 'card') {
          console.log('[Escrow API] Creating Revolut checkout for escrow:', escrow.id);
          
          const checkoutResult = await RevolutCheckoutService.createOrder({
            amount: Number(amount),
            currency: currency || 'EUR',
            orderId: escrow.id,
            description: description || `Auftrag ${orderId.slice(-8).toUpperCase()}`,
          });

          console.log('[Escrow API] Revolut checkout result:', JSON.stringify(checkoutResult));

          if (!checkoutResult.success) {
            return NextResponse.json({
              success: false,
              error: checkoutResult.error || 'Fehler beim Erstellen des Checkouts',
            }, { status: 500 });
          }

          return NextResponse.json({
            success: true,
            escrow,
            checkoutUrl: checkoutResult.checkoutUrl,
            revolutOrderId: checkoutResult.order?.id,
          });
        }

        return NextResponse.json({
          success: true,
          escrow,
        });
      }

      case 'hold': {
        const { escrowId, paymentId } = params;

        if (!escrowId) {
          return NextResponse.json(
            { success: false, error: 'escrowId required' },
            { status: 400 }
          );
        }

        await EscrowService.markAsHeld(escrowId, paymentId);

        return NextResponse.json({
          success: true,
          message: 'Escrow marked as held',
        });
      }

      case 'release': {
        const { escrowId } = params;

        if (!escrowId) {
          return NextResponse.json(
            { success: false, error: 'escrowId required' },
            { status: 400 }
          );
        }

        // Hole Escrow und prüfe Berechtigung
        const escrow = await EscrowService.getById(escrowId);
        if (!escrow) {
          return NextResponse.json(
            { success: false, error: 'Escrow not found' },
            { status: 404 }
          );
        }

        // Nur Admin darf manuell freigeben
        // In Produktion: Zusätzliche Checks oder Hetzner-Backend aufrufen

        await EscrowService.release(escrowId);

        return NextResponse.json({
          success: true,
          message: 'Escrow released',
        });
      }

      case 'refund': {
        const { escrowId, reason } = params;

        if (!escrowId) {
          return NextResponse.json(
            { success: false, error: 'escrowId required' },
            { status: 400 }
          );
        }

        const escrow = await EscrowService.getById(escrowId);
        if (!escrow) {
          return NextResponse.json(
            { success: false, error: 'Escrow not found' },
            { status: 404 }
          );
        }

        // Nur Käufer oder Admin darf refunden
        if (authResult.userId !== escrow.buyerId) {
          const hasAccess = isAuthorizedForCompany(authResult.userId, escrow.buyerId, authResult.token);
          if (!hasAccess) {
            return NextResponse.json(
              { success: false, error: 'Not authorized to refund this escrow' },
              { status: 403 }
            );
          }
        }

        await EscrowService.refund(escrowId, reason);

        return NextResponse.json({
          success: true,
          message: 'Escrow refunded',
        });
      }

      case 'dispute': {
        const { escrowId, reason } = params;

        if (!escrowId || !reason) {
          return NextResponse.json(
            { success: false, error: 'escrowId and reason required' },
            { status: 400 }
          );
        }

        const escrow = await EscrowService.getById(escrowId);
        if (!escrow) {
          return NextResponse.json(
            { success: false, error: 'Escrow not found' },
            { status: 404 }
          );
        }

        // Käufer oder Anbieter darf disputieren
        const isBuyer = authResult.userId === escrow.buyerId;
        const isProvider = authResult.userId === escrow.providerId;

        if (!isBuyer && !isProvider) {
          return NextResponse.json(
            { success: false, error: 'Not authorized to dispute this escrow' },
            { status: 403 }
          );
        }

        await EscrowService.dispute(escrowId, reason);

        return NextResponse.json({
          success: true,
          message: 'Escrow disputed',
        });
      }

      case 'early-release': {
        const { escrowId } = params;

        if (!escrowId) {
          return NextResponse.json(
            { success: false, error: 'escrowId required' },
            { status: 400 }
          );
        }

        await EscrowService.earlyRelease(escrowId, authResult.userId);

        return NextResponse.json({
          success: true,
          message: 'Early release initiated',
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Escrow API] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authentifizierung prüfen
    const authResult = await verifyApiAuth(request);
    if (!authResult.success) {
      return authErrorResponse(authResult);
    }

    const { searchParams } = new URL(request.url);
    const escrowId = searchParams.get('escrowId');
    const orderId = searchParams.get('orderId');
    const type = searchParams.get('type'); // 'buyer' | 'provider' | 'summary'

    // Einzelner Escrow
    if (escrowId) {
      const escrow = await EscrowService.getById(escrowId);
      
      if (!escrow) {
        return NextResponse.json(
          { success: false, error: 'Escrow not found' },
          { status: 404 }
        );
      }

      // Prüfe Berechtigung
      const isBuyer = authResult.userId === escrow.buyerId;
      const isProvider = authResult.userId === escrow.providerId;

      if (!isBuyer && !isProvider) {
        return NextResponse.json(
          { success: false, error: 'Not authorized to view this escrow' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        escrow,
      });
    }

    // Escrow by Order
    if (orderId) {
      const escrow = await EscrowService.getByOrderId(orderId);
      
      if (!escrow) {
        return NextResponse.json({
          success: true,
          escrow: null,
        });
      }

      return NextResponse.json({
        success: true,
        escrow,
      });
    }

    // Liste oder Summary
    if (type === 'summary') {
      const summary = await EscrowService.getProviderSummary(authResult.userId);
      return NextResponse.json({
        success: true,
        summary,
      });
    }

    if (type === 'provider') {
      const escrows = await EscrowService.getByProvider(authResult.userId);
      return NextResponse.json({
        success: true,
        escrows,
      });
    }

    if (type === 'buyer') {
      const escrows = await EscrowService.getByBuyer(authResult.userId);
      return NextResponse.json({
        success: true,
        escrows,
      });
    }

    // Default: Pending Escrows für den Anbieter
    const escrows = await EscrowService.getPendingEscrows(authResult.userId);
    return NextResponse.json({
      success: true,
      escrows,
    });

  } catch (error) {
    console.error('[Escrow API] GET Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
