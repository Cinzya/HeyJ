import { StackScreenProps } from "@react-navigation/stack";

export type RootStackParamList = {
  Home: undefined;
  Conversation: { conversationId: string };
  FriendRequests: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type ConversationScreenProps = StackScreenProps<RootStackParamList, "Conversation">;
export type FriendRequestsScreenProps = StackScreenProps<RootStackParamList, "FriendRequests">;
export type HomeScreenProps = StackScreenProps<RootStackParamList, "Home">;
export type LoginScreenProps = StackScreenProps<AuthStackParamList, "Login">;
export type SignupScreenProps = StackScreenProps<AuthStackParamList, "Signup">;

