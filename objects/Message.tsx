export default class Message {
  messageId: string;
  timestamp: Date;
  uid: string;
  audioUrl: string;

  constructor(
    messageId: string,
    timestamp: Date,
    uid: string,
    audioUrl: string
  ) {
    this.messageId = messageId;
    this.timestamp = timestamp;
    this.uid = uid;
    this.audioUrl = audioUrl;
  }

  toJSON() {
    return {
      messageId: this.messageId,
      timestamp: this.timestamp.toISOString(),
      uid: this.uid,
      audioUrl: this.audioUrl,
    };
  }

  static fromJSON(data: any) {
    return new Message(
      data.messageId,
      new Date(data.timestamp),
      data.uid,
      data.audioUrl
    );
  }
}
