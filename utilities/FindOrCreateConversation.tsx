import { supabase } from "./Supabase";
import Conversation from "../objects/Conversation";
import UUID from "react-native-uuid";
import { handleError, handleApiError } from "./errorHandler";

/**
 * Finds an existing conversation between two users, or creates a new one if it doesn't exist.
 * This ensures only one conversation exists between any two users.
 */
export const findOrCreateConversation = async (
    user1Uid: string,
    user2Uid: string
): Promise<{ conversation: Conversation; isNew: boolean }> => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'FindOrCreateConversation.tsx:9', message: 'findOrCreateConversation called', data: { user1Uid, user2Uid }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion

    // First, check if a conversation already exists in the database
    // Fetch all conversations and check if any contain both UIDs
    const { data: existingConversations, error: fetchError } = await supabase
        .from("conversations")
        .select("*");

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'FindOrCreateConversation.tsx:16', message: 'fetched conversations from database', data: { user1Uid, user2Uid, conversationCount: existingConversations?.length || 0, hasError: !!fetchError }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion

    if (fetchError) {
        handleError(fetchError, "FindOrCreateConversation - fetch");
        // Continue to create new conversation if fetch fails
    } else if (existingConversations && existingConversations.length > 0) {
        // Check each conversation to see if it contains both UIDs
        for (const convData of existingConversations) {
            const convUids = convData.uids || [];
            // Check if this conversation is between the two users (exactly 2 UIDs, both match)
            if (
                Array.isArray(convUids) &&
                convUids.length === 2 &&
                convUids.includes(user1Uid) &&
                convUids.includes(user2Uid)
            ) {
                // Found existing conversation
                const conversation = await Conversation.fromJSON(convData);
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'FindOrCreateConversation.tsx:34', message: 'found existing conversation', data: { conversationId: conversation.conversationId, user1Uid, user2Uid, isNew: false }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
                // #endregion
                return { conversation, isNew: false };
            }
        }
    }

    // No existing conversation found, create a new one
    const conversationId = UUID.v4().toString();
    const conversation = new Conversation(
        conversationId,
        [user1Uid, user2Uid],
        [],
        [
            { uid: user1Uid, timestamp: new Date() },
            { uid: user2Uid, timestamp: new Date() },
        ]
    );

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'FindOrCreateConversation.tsx:50', message: 'creating new conversation', data: { conversationId, user1Uid, user2Uid }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion

    const { error: insertError } = await supabase
        .from("conversations")
        .insert(conversation.toJSON());

    if (insertError) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'FindOrCreateConversation.tsx:56', message: 'error creating conversation', data: { conversationId, error: insertError.message }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
        // #endregion
        const errorMessage = handleApiError(insertError, "Failed to create conversation");
        throw new Error(errorMessage);
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f5e603aa-4ab7-41d0-b1fe-b8ca210c432d', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'FindOrCreateConversation.tsx:62', message: 'conversation created successfully', data: { conversationId, user1Uid, user2Uid, isNew: true }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'A' }) }).catch(() => { });
    // #endregion

    return { conversation, isNew: true };
};

