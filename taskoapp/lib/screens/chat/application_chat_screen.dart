import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

import 'taskilo_video_call_screen.dart';
import '../../utils/colors.dart';

class ApplicationChatScreen extends StatefulWidget {
  final String applicationId;
  final String companyId;
  final String companyName;

  const ApplicationChatScreen({
    super.key,
    required this.applicationId,
    required this.companyId,
    required this.companyName,
  });

  @override
  State<ApplicationChatScreen> createState() => _ApplicationChatScreenState();
}

class _ApplicationChatScreenState extends State<ApplicationChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.companyName),
        backgroundColor: TaskiloColors.primary,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          Expanded(
            child: StreamBuilder<QuerySnapshot>(
              stream: _db
                  .collection('chats')
                  .doc(widget.applicationId)
                  .collection('messages')
                  .orderBy('timestamp', descending: false)
                  .snapshots(),
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return Center(child: Text('Fehler: ${snapshot.error}'));
                }

                if (!snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }

                final messages = snapshot.data!.docs;

                // Scroll to bottom on new message
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (_scrollController.hasClients) {
                    _scrollController.jumpTo(
                      _scrollController.position.maxScrollExtent,
                    );
                  }
                });

                return ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.all(16),
                  itemCount: messages.length,
                  itemBuilder: (context, index) {
                    final msg = messages[index].data() as Map<String, dynamic>;
                    final isMe = msg['senderId'] == _auth.currentUser?.uid;
                    final timestamp = msg['timestamp'] as Timestamp?;
                    final text = msg['text'] ?? '';

                    // Check for video call invite
                    final isVideoInvite = text.contains(
                      '🎥 Einladung zum Taskilo Video-Call',
                    );

                    return Align(
                      alignment: isMe
                          ? Alignment.centerRight
                          : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          color: isMe
                              ? TaskiloColors.primary
                              : Colors.grey[200],
                          borderRadius: BorderRadius.only(
                            topLeft: const Radius.circular(16),
                            topRight: const Radius.circular(16),
                            bottomLeft: isMe
                                ? const Radius.circular(16)
                                : Radius.zero,
                            bottomRight: isMe
                                ? Radius.zero
                                : const Radius.circular(16),
                          ),
                        ),
                        constraints: BoxConstraints(
                          maxWidth: MediaQuery.of(context).size.width * 0.75,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            if (isVideoInvite) ...[
                              Text(
                                '🎥 Taskilo Video-Call',
                                style: TextStyle(
                                  color: isMe ? Colors.white : Colors.black87,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                ),
                              ),
                              const SizedBox(height: 8),
                              ElevatedButton.icon(
                                onPressed: () => _joinVideoCall(!isMe),
                                icon: Icon(
                                  Icons.video_call,
                                  size: 18,
                                  color: isMe
                                      ? const Color(0xFF14AD9F)
                                      : Colors.white,
                                ),
                                label: Text(
                                  'Jetzt beitreten',
                                  style: TextStyle(
                                    color: isMe
                                        ? const Color(0xFF14AD9F)
                                        : Colors.white,
                                  ),
                                ),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: isMe
                                      ? Colors.white
                                      : const Color(0xFF14AD9F),
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 8,
                                  ),
                                  minimumSize: const Size(0, 36),
                                ),
                              ),
                            ] else ...[
                              Text(
                                text,
                                style: TextStyle(
                                  color: isMe ? Colors.white : Colors.black87,
                                  fontSize: 16,
                                ),
                              ),
                            ],
                            const SizedBox(height: 4),
                            Text(
                              timestamp != null
                                  ? '${timestamp.toDate().hour.toString().padLeft(2, '0')}:${timestamp.toDate().minute.toString().padLeft(2, '0')}'
                                  : '...',
                              style: TextStyle(
                                color: isMe ? Colors.white70 : Colors.black54,
                                fontSize: 10,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  offset: const Offset(0, -4),
                  blurRadius: 10,
                ),
              ],
            ),
            child: Row(
              children: [
                IconButton(
                  onPressed: _sendVideoInvite,
                  icon: Icon(Icons.video_call, color: const Color(0xFF14AD9F)),
                  tooltip: 'Video-Call starten',
                  style: IconButton.styleFrom(
                    backgroundColor: TaskiloColors.primary.withValues(
                      alpha: 0.1,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    decoration: InputDecoration(
                      hintText: 'Nachricht schreiben...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                      filled: true,
                      fillColor: Colors.grey[100],
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 10,
                      ),
                    ),
                    textCapitalization: TextCapitalization.sentences,
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: _sendMessage,
                  icon: Icon(Icons.send, color: const Color(0xFF14AD9F)),
                  style: IconButton.styleFrom(
                    backgroundColor: TaskiloColors.primary.withValues(
                      alpha: 0.1,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _joinVideoCall(bool isInitiator) async {
    debugPrint(
      '🔵 [JOIN_VIDEO] Starting _joinVideoCall with isInitiator: $isInitiator',
    );
    final user = _auth.currentUser;
    if (user == null) {
      debugPrint('❌ [JOIN_VIDEO] No authenticated user found');
      return;
    }

    debugPrint(
      '✅ [JOIN_VIDEO] User authenticated: ${user.uid}, displayName: ${user.displayName}, email: ${user.email}',
    );
    debugPrint(
      '📋 [JOIN_VIDEO] Chat details - applicationId: ${widget.applicationId}, companyId: ${widget.companyId}, companyName: ${widget.companyName}',
    );

    try {
      // Navigate directly to video call screen
      // The screen will handle sending the request itself
      if (mounted) {
        debugPrint('🚀 [JOIN_VIDEO] Navigating to TaskiloVideoCallScreen');
        debugPrint(
          '📋 [JOIN_VIDEO] Screen params - chatId: ${widget.applicationId}, userId: ${user.uid}, userName: ${user.displayName ?? 'User'}',
        );

        await Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => TaskiloVideoCallScreen(
              chatId: widget.applicationId,
              userId: user.uid,
              userName: user.displayName ?? 'User',
              userEmail: user.email,
              companyId: widget.companyId,
              isInitiator:
                  false, // User is never initiator, waits for company approval
            ),
          ),
        );
        debugPrint('🔙 [JOIN_VIDEO] Returned from TaskiloVideoCallScreen');
      }
    } catch (error) {
      debugPrint('💥 [JOIN_VIDEO] ERROR in _joinVideoCall: $error');
      debugPrint('📊 [JOIN_VIDEO] Error type: ${error.runtimeType}');

      // Close loading dialog if still open
      if (mounted && Navigator.canPop(context)) {
        debugPrint('❌ [JOIN_VIDEO] Closing loading dialog after error');
        Navigator.of(context).pop();
      }

      debugPrint('Error starting video call request: $error');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Fehler bei Video-Call-Anfrage: $error')),
        );
      }
    }
  }

  Future<void> _sendVideoInvite() async {
    debugPrint('🔵 [VIDEO_INVITE] Starting _sendVideoInvite');
    final user = _auth.currentUser;
    if (user == null) {
      debugPrint('❌ [VIDEO_INVITE] No authenticated user found');
      return;
    }

    debugPrint('✅ [VIDEO_INVITE] User authenticated: ${user.uid}');
    final inviteText = '🎥 Einladung zum Taskilo Video-Call';

    try {
      debugPrint(
        '📝 [VIDEO_INVITE] Creating chat reference for applicationId: ${widget.applicationId}',
      );
      final chatRef = _db.collection('chats').doc(widget.applicationId);

      // Ensure chat doc exists
      debugPrint('🔍 [VIDEO_INVITE] Checking if chat document exists');
      final chatDoc = await chatRef.get();

      if (!chatDoc.exists) {
        debugPrint(
          '📝 [VIDEO_INVITE] Chat document does not exist, creating new one',
        );
        debugPrint(
          '👥 [VIDEO_INVITE] Users: [${widget.companyId}, ${user.uid}]',
        );
        await chatRef.set({
          'users': [widget.companyId, user.uid],
          'createdAt': FieldValue.serverTimestamp(),
          'updatedAt': FieldValue.serverTimestamp(),
          'lastMessage': '🎥 Video-Call Einladung',
          'applicationId': widget.applicationId,
        });
        debugPrint('✅ [VIDEO_INVITE] Chat document created successfully');
      } else {
        debugPrint('📝 [VIDEO_INVITE] Chat document exists, updating it');
        await chatRef.update({
          'updatedAt': FieldValue.serverTimestamp(),
          'lastMessage': '🎥 Video-Call Einladung',
        });
        debugPrint('✅ [VIDEO_INVITE] Chat document updated successfully');
      }

      debugPrint('💬 [VIDEO_INVITE] Adding message to messages collection');
      debugPrint(
        '📋 [VIDEO_INVITE] Message data: text="$inviteText", senderId="${user.uid}", chatUsers=[${widget.companyId}, ${user.uid}]',
      );
      await chatRef.collection('messages').add({
        'text': inviteText,
        'senderId': user.uid,
        'timestamp': FieldValue.serverTimestamp(),
        'chatUsers': [widget.companyId, user.uid],
      });
      debugPrint('✅ [VIDEO_INVITE] Video invite message sent successfully');
    } catch (e) {
      debugPrint('💥 [VIDEO_INVITE] ERROR: $e');
      debugPrint('📊 [VIDEO_INVITE] Error type: ${e.runtimeType}');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Einladung konnte nicht gesendet werden'),
          ),
        );
      }
    }
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    final user = _auth.currentUser;
    if (user == null) return;

    _messageController.clear();

    try {
      final chatRef = _db.collection('chats').doc(widget.applicationId);

      // Ensure chat doc exists
      final chatDoc = await chatRef.get();
      if (!chatDoc.exists) {
        await chatRef.set({
          'users': [widget.companyId, user.uid],
          'createdAt': FieldValue.serverTimestamp(),
          'updatedAt': FieldValue.serverTimestamp(),
          'lastMessage': text,
          'applicationId': widget.applicationId,
        });
      } else {
        await chatRef.update({
          'updatedAt': FieldValue.serverTimestamp(),
          'lastMessage': text,
        });
      }

      await chatRef.collection('messages').add({
        'text': text,
        'senderId': user.uid,
        'timestamp': FieldValue.serverTimestamp(),
        'chatUsers': [widget.companyId, user.uid],
      });
    } catch (e) {
      debugPrint('Error sending message: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Nachricht konnte nicht gesendet werden'),
          ),
        );
      }
    }
  }
}
