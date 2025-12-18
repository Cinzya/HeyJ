import React, { useEffect, useRef } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    Animated,
} from "react-native";
import { featureFlags } from "../../utilities/featureFlags";
import Profile from "../../objects/Profile";
import TopButtonsRow from "./TopButtonsRow";
import RecipientSelector from "./RecipientSelector";
import WaveformLeft from "./WaveformLeft";
import WaveformRight from "./WaveformRight";
import { usePanelStateStore } from "../../stores/usePanelStateStore";
import { createStyles } from "../../styles/components/chat/RecordingPanel.styles";

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
    isRecording?: boolean;
    isInConversationScreen?: boolean; // Flag to indicate if panel is in ConversationScreen
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
    isRecording = false,
    isInConversationScreen = false,
}: RecordingPanelProps) => {
    const windowDimensions = useWindowDimensions();
    const styles = createStyles(windowDimensions.width);
    const { isCollapsed, setIsCollapsed, loadPanelState, isLoading } = usePanelStateStore();
    
    // Animation for pulsing effect when recording
    const pulseAnim = useRef(new Animated.Value(1)).current;
    
    // Load saved panel state on component mount
    useEffect(() => {
        loadPanelState();
    }, [loadPanelState]);
    
    useEffect(() => {
        if (isRecording) {
            // Start pulsing animation
            const pulseAnimation = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulseAnimation.start();
            return () => pulseAnimation.stop();
        } else {
            // Reset animation when not recording
            Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [isRecording, pulseAnim]);


    return (
        <View style={styles.selectionContainer}>
            {showTopButtons && (
                <TopButtonsRow
                    isCollapsed={isCollapsed}
                    onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
                    styles={styles}
                />
            )}
            {showWaveform && (
                <View style={styles.recordingContainer}>
                    <View style={styles.waveFormContainer}>
                        {renderLeftWaves ? renderLeftWaves() : (
                            <WaveformLeft
                                loudness={loudness}
                                waveContainerStyle={styles.waveContainer}
                                leftWaveStyle={styles.leftWave}
                            />
                        )}
                        <View style={styles.waveDivider} />
                        {renderRightWaves ? renderRightWaves() : (
                            <WaveformRight rightWaveStyle={styles.rightWave} />
                        )}
                    </View>
                </View>
            )}
            {showRecipient && !isCollapsed && !(isInConversationScreen && featureFlags.hideRecipientInConversationScreen) && (
                <RecipientSelector
                    recipientName={recipientName}
                    friends={friends}
                    selectedFriendUid={selectedFriendUid}
                    onFriendSelected={onFriendSelected || (() => {})}
                    styles={styles}
                />
            )}
            <Animated.View
                style={[
                    { transform: [{ scale: pulseAnim }] },
                    isRecording && styles.recordingPulseContainer
                ]}
            >
                <TouchableOpacity
                    onPressIn={onPressIn}
                    onPressOut={onPressOut}
                    style={[
                        styles.holdAndSpeakButton,
                        isRecording && styles.holdAndSpeakButtonRecording
                    ]}
                    activeOpacity={0.8}
                    disabled={disabled}
                >
                    {isRecording ? (
                        <View style={styles.recordingContent}>
                            <View style={styles.recordingIndicator} />
                            <Text style={styles.holdAndSpeakTextRecording}>RECORDING...</Text>
                        </View>
                    ) : (
                        <Text style={styles.holdAndSpeakText}>HOLD TO SPEAK</Text>
                    )}
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

export default RecordingPanel;

