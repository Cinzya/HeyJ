import { supabase } from "../utilities/Supabase";
import Conversation from "./Conversation";

export default class Profile {
  uid: string;
  profilePicture: string;
  firstName: string;
  lastName: string;
  email: string;
  conversations: string[];

  constructor(
    uid: string,
    profilePicture: string,
    firstName: string,
    lastName: string,
    email: string,
    conversations: string[]
  ) {
    this.uid = uid;
    this.profilePicture = profilePicture;
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.conversations = conversations;
  }

  toJSON() {
    return {
      uid: this.uid,
      profilePicture: this.profilePicture,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      conversations: this.conversations,
    };
  }

  toJSONWithoutConversations = () => {
    return {
      uid: this.uid,
      profilePicture: this.profilePicture,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
    };
  };

  static fromJSON(data: any) {
    return new Profile(
      data.uid,
      data.profilePicture,
      data.firstName,
      data.lastName,
      data.email,
      data.conversations
    );
  }
}
