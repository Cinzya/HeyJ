import { View, Text, TouchableOpacity, Image } from "react-native";
import FriendRequest from "../../objects/FriendRequest";
import Profile from "../../objects/Profile";
import { styles } from "../../styles/screens/FriendRequestsScreen.styles";

interface IncomingRequestItemProps {
  request: FriendRequest;
  requesterProfile: Profile;
  onAccept: () => void;
  onReject: () => void;
  onBlock: () => void;
}

const IncomingRequestItem = ({
  request,
  requesterProfile,
  onAccept,
  onReject,
  onBlock,
}: IncomingRequestItemProps) => {
  // Check if request was updated (indicates it might have been rejected before)
  const wasUpdated = request.updatedAt.getTime() > request.createdAt.getTime() + 1000; // 1 second buffer

  return (
    <View style={styles.requestItem}>
      <Image
        style={styles.profilePicture}
        source={{ uri: requesterProfile.profilePicture }}
      />
      <View style={styles.requestInfo}>
        <Text style={styles.name}>{requesterProfile.name}</Text>
        <Text style={styles.userCode}>{requesterProfile.userCode}</Text>
        {wasUpdated && (
          <Text style={styles.warningText}>
            This user has sent you a request before
          </Text>
        )}
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.acceptButton]}
          onPress={onAccept}
        >
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.rejectButton]}
          onPress={onReject}
        >
          <Text style={styles.rejectButtonText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.blockButton, wasUpdated && styles.blockButtonProminent]}
          onPress={onBlock}
        >
          <Text style={styles.blockButtonText}>Block</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default IncomingRequestItem;
