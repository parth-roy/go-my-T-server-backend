import { randomBytes, createHash } from 'crypto';
import { OrgRole } from '../value-objects/org-role.vo';
import { InvitationPolicy } from '../policies/invitation.policy';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

interface InvitationProps {
  id: string;
  organizationId: string;
  phone: string;
  email: string | null;
  role: OrgRole;
  tokenHash: string;
  status: InvitationStatus;
  capabilitySnapshot: any | null;
  expiresAt: Date;
  inviterId: string;
}

export class OrganizationMembershipInvitation {
  private constructor(private readonly props: InvitationProps) {}

  get id(): string { return this.props.id; }
  get organizationId(): string { return this.props.organizationId; }
  get phone(): string { return this.props.phone; }
  get email(): string | null { return this.props.email; }
  get role(): OrgRole { return this.props.role; }
  get tokenHash(): string { return this.props.tokenHash; }
  get status(): InvitationStatus { return this.props.status; }
  get expiresAt(): Date { return this.props.expiresAt; }
  get inviterId(): string { return this.props.inviterId; }
  get capabilitySnapshot(): any | null { return this.props.capabilitySnapshot; }

  public isExpired(): boolean {
    return new Date() > this.props.expiresAt;
  }

  public revoke(): void {
    if (this.props.status !== 'PENDING') {
      throw new Error('Can only revoke pending invitations');
    }
    this.props.status = 'REVOKED';
  }

  public accept(): void {
    if (this.props.status === 'ACCEPTED') {
      return; // Idempotent
    }
    if (this.props.status !== 'PENDING') {
      throw new Error(`Cannot accept a ${this.props.status.toLowerCase()} invitation`);
    }
    if (this.isExpired()) {
      throw new Error('Cannot accept an expired invitation');
    }
    this.props.status = 'ACCEPTED';
  }

  /**
   * Refreshes the invitation by extending its expiration and issuing a new token.
   * Modifies the entity in-place.
   * @returns The raw token that must be sent to the user (never stored directly).
   */
  public refresh(): string {
    if (this.props.status !== 'PENDING' && this.props.status !== 'EXPIRED') {
      throw new Error('Can only refresh pending or expired invitations');
    }

    const { rawToken, tokenHash } = OrganizationMembershipInvitation.generateTokenPair();
    
    this.props.tokenHash = tokenHash;
    this.props.expiresAt = InvitationPolicy.calculateExpirationDate();
    this.props.status = 'PENDING';

    return rawToken;
  }

  /**
   * Reconstitutes an existing Invitation from infrastructure persistence.
   */
  public static reconstitute(props: InvitationProps): OrganizationMembershipInvitation {
    return new OrganizationMembershipInvitation(props);
  }

  /**
   * Creates a brand new Invitation.
   * @returns A tuple containing the Aggregate and the raw secure token.
   */
  public static create(data: {
    id: string;
    organizationId: string;
    phone: string;
    email?: string | null;
    role: OrgRole;
    inviterId: string;
    capabilitySnapshot?: any | null;
  }): { invitation: OrganizationMembershipInvitation; rawToken: string } {
    
    const { rawToken, tokenHash } = this.generateTokenPair();

    const invitation = new OrganizationMembershipInvitation({
      id: data.id,
      organizationId: data.organizationId,
      phone: data.phone,
      email: data.email || null,
      role: data.role,
      tokenHash,
      status: 'PENDING',
      capabilitySnapshot: data.capabilitySnapshot || null,
      expiresAt: InvitationPolicy.calculateExpirationDate(),
      inviterId: data.inviterId
    });

    return { invitation, rawToken };
  }

  public static hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private static generateTokenPair(): { rawToken: string; tokenHash: string } {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    return { rawToken, tokenHash };
  }
}
