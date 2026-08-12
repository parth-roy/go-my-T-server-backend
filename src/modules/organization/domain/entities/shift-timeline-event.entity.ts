import { ShiftTimelineEventType } from '@prisma/client';

export interface ShiftTimelineEventProps {
  id: string;
  shiftId: string;
  eventType: ShiftTimelineEventType;
  timestamp: Date;
  metadata?: any;
}

export class ShiftTimelineEventEntity {
  private constructor(private props: ShiftTimelineEventProps) {}

  get id(): string { return this.props.id; }
  get shiftId(): string { return this.props.shiftId; }
  get eventType(): ShiftTimelineEventType { return this.props.eventType; }
  get timestamp(): Date { return this.props.timestamp; }
  get metadata(): any { return this.props.metadata; }

  toJSON() { return this.props; }

  public static create(props: ShiftTimelineEventProps): ShiftTimelineEventEntity {
    return new ShiftTimelineEventEntity(props);
  }

  public static reconstitute(props: ShiftTimelineEventProps): ShiftTimelineEventEntity {
    return new ShiftTimelineEventEntity(props);
  }
}
