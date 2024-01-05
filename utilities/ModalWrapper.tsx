import { View } from "react-native";
import CreateProfileModal from "../components/profile/CreateProfileModal";
import ViewProfileModal from "../components/profile/ViewProfileModal";

const ModalWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <View style={{ flex: 1 }}>
      {children}
      <CreateProfileModal />
      <ViewProfileModal />
    </View>
  );
};

export default ModalWrapper;
