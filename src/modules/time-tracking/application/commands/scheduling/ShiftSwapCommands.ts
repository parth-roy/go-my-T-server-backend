export class ProposeShiftSwap {
  constructor(
    public readonly requesterId: string,
    public readonly assignmentId: string,
    public readonly receiverId?: string
  ) {}
}

export class ApproveShiftSwap {
  constructor(public readonly swapId: string, public readonly managerId: string) {}
}
