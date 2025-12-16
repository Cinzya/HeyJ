export default class Message {
  messageId: string;
  timestamp: Date;
  uid: string;
  audioUrl: string;
  isRead: boolean;

  constructor(
    messageId: string,
    timestamp: Date,
    uid: string,
    audioUrl: string,
    isRead: boolean = false
  ) {
    this.messageId = messageId;
    this.timestamp = timestamp;
    this.uid = uid;
    this.audioUrl = audioUrl;
    this.isRead = isRead;
  }

  toJSON() {
    return {
      messageId: this.messageId,
      timestamp: this.timestamp.toISOString(),
      uid: this.uid,
      audioUrl: this.audioUrl,
      isRead: this.isRead,
    };
  }

  static fromJSON(data: any) {
    return new Message(
      data.messageId,
      new Date(data.timestamp),
      data.uid,
      data.audioUrl,
      data.isRead ?? false
    );
  }
}
