import { View, Text, TouchableOpacity, Image } from "react-native";
import FriendRequest from "../../objects/FriendRequest";
import Profile from "../../objects/Profile";
import { styles } from "../../styles/screens/ConversationsScreen.styles";

interface FriendRequestItemProps {
  request: FriendRequest;
  requesterProfile: Profile;
  onAccept: () => void;
  onDecline: () => void;
}

const FriendRequestItem = ({
  request,
  requesterProfile,
  onAccept,
  onDecline,
}: FriendRequestItemProps) => {
  return (
    <View style={styles.friendRequestContainer}>
      <Image
        style={styles.friendRequestProfilePicture}
        source={{ uri: requesterProfile.profilePicture }}
      />
      <View style={styles.friendRequestTextContainer}>
        <Text style={styles.friendRequestName}>{requesterProfile.name}</Text>
        <Text style={styles.friendRequestLabel}>Friend Request</Text>
      </View>
      <View style={styles.friendRequestButtons}>
        <TouchableOpacity
          style={[styles.friendRequestButton, styles.acceptButton]}
          onPress={onAccept}
        >
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.friendRequestButton, styles.declineButton]}
          onPress={onDecline}
        >
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default FriendRequestItem;
