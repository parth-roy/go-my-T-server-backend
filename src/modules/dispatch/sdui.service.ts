/**
 * sdui.service.ts — Server-Driven UI (SDUI) Dynamic Modal Generator
 *
 * Powers dynamic, declarative modal sheets and overlays for Driver & Customer apps
 * over WebSocket (Socket.IO) and FCM High-Priority Data Push. Allows immediate
 * modification of modal styling, countdowns, copy, and CTAs without requiring
 * client app updates.
 */

export type SDUIModalType =
    | 'DIRECT_INSTANT_ALERT'
    | 'AUCTION_BID_ALERT'
    | 'COUNTER_BID_NOTIFICATION'
    | 'SEARCH_SLA_WARNING'
    | 'ASSIGNMENT_SUCCESS'
    | 'BOOKING_CONFLICT_LOST';

export interface SDUIButton {
    id: string;
    label: string;
    action:
        | 'ACCEPT_INSTANT'
        | 'BID_CUSTOM'
        | 'DECLINE'
        | 'VIEW_NEGOTIATE'
        | 'CALL_OPS'
        | 'DISMISS'
        | 'RETRY_SEARCH';
    style: 'primary' | 'secondary' | 'danger' | 'outline' | 'glass';
    payload?: Record<string, any>;
    icon?: string;
}

export interface SDUICardRow {
    icon: string;
    label: string;
    value: string;
    highlight?: boolean;
}

export interface SDUIBadge {
    text: string;
    backgroundColor: string; // e.g. '#ECFDF5' or '#10B981'
    textColor: string;       // e.g. '#065F46' or '#FFFFFF'
}

export interface SDUIModalPayload {
    modalId: string;
    type: SDUIModalType;
    title: string;
    subtitle?: string;
    badge?: SDUIBadge;
    bookingId: string;
    bookingNumber?: string;
    timeoutSeconds?: number;
    highlightAmount?: {
        currency: string;
        amount: number;
        label: string;
    };
    metrics?: SDUICardRow[];
    pickupAddress?: string;
    pickupCity?: string;
    dropAddress?: string;
    dropCity?: string;
    cargoDetails?: string;
    distanceKm?: number;
    driverInfo?: {
        id?: string;
        name: string;
        phone?: string;
        rating?: number;
        truckType?: string;
        truckRegNo?: string;
        photoUrl?: string;
    };
    actions: SDUIButton[];
    metadata?: Record<string, any>;
}

export class DynamicModalService {
    /**
     * Modal displayed to verified Drivers when a direct/instant booking is dispatched nearby.
     * Offers instant acceptance at guaranteed tariff OR option to submit a counter-bid.
     */
    static buildDirectInstantAlertModal(booking: {
        id: string;
        bookingNumber?: string;
        totalFare: number | null;
        pickupAddress: string;
        pickupCity?: string;
        dropAddress: string;
        dropCity?: string;
        distanceKm?: number;
        vehicleType: string;
        cargoType?: string;
        weightKg?: number;
    }): SDUIModalPayload {
        return {
            modalId: `instant_${booking.id}_${Date.now()}`,
            type: 'DIRECT_INSTANT_ALERT',
            title: '⚡ Instant Direct Booking',
            subtitle: 'Guaranteed customer booking nearby — accept now or bid custom fare',
            badge: {
                text: 'Direct Booking • Instant Pay',
                backgroundColor: '#ECFDF5',
                textColor: '#059669',
            },
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber ?? 'LOAD',
            timeoutSeconds: 60,
            highlightAmount: {
                currency: '₹',
                amount: booking.totalFare ?? 0,
                label: 'Guaranteed Fare',
            },
            metrics: [
                {
                    icon: 'local_shipping',
                    label: 'Truck Required',
                    value: booking.vehicleType,
                },
                {
                    icon: 'straighten',
                    label: 'Trip Distance',
                    value: booking.distanceKm ? `${booking.distanceKm} km` : 'Standard Distance',
                },
                {
                    icon: 'inventory_2',
                    label: 'Cargo',
                    value: booking.cargoType ? `${booking.cargoType} (${booking.weightKg ?? '—'} kg)` : 'General Goods',
                },
            ],
            pickupAddress: booking.pickupAddress,
            pickupCity: booking.pickupCity ?? '',
            dropAddress: booking.dropAddress,
            dropCity: booking.dropCity ?? '',
            distanceKm: booking.distanceKm,
            actions: [
                {
                    id: 'accept_instant',
                    label: '⚡ Accept Instantly',
                    action: 'ACCEPT_INSTANT',
                    style: 'primary',
                    icon: 'check_circle',
                    payload: { bookingId: booking.id, expectedFare: booking.totalFare },
                },
                {
                    id: 'bid_custom',
                    label: '💬 Bid Custom Fare',
                    action: 'BID_CUSTOM',
                    style: 'secondary',
                    icon: 'gavel',
                    payload: { bookingId: booking.id, baseFare: booking.totalFare },
                },
                {
                    id: 'decline',
                    label: 'Pass / Decline',
                    action: 'DECLINE',
                    style: 'outline',
                    icon: 'close',
                    payload: { bookingId: booking.id },
                },
            ],
        };
    }

    /**
     * Modal displayed to verified Drivers for an Auction / Bidding load.
     */
    static buildAuctionBidAlertModal(load: {
        id: string;
        bookingNumber?: string;
        customerBudget: number | null;
        pickupAddress: string;
        pickupCity?: string;
        dropAddress: string;
        dropCity?: string;
        distanceKm?: number;
        vehicleType: string;
        cargoType?: string;
        weightKg?: number;
    }): SDUIModalPayload {
        return {
            modalId: `auction_${load.id}_${Date.now()}`,
            type: 'AUCTION_BID_ALERT',
            title: '🔨 New Load For Bidding',
            subtitle: 'Open commercial negotiation — submit your competitive quote',
            badge: {
                text: 'Live Auction • Place Bid',
                backgroundColor: '#EFF6FF',
                textColor: '#2563EB',
            },
            bookingId: load.id,
            bookingNumber: load.bookingNumber ?? 'AUCTION',
            timeoutSeconds: 300,
            highlightAmount: {
                currency: '₹',
                amount: load.customerBudget ?? 0,
                label: 'Customer Target Budget',
            },
            metrics: [
                {
                    icon: 'local_shipping',
                    label: 'Vehicle Class',
                    value: load.vehicleType,
                },
                {
                    icon: 'straighten',
                    label: 'Est. Distance',
                    value: load.distanceKm ? `${load.distanceKm} km` : 'Standard Distance',
                },
                {
                    icon: 'inventory_2',
                    label: 'Commodity',
                    value: load.cargoType ? `${load.cargoType} (${load.weightKg ?? '—'} kg)` : 'Commercial Goods',
                },
            ],
            pickupAddress: load.pickupAddress,
            pickupCity: load.pickupCity ?? '',
            dropAddress: load.dropAddress,
            dropCity: load.dropCity ?? '',
            distanceKm: load.distanceKm,
            actions: [
                {
                    id: 'bid_official',
                    label: '🔨 Submit Official Quote',
                    action: 'BID_CUSTOM',
                    style: 'primary',
                    icon: 'gavel',
                    payload: { loadId: load.id, customerBudget: load.customerBudget },
                },
                {
                    id: 'decline',
                    label: 'Not Interested',
                    action: 'DECLINE',
                    style: 'outline',
                    icon: 'close',
                    payload: { loadId: load.id },
                },
            ],
        };
    }

    /**
     * Modal displayed to the Customer when a Driver submits a counter-bid on an instant load.
     */
    static buildCounterBidNotificationModal(params: {
        bookingId: string;
        bookingNumber?: string;
        driverId: string;
        driverName: string;
        driverPhone?: string;
        driverRating?: number;
        truckType?: string;
        truckRegNo?: string;
        bidAmount: number;
        originalFare: number;
        notes?: string;
    }): SDUIModalPayload {
        return {
            modalId: `counter_bid_${params.bookingId}_${Date.now()}`,
            type: 'COUNTER_BID_NOTIFICATION',
            title: '🚛 Driver Counter-Offer Received',
            subtitle: `${params.driverName} offers to fulfill your shipment at ₹${params.bidAmount}`,
            badge: {
                text: 'Counter-Bid • Live Negotiation',
                backgroundColor: '#FEF3C7',
                textColor: '#D97706',
            },
            bookingId: params.bookingId,
            bookingNumber: params.bookingNumber,
            highlightAmount: {
                currency: '₹',
                amount: params.bidAmount,
                label: 'Driver Quoted Fare',
            },
            driverInfo: {
                id: params.driverId,
                name: params.driverName,
                phone: params.driverPhone,
                rating: params.driverRating ?? 4.8,
                truckType: params.truckType ?? 'Tata Ace',
                truckRegNo: params.truckRegNo,
            },
            metrics: [
                {
                    icon: 'payments',
                    label: 'Direct Price vs Offer',
                    value: `₹${params.originalFare} → ₹${params.bidAmount}`,
                    highlight: true,
                },
                {
                    icon: 'star',
                    label: 'Driver Rating',
                    value: `${(params.driverRating ?? 4.8).toFixed(1)} ★ Verified`,
                },
            ],
            actions: [
                {
                    id: 'view_negotiate',
                    label: '💬 View & Negotiate Live',
                    action: 'VIEW_NEGOTIATE',
                    style: 'primary',
                    icon: 'chat',
                    payload: {
                        bookingId: params.bookingId,
                        driverId: params.driverId,
                        bidAmount: params.bidAmount,
                    },
                },
                {
                    id: 'dismiss',
                    label: 'Keep Waiting for Other Drivers',
                    action: 'DISMISS',
                    style: 'outline',
                    icon: 'hourglass_empty',
                    payload: { bookingId: params.bookingId },
                },
            ],
            metadata: {
                notes: params.notes,
            },
        };
    }

    /**
     * Modal displayed to the Customer if driver matching takes > 5 minutes (SLA escalation).
     */
    static buildSearchSlaWarningModal(booking: {
        id: string;
        bookingNumber?: string;
        pickupAddress: string;
    }): SDUIModalPayload {
        return {
            modalId: `sla_escalated_${booking.id}_${Date.now()}`,
            type: 'SEARCH_SLA_WARNING',
            title: '⏳ High Demand in Your Route',
            subtitle:
                'We have escalated your shipment to our 24/7 dedicated fleet operations desk. A truck is being actively arranged.',
            badge: {
                text: 'Priority Ops Allocation Active',
                backgroundColor: '#FEE2E2',
                textColor: '#DC2626',
            },
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
            pickupAddress: booking.pickupAddress,
            actions: [
                {
                    id: 'continue_home',
                    label: 'Go to Home (We’ll alert you once assigned)',
                    action: 'DISMISS',
                    style: 'primary',
                    icon: 'home',
                    payload: { bookingId: booking.id },
                },
                {
                    id: 'call_ops',
                    label: '📞 Call Operations Support Desk',
                    action: 'CALL_OPS',
                    style: 'secondary',
                    icon: 'phone',
                    payload: { phone: '+919999999999' },
                },
            ],
        };
    }

    /**
     * Modal displayed to a Driver when another driver claims an instant load first.
     */
    static buildConflictLostModal(bookingId: string): SDUIModalPayload {
        return {
            modalId: `conflict_${bookingId}_${Date.now()}`,
            type: 'BOOKING_CONFLICT_LOST',
            title: '⚠️ Load Already Claimed',
            subtitle:
                'Another verified driver accepted this booking at the direct tariff while you were bidding or reviewing.',
            badge: {
                text: 'Booking Assigned',
                backgroundColor: '#F3F4F6',
                textColor: '#4B5563',
            },
            bookingId,
            actions: [
                {
                    id: 'view_loads',
                    label: 'Browse Other Available Loads',
                    action: 'DISMISS',
                    style: 'primary',
                    icon: 'list_alt',
                },
            ],
        };
    }
}
