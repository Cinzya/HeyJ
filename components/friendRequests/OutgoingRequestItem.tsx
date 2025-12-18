import { View, Text, TouchableOpacity, Image } from "react-native";
import FriendRequest from "../../objects/FriendRequest";
import Profile from "../../objects/Profile";
import { styles } from "../../styles/screens/FriendRequestsScreen.styles";

interface OutgoingRequestItemProps {
  request: FriendRequest;
  addresseeProfile: Profile;
  onCancel: () => void;
}

const OutgoingRequestItem = ({
  request,
  addresseeProfile,
  onCancel,
}: OutgoingRequestItemProps) => {
  return (
    <View style={styles.requestItem}>
      <Image
        style={styles.profilePicture}
        source={{ uri: addresseeProfile.profilePicture }}
      />
      <View style={styles.requestInfo}>
        <Text style={styles.name}>{addresseeProfile.name}</Text>
        <Text style={styles.userCode}>{addresseeProfile.userCode}</Text>
        <Text style={styles.pendingText}>Pending...</Text>
      </View>
      <TouchableOpacity
        style={[styles.button, styles.cancelButton]}
        onPress={onCancel}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
};

export default OutgoingRequestItem;
