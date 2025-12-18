import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../../styles/screens/FriendRequestsScreen.styles";

const FriendRequestsEmpty = () => {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="person-add-outline" size={64} color="#999" />
      <Text style={styles.emptyText}>No friend requests</Text>
    </View>
  );
};

export default FriendRequestsEmpty;
