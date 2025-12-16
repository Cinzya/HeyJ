import { supabase } from "../utilities/Supabase";

export default class FriendRequest {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: "pending" | "accepted" | "rejected" | "blocked";
  createdAt: Date;
  updatedAt: Date;

  constructor(
    id: string,
    requesterId: string,
    addresseeId: string,
    status: "pending" | "accepted" | "rejected" | "blocked",
    createdAt: Date,
    updatedAt: Date
  ) {
    this.id = id;
    this.requesterId = requesterId;
    this.addresseeId = addresseeId;
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  toJSON() {
    return {
      id: this.id,
      requester_id: this.requesterId,
      addressee_id: this.addresseeId,
      status: this.status,
      created_at: this.createdAt.toISOString(),
      updated_at: this.updatedAt.toISOString(),
    };
  }

  static fromJSON(data: any): FriendRequest {
    return new FriendRequest(
      data.id,
      data.requester_id || data.requesterId,
      data.addressee_id || data.addresseeId,
      data.status,
      data.created_at ? new Date(data.created_at) : new Date(),
      data.updated_at ? new Date(data.updated_at) : new Date()
    );
  }

  isPending(): boolean {
    return this.status === "pending";
  }

  isAccepted(): boolean {
    return this.status === "accepted";
  }

  isRejected(): boolean {
    return this.status === "rejected";
  }

  isBlocked(): boolean {
    return this.status === "blocked";
  }
}

