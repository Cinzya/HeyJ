import React, { useState } from "react";
import {
    View,
    StyleSheet,
    Text,
    TouchableOpacity,
    FlatList,
    useWindowDimensions,
    DimensionValue,
} from "react-native";
// @ts-expect-error
import { FontAwesome, MaterialCommunityIcons } from "react-native-vector-icons";
import { useAudioSettings } from "../../utilities/AudioSettingsProvider";
import AddFriendModal from "../profile/AddFriendModal";
import DropdownPicker from "react-native-dropdown-picker";
import Profile from "../../objects/Profile";

interface RecordingPanelProps {
    onPressIn: () => void;
    onPressOut: () => void;
    disabled?: boolean;
    showTopButtons?: boolean;
    showRecipient?: boolean;
    recipientName?: string;
    friends?: Profile[];
    selectedFriendUid?: string | null;
    onFriendSelected?: (friendUid: string) => void;
    showWaveform?: boolean;
    loudness?: Number[];
    renderLeftWaves?: () => React.ReactElement;
    renderRightWaves?: () => React.ReactElement;
}

const RecordingPanel = ({
    onPressIn,
    onPressOut,
    disabled = false,
    showTopButtons = false,
    showRecipient = false,
    recipientName = "",
    friends = [],
    selectedFriendUid = null,
    onFriendSelected,
    showWaveform = false,
    loudness = Array.from({ length: 20 }, () => 15),
    renderLeftWaves,
    renderRightWaves,
}: RecordingPanelProps) => {
    const { speakerMode, toggleSpeakerMode, autoplay, toggleAutoplay } = useAudioSettings();
    const windowDimensions = useWindowDimensions();
    const styles = Styles(windowDimensions.width);
    const [showAddFriendModal, setShowAddFriendModal] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const defaultRenderLeftWaves = () => {
        return (
            <FlatList
                data={loudness}
                style={{ width: "100%" }}
                horizontal
                contentContainerStyle={[
                    styles.waveContainer,
                    {
                        justifyContent: "flex-end",
                        paddingLeft: 0,
                    },
                ]}
                renderItem={({ item, index }) => {
                    return (
                        <View
                            key={index}
                            style={[styles.leftWave, { height: item as DimensionValue }]}
                        />
                    );
                }}
            />
        );
    };

    const defaultRenderRightWaves = () => {
        return (
            <View style={{ flexDirection: "row" }}>
                {Array.from({ length: 20 }, (_, index) => (
                    <View key={index} style={styles.rightWave} />
                ))}
            </View>
        );
    };

    return (
        <View style={styles.selectionContainer}>
            {showTopButtons && (
                <View style={styles.topButtonRow}>
                    <View style={styles.buttonGroup}>
                        <TouchableOpacity
                            onPress={toggleSpeakerMode}
                            style={[
                                styles.speakerButton,
                                speakerMode && styles.speakerButtonActive,
                                isCollapsed && styles.buttonCollapsed
                            ]}
                            activeOpacity={0.7}
                        >
                            <FontAwesome
                                name="volume-up"
                                style={[
                                    styles.speakerIcon,
                                    speakerMode && styles.speakerIconActive,
                                    isCollapsed && styles.iconCollapsed
                                ]}
                            />
                            {!isCollapsed && (
                                <Text style={[
                                    styles.speakerLabel,
                                    speakerMode && styles.speakerLabelActive
                                ]}>
                                    SPEAKER
                                </Text>
                            )}
                            {speakerMode && !isCollapsed && <View style={styles.speakerIndicator} />}
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={toggleAutoplay}
                            style={[
                                styles.autoplayButton,
                                autoplay && styles.autoplayButtonActive,
                                isCollapsed && styles.buttonCollapsed
                            ]}
                            activeOpacity={0.7}
                        >
                            <FontAwesome
                                name="play-circle"
                                style={[
                                    styles.autoplayIcon,
                                    autoplay && styles.autoplayIconActive,
                                    isCollapsed && styles.iconCollapsed
                                ]}
                            />
                            {!isCollapsed && (
                                <Text style={[
                                    styles.autoplayLabel,
                                    autoplay && styles.autoplayLabelActive
                                ]}>
                                    PLAY
                                </Text>
                            )}
                            {autoplay && !isCollapsed && <View style={styles.autoplayIndicator} />}
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setShowAddFriendModal(true)}
                            style={[styles.addFriendButton, isCollapsed && styles.buttonCollapsed]}
                            activeOpacity={0.7}
                        >
                            <MaterialCommunityIcons
                                name="account-plus"
                                style={[styles.addFriendIcon, isCollapsed && styles.iconCollapsed]}
                            />
                            {!isCollapsed && (
                                <Text style={styles.addFriendLabel}>
                                    FRIEND
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                        onPress={() => setIsCollapsed(!isCollapsed)}
                        style={[styles.collapseButton, isCollapsed && styles.buttonCollapsed]}
                        activeOpacity={0.7}
                    >
                        <FontAwesome
                            name={isCollapsed ? "plus" : "minus"}
                            style={[styles.collapseIcon, isCollapsed && styles.iconCollapsed]}
                        />
                    </TouchableOpacity>
                </View>
            )}
            <AddFriendModal
                visible={showAddFriendModal}
                onClose={() => setShowAddFriendModal(false)}
            />
            {showWaveform && (
                <View style={styles.recordingContainer}>
                    <View style={styles.waveFormContainer}>
                        {renderLeftWaves ? renderLeftWaves() : defaultRenderLeftWaves()}
                        <View style={styles.waveDivider} />
                        {renderRightWaves ? renderRightWaves() : defaultRenderRightWaves()}
                    </View>
                </View>
            )}
            {showRecipient && !isCollapsed && (
                <View style={styles.recipientContainer}>
                    <Text style={styles.recipientLabel}>To:</Text>
                    {friends.length > 0 ? (
                        <View style={styles.dropdownContainer}>
                            <DropdownPicker
                                open={dropdownOpen}
                                value={selectedFriendUid}
                                items={friends.map((friend) => ({
                                    label: friend.name,
                                    value: friend.uid,
                                }))}
                                setOpen={setDropdownOpen}
                                setValue={(callback) => {
                                    const newValue = typeof callback === 'function' ? callback(selectedFriendUid) : callback;
                                    if (newValue && onFriendSelected) {
                                        onFriendSelected(newValue);
                                    }
                                }}
                                placeholder="Select a friend"
                                style={styles.dropdown}
                                textStyle={styles.dropdownText}
                                dropDownContainerStyle={styles.dropdownContainerStyle}
                                selectedItemLabelStyle={styles.dropdownSelectedText}
                            />
                        </View>
                    ) : (
                        <View style={styles.recipientField}>
                            <Text style={styles.recipientName}>
                                {recipientName || "No friends yet"}
                            </Text>
                        </View>
                    )}
                </View>
            )}
            <TouchableOpacity
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                style={styles.holdAndSpeakButton}
                activeOpacity={0.8}
                disabled={disabled}
            >
                <Text style={styles.holdAndSpeakText}>HOLD TO SPEAK</Text>
            </TouchableOpacity>
        </View>
    );
};

export default RecordingPanel;

const Styles = (windowWidth: number) =>
    StyleSheet.create({
        selectionContainer: {
            minHeight: 200,
            width: windowWidth * 0.95,
            backgroundColor: "#D3D3D3",
            borderRadius: 12,
            alignSelf: "center",
            paddingVertical: 20,
            paddingHorizontal: 20,
            shadowColor: "#000",
            shadowOpacity: 0.3,
            shadowOffset: { width: 2, height: 4 },
            shadowRadius: 6,
            position: "absolute",
            bottom: 35,
            borderWidth: 2,
            borderColor: "#B0B0B0",
            borderTopWidth: 1,
        },
        topButtonRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 15,
            gap: 12,
            width: "100%",
        },
        buttonGroup: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            flex: 1,
            flexShrink: 1,
            minWidth: 0,
        },
        buttonCollapsed: {
            height: 35,
        },
        iconCollapsed: {
            fontSize: 14,
            marginBottom: 2,
        },
        speakerButton: {
            flex: 1,
            minWidth: 70,
            height: 60,
            backgroundColor: "#E0E0E0",
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "#B0B0B0",
            position: "relative",
        },
        speakerButtonActive: {
            backgroundColor: "#4CAF50",
            borderColor: "#45a049",
        },
        speakerIcon: {
            fontSize: 20,
            color: "#666",
            marginBottom: 4,
        },
        speakerIconActive: {
            color: "#FFF",
        },
        speakerLabel: {
            fontSize: 10,
            fontWeight: "600",
            color: "#666",
            letterSpacing: 0.5,
        },
        speakerLabelActive: {
            color: "#FFF",
        },
        speakerIndicator: {
            position: "absolute",
            bottom: 6,
            left: "50%",
            marginLeft: -12,
            width: 24,
            height: 3,
            backgroundColor: "#FFF",
            borderRadius: 2,
        },
        autoplayButton: {
            flex: 1,
            minWidth: 70,
            height: 60,
            backgroundColor: "#E0E0E0",
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "#B0B0B0",
            position: "relative",
        },
        autoplayButtonActive: {
            backgroundColor: "#4CAF50",
            borderColor: "#45a049",
        },
        autoplayIcon: {
            fontSize: 20,
            color: "#666",
            marginBottom: 4,
        },
        autoplayIconActive: {
            color: "#FFF",
        },
        autoplayLabel: {
            fontSize: 10,
            fontWeight: "600",
            color: "#666",
            letterSpacing: 0.5,
        },
        autoplayLabelActive: {
            color: "#FFF",
        },
        autoplayIndicator: {
            position: "absolute",
            bottom: 6,
            left: "50%",
            marginLeft: -12,
            width: 24,
            height: 3,
            backgroundColor: "#FFF",
            borderRadius: 2,
        },
        addFriendButton: {
            flex: 1,
            minWidth: 70,
            height: 60,
            backgroundColor: "#E0E0E0",
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "#B0B0B0",
            position: "relative",
        },
        addFriendIcon: {
            fontSize: 20,
            color: "#666",
            marginBottom: 4,
        },
        addFriendLabel: {
            fontSize: 10,
            fontWeight: "600",
            color: "#666",
            letterSpacing: 0.5,
        },
        collapseButton: {
            width: 48,
            height: 60,
            backgroundColor: "#E0E0E0",
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "#B0B0B0",
            flexShrink: 0,
        },
        collapseIcon: {
            fontSize: 20,
            color: "#666",
        },
        recordingContainer: {
            height: 80,
            width: "100%",
            flexDirection: "row",
            alignSelf: "center",
            justifyContent: "flex-start",
            alignItems: "center",
            marginBottom: 15,
        },
        waveFormContainer: {
            maxWidth: windowWidth * 0.6,
            flexDirection: "row",
            alignItems: "center",
            marginLeft: 10,
        },
        waveDivider: {
            width: 2,
            height: 60,
            backgroundColor: "#666",
            borderRadius: 15,
            marginHorizontal: 2,
        },
        waveContainer: {
            flexDirection: "row",
            alignItems: "center",
            maxWidth: windowWidth * 0.28,
            height: 60,
        },
        rightWave: {
            width: 2,
            height: 15,
            backgroundColor: "#a2a2a2",
            borderRadius: 15,
            marginHorizontal: 2,
        },
        leftWave: {
            width: 2,
            height: 15,
            backgroundColor: "#000",
            borderRadius: 15,
            marginHorizontal: 2,
        },
        recipientContainer: {
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 15,
            paddingHorizontal: 10,
        },
        recipientLabel: {
            fontSize: 16,
            fontWeight: "600",
            color: "#333",
            marginRight: 10,
        },
        recipientField: {
            flex: 1,
            backgroundColor: "#FFF",
            borderRadius: 8,
            paddingHorizontal: 15,
            paddingVertical: 12,
            borderWidth: 1,
            borderColor: "#C0C0C0",
        },
        recipientName: {
            fontSize: 16,
            color: "#333",
        },
        holdAndSpeakButton: {
            width: "100%",
            height: 180,
            backgroundColor: "#FF9800",
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOpacity: 0.3,
            shadowOffset: { width: 0, height: 3 },
            shadowRadius: 5,
            elevation: 4,
        },
        holdAndSpeakText: {
            fontSize: 18,
            fontWeight: "bold",
            color: "#FFF",
            letterSpacing: 1,
        },
        dropdownContainer: {
            flex: 1,
            zIndex: 1000,
        },
        dropdown: {
            backgroundColor: "#FFF",
            borderColor: "#C0C0C0",
            borderWidth: 1,
            borderRadius: 8,
            minHeight: 50,
        },
        dropdownText: {
            fontSize: 16,
            color: "#333",
        },
        dropdownSelectedText: {
            fontWeight: "600",
        },
        dropdownContainerStyle: {
            backgroundColor: "#FFF",
            borderColor: "#C0C0C0",
            borderWidth: 1,
            borderRadius: 8,
            marginTop: 2,
        },
    });

