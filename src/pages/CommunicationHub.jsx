import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { conversationAPI, documentAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';

const formatTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
};

const CommunicationHub = () => {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const { socket, on, off } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(conversationId || null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [pendingFiles, setPendingFiles] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);

  const seenMessageIdsRef = useRef(new Set());
  const typingTimeoutRef = useRef(null);
  const ensuredDefaultConversationsRef = useRef(false);

  const resolvedConversationId = useMemo(() => activeConversationId || conversationId || null, [activeConversationId, conversationId]);

  const refreshConversations = async () => {
    setLoadingList(true);
    try {
      const res = await conversationAPI.listConversations();
      let list = res.data?.data || [];

      if (!ensuredDefaultConversationsRef.current) {
        let role = null;
        try {
          const rawUser = localStorage.getItem('user');
          const parsedUser = rawUser ? JSON.parse(rawUser) : null;
          role = parsedUser?.role || null;
        } catch (e) {
          role = null;
        }

        if (role === 'tenant') {
          const hasCommunity = list.some((c) => c.kind === 'tenant_community');
          const hasAdminDm = list.some((c) => c.kind === 'tenant_admin_dm');
          if (!hasCommunity || !hasAdminDm) {
            ensuredDefaultConversationsRef.current = true;
            await Promise.allSettled([conversationAPI.ensureCommunity(), conversationAPI.ensureAdminDm()]);
            const reloaded = await conversationAPI.listConversations();
            list = reloaded.data?.data || [];
          }
        }
      }

      setConversations(list);
      if (!resolvedConversationId && list.length > 0) {
        navigate(`/messages/${list[0].id}`, { replace: true });
        setActiveConversationId(list[0].id);
      }
    } finally {
      setLoadingList(false);
    }
  };

  const loadThread = async (id) => {
    setLoadingThread(true);
    try {
      const [convRes, msgRes] = await Promise.all([
        conversationAPI.getConversation(id),
        conversationAPI.listMessages(id, { limit: 100 })
      ]);

      const convData = convRes.data?.data?.conversation || null;
      const partData = convRes.data?.data?.participants || [];
      const msgData = msgRes.data?.data || [];

      setActiveConversation(convData);
      setParticipants(partData);
      setMessages(msgData);
      seenMessageIdsRef.current = new Set(msgData.map((m) => m.id));

      if (msgData.length > 0) {
        const lastMessageId = msgData[msgData.length - 1].id;
        await conversationAPI.markRead(id, { message_id: lastMessageId });
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c))
        );
      }
    } finally {
      setLoadingThread(false);
    }
  };

  useEffect(() => {
    refreshConversations();
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    setActiveConversationId(conversationId);
  }, [conversationId]);

  useEffect(() => {
    if (!resolvedConversationId) return;
    loadThread(resolvedConversationId);
  }, [resolvedConversationId]);

  useEffect(() => {
    if (!socket || !resolvedConversationId) return;

    socket.emit('hub:join_conversation', resolvedConversationId);

    const handleMessageCreated = (message) => {
      if (!message?.id) return;
      if (seenMessageIdsRef.current.has(message.id)) return;
      seenMessageIdsRef.current.add(message.id);

      const messageConversationId = message.conversation_id || message.conversationId;
      if (messageConversationId !== resolvedConversationId) {
        setConversations((prev) =>
          prev.map((c) => (c.id === messageConversationId ? { ...c, unread_count: (c.unread_count || 0) + 1 } : c))
        );
        return;
      }

      setMessages((prev) => [...prev, message]);
    };

    const handleTyping = (payload) => {
      if (payload?.conversation_id !== resolvedConversationId) return;
      setOtherTyping(Boolean(payload?.is_typing));
    };

    on('hub:message_created', handleMessageCreated);
    on('hub:typing', handleTyping);

    return () => {
      socket.emit('hub:leave_conversation', resolvedConversationId);
      off('hub:message_created', handleMessageCreated);
      off('hub:typing', handleTyping);
    };
  }, [socket, resolvedConversationId, on, off]);

  const handleSelectConversation = (id) => {
    navigate(`/messages/${id}`);
  };

  const handleSend = async () => {
    if (!resolvedConversationId) return;
    const content = messageText.trim();
    if (!content && pendingFiles.length === 0) return;

    setSending(true);
    try {
      let attachments = null;
      if (pendingFiles.length > 0) {
        setUploadingAttachments(true);
        const uploaded = [];
        for (const file of pendingFiles) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('entityType', 'conversation');
          formData.append('entityId', resolvedConversationId);
          formData.append('category', 'message_attachment');
          const upRes = await documentAPI.uploadDocument(formData);
          const doc = upRes.data?.data;
          if (doc?.id) {
            uploaded.push({
              document_id: doc.id,
              name: doc.name,
              mime_type: doc.mime_type,
              file_size: doc.file_size
            });
          }
        }
        attachments = uploaded.length > 0 ? uploaded : null;
      }

      const res = await conversationAPI.sendMessage(resolvedConversationId, { content, attachments });
      const message = res.data?.data;
      if (message?.id && !seenMessageIdsRef.current.has(message.id)) {
        seenMessageIdsRef.current.add(message.id);
        setMessages((prev) => [...prev, message]);
      }
      setMessageText('');
      setPendingFiles([]);
      setOtherTyping(false);
      await conversationAPI.markRead(resolvedConversationId, { message_id: message?.id });
    } finally {
      setUploadingAttachments(false);
      setSending(false);
    }
  };

  const handleTyping = (value) => {
    setMessageText(value);
    if (!socket || !resolvedConversationId) return;
    socket.emit('hub:typing', { conversation_id: resolvedConversationId, is_typing: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('hub:typing', { conversation_id: resolvedConversationId, is_typing: false });
    }, 1200);
  };

  const handleDownload = async (docId, filename) => {
    const res = await documentAPI.downloadDocument(docId);
    const blob = new Blob([res.data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `document-${docId}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Communication Hub</h1>
          <p className="text-sm text-gray-400">Messages tied to your work and tenants</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 bg-gray-900/50 border border-white/10 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Conversations</h2>
            {loadingList && <span className="text-xs text-gray-500">Loading...</span>}
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-sm text-gray-400">No conversations yet.</div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelectConversation(c.id)}
                  className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${
                    c.id === resolvedConversationId ? 'bg-white/5' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {c.subject || (c.entity_type ? `${c.entity_type} #${c.entity_id}` : 'Conversation')}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {c.last_message_content || 'No messages yet'}
                      </div>
                    </div>
                    {c.unread_count > 0 && (
                      <div className="shrink-0 px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-600 text-white">
                        {c.unread_count}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-gray-900/50 border border-white/10 rounded-xl overflow-hidden flex flex-col min-h-[70vh]">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-white truncate">
                {activeConversation?.subject || (activeConversation?.entity_type ? `${activeConversation.entity_type} #${activeConversation.entity_id}` : 'Select a conversation')}
              </h2>
              <div className="text-xs text-gray-400 truncate">
                {participants.length > 0 ? participants.map((p) => p.name || p.email).join(', ') : ''}
              </div>
            </div>
            {loadingThread && <span className="text-xs text-gray-500">Loading...</span>}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-sm text-gray-400">No messages yet.</div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-white">
                      {m.sender_name || 'User'}
                      {m.sender_role ? <span className="text-xs text-gray-400 ml-2">({m.sender_role})</span> : null}
                    </div>
                    <div className="text-xs text-gray-500">{formatTime(m.created_at)}</div>
                  </div>
                  <div className="text-sm text-gray-200 mt-2 whitespace-pre-wrap">{m.content}</div>
                  {(() => {
                    const raw = m.attachments;
                    const parsed = typeof raw === 'string'
                      ? (() => { try { return JSON.parse(raw); } catch { return null; } })()
                      : raw;
                    if (!Array.isArray(parsed) || parsed.length === 0) return null;
                    return (
                      <div className="mt-3 space-y-2">
                        <div className="text-xs font-semibold text-gray-300">Attachments</div>
                        <div className="flex flex-wrap gap-2">
                          {parsed.map((a) => (
                            <button
                              key={a.document_id || a.name}
                              type="button"
                              onClick={() => handleDownload(a.document_id, a.name)}
                              className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-xs text-white border border-white/10"
                            >
                              {a.name || `Document #${a.document_id}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))
            )}
            {otherTyping && (
              <div className="text-xs text-gray-400">Someone is typing…</div>
            )}
          </div>

          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <input
                type="file"
                multiple
                disabled={!resolvedConversationId || sending || uploadingAttachments}
                onChange={(e) => setPendingFiles(Array.from(e.target.files || []))}
                className="hidden"
                id="hub-attachments"
              />
              <label
                htmlFor="hub-attachments"
                className={`px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-200 hover:bg-white/10 cursor-pointer ${
                  !resolvedConversationId || sending || uploadingAttachments ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Attach
              </label>
              <input
                value={messageText}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!sending) handleSend();
                  }
                }}
                placeholder={resolvedConversationId ? 'Type a message…' : 'Select a conversation…'}
                disabled={!resolvedConversationId || sending || uploadingAttachments}
                className="flex-1 px-3 py-2 rounded-lg bg-gray-950/40 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSend}
                disabled={!resolvedConversationId || (sending || uploadingAttachments)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm"
              >
                {uploadingAttachments ? 'Uploading…' : sending ? 'Sending…' : 'Send'}
              </button>
            </div>
            {pendingFiles.length > 0 && (
              <div className="mt-2 text-xs text-gray-400">
                {pendingFiles.length} attachment(s) selected
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunicationHub;
