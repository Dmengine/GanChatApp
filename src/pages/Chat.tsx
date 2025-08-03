import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { SERVER_URL } from '../api/global';
import socket from '../socket';
import { useNavigate } from 'react-router-dom';

interface User {
  _id: string;
  email: string;
  name: string;
}

interface Chat {
  _id: string;
  name: string;
  members: User[];
  isGroup: boolean;
  admin: User;
}

interface Message {
  _id: string;
  sender: User;
  content: string;
  chat: string;
  createdAt: string;
}

const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [newChatEmail, setNewChatEmail] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState('');
  const [addMembersInput, setAddMembersInput] = useState('');
  const [showAddMembers, setShowAddMembers] = useState(false);

  const handleLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('user');
  navigate('/login'); 
};


  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsed = JSON.parse(userData);
      setUser(parsed);
    }
  }, []);

  useEffect(() => {
    if (user?._id) fetchChats();
  }, [user]);

  useEffect(() => {
    if (!selectedChat) return;

    socket.emit('joinChat', selectedChat._id);

    const receiveMessage = (msg: Message) => {
      if (msg.chat === selectedChat._id) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on('receiveMessage', receiveMessage);
    return () => {
      socket.off('receiveMessage', receiveMessage);
    };
  }, [selectedChat]);

  const fetchChats = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${SERVER_URL}/api/chat/${user?._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setChats(res.data);
    } catch (err) {
      console.error('Failed to fetch chats', err);
    } finally {
      setLoading(false);
    }
  };

  const createChat = async () => {
    if (!newChatEmail.trim() || !user) return;

    try {
      setLoading(true);
      const userRes = await axios.get(`${SERVER_URL}/api/chat/user/${newChatEmail}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      const otherUser = userRes.data;

      const res = await axios.post(
        `${SERVER_URL}/api/chat`,
        {
          name: '',
          members: [user._id, otherUser._id],
          isGroup: false,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      if (res.data?._id) {
        setChats((prev) => [...prev, res.data]);
        setNewChatEmail('');
      }
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || 'Failed to create chat');
    } finally {
      setLoading(false);
    }
  };

  const createGroupChat = async () => {
    if (!groupName.trim() || !groupMembers.trim()) return;
    // console.log(localStorage.getItem('token'))
    try {
      const emails = groupMembers.split(',').map((e) => e.trim());
      const memberRes = await Promise.all(
        emails.map((email) =>
          axios.get(`${SERVER_URL}/api/chat/user/${email}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          })
        )
      );

      const members = memberRes.map((res) => res.data._id);
      members.push(user!._id);

      const res = await axios.post(
        `${SERVER_URL}/api/chat`,
        {
          name: groupName,
          members,
          isGroup: true,
          admin: user!._id,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      setChats((prev) => [...prev, res.data]);
      setGroupName('');
      setGroupMembers('');
    } catch (err) {
      console.error('Failed to create group chat', err);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      const res = await axios.get(`${SERVER_URL}/api/message/${chatId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setMessages(res.data.messages);
    } catch (err) {
      console.error('Failed to fetch messages', err);
    }
  };

  const handleSelectChat = async (chat: Chat) => {
    setSelectedChat(chat);
    fetchMessages(chat._id);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !user) return;

    try {
      const res = await axios.post(
        `${SERVER_URL}/api/message/${selectedChat._id}`,
        {
          sender: user._id,
          content: newMessage,
          chat: selectedChat._id,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      setMessages((prev) => [...prev, res.data]);
      socket.emit('sendMessage', {
        chatId: selectedChat._id,
        message: res.data,
      });

      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const addMembersToGroup = async () => {
  if (!selectedChat || !addMembersInput.trim()) return;

  try {
    const emails = addMembersInput.split(',').map((e) => e.trim());
    const memberRes = await Promise.all(
      emails.map((email) =>
        axios.get(`${SERVER_URL}/api/chat/user/${email}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        })
      )
    );

    const newMembers = memberRes.map((res) => res.data._id);

    const res = await axios.put(
      `${SERVER_URL}/api/chat/${selectedChat._id}/add-members`,
      { newMembers },
      {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      }
    );

    setSelectedChat(res.data);
    setAddMembersInput('');
    setShowAddMembers(false);
  } catch (error: any) {
    console.error('Failed to add members:', error);
    alert(error.response?.data?.message || 'Error adding members');
  }
};


  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      {/* Left Panel */}
      <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r bg-white">
      <div className="flex justify-between items-center p-4">
        <h2 className="text-xl font-semibold">Chats</h2>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-3 py-1 rounded-md text-sm"
        >
          Logout
        </button>
      </div>

        <div className="p-4">
          <h2 className="text-xl font-semibold text-center mb-4">Chats</h2>

          <div className="flex mb-4">
            <input
              type="email"
              placeholder="Enter email"
              value={newChatEmail}
              onChange={(e) => setNewChatEmail(e.target.value)}
              className="p-2 border rounded-l w-full"
            />
            <button
              onClick={createChat}
              className="bg-blue-600 text-white px-4 rounded-r"
              disabled={loading}
            >
              {loading ? '...' : 'Create'}
            </button>
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Group Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="p-2 border rounded mb-2 w-full"
            />
            <input
              type="text"
              placeholder="Member emails (comma separated)"
              value={groupMembers}
              onChange={(e) => setGroupMembers(e.target.value)}
              className="p-2 border rounded mb-2 w-full"
            />
            <button
              onClick={createGroupChat}
              className="bg-purple-600 text-white px-4 py-2 w-full rounded"
            >
              Add Group
            </button>
          </div>

          <ul>
            {chats.map((chat) => (
              <li
                key={chat._id}
                className={`p-3 border-b hover:bg-gray-100 cursor-pointer ${
                  selectedChat?._id === chat._id ? 'bg-gray-200' : ''
                }`}
                onClick={() => handleSelectChat(chat)}
              >
                {chat.isGroup
                  ? chat.name
                  : chat.members.find((m) => m._id !== user?._id)?.email}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 p-4 min-h-[60vh]">
        {selectedChat ? (
          <>
            <h3 className="text-lg font-bold mb-4">
              {selectedChat.isGroup
                ? selectedChat.name
                : selectedChat.members.find((m) => m._id !== user?._id)?.email}
            </h3>
            {selectedChat.isGroup && selectedChat.admin?._id === user?._id && (
              <div className="mb-4">
                <button
                  onClick={() => setShowAddMembers((prev) => !prev)}
                  className="text-sm text-blue-600 underline"
                >
                  + Add Members
                </button>

                {showAddMembers && (
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder="Emails (comma separated)"
                      value={addMembersInput}
                      onChange={(e) => setAddMembersInput(e.target.value)}
                      className="p-2 border rounded w-full mb-2"
                    />
                    <button
                      onClick={addMembersToGroup}
                      className="bg-blue-500 text-white px-4 py-2 rounded text-sm"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            )}
            <div className="h-[70vh] overflow-y-auto border p-4 rounded bg-white space-y-2">
              {messages.map((msg) => (
                <div
                  key={msg._id}
                  className={`p-2 rounded-md max-w-xs ${
                    msg.sender._id === user?._id
                      ? 'ml-auto bg-blue-100 text-right'
                      : 'mr-auto bg-gray-200'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex">
              <input
                type="text"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="p-3 border rounded-l w-full"
              />
              <button
                onClick={sendMessage}
                className="bg-green-600 text-white px-4 rounded-r"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a chat to start messaging.
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
