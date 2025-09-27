import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:3000" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,
  isSigningUp: false,
  isLoggingIn: false,
  socket: null,
  onlineUsers: [],
  lastAuthCheck: 0, // Add timestamp to prevent frequent checks
  hasInitialCheck: false, // Add flag to prevent duplicate initial checks

  checkAuth: async () => {
    // Prevent duplicate calls - check if already in progress
    if (get().isCheckingAuth && get().hasInitialCheck) {
      console.log("Auth check already in progress, skipping...");
      return;
    }

    // Prevent frequent auth checks (minimum 5 seconds between checks)
    const now = Date.now();
    const timeSinceLastCheck = now - get().lastAuthCheck;
    if (timeSinceLastCheck < 5000 && get().lastAuthCheck > 0) {
      console.log("Auth check too frequent, skipping...");
      set({ isCheckingAuth: false });
      return;
    }

    console.log("Starting auth check...");
    set({ isCheckingAuth: true });

    try {
      const res = await axiosInstance.get("/auth/check");
      console.log("Auth check successful:", res.data);
      set({ 
        authUser: res.data,
        lastAuthCheck: now,
        hasInitialCheck: true
      });
      get().connectSocket();
    } catch (error) {
      // Only log non-401 errors to reduce console noise
      if (error.response?.status === 401) {
        console.log("User not authenticated (401) - this is normal");
        set({ authUser: null });
      } else if (error.response?.status === 429) {
        console.log("Auth check rate limited. Extending interval.");
        set({ lastAuthCheck: now + 60000 }); // Wait extra minute
      } else if (error.code === "ECONNABORTED" || error.message === "Request aborted") {
        console.log("Auth check timed out");
      } else {
        console.log("Error in authCheck:", error);
        set({ authUser: null });
      }
    } finally {
      set({ 
        isCheckingAuth: false,
        lastAuthCheck: Math.max(now, get().lastAuthCheck),
        hasInitialCheck: true
      });
      console.log("Auth check completed");
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });

      toast.success("Account created successfully!");
      get().connectSocket();
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Signup failed. Please try again.";
      toast.error(errorMessage);
      console.log("Signup error:", error);
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });

      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Login failed. Please try again.";
      toast.error(errorMessage);
      console.log("Login error:", error);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ 
        authUser: null,
        lastAuthCheck: 0 // Reset auth check timestamp
      });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      toast.error("Error logging out");
      console.log("Logout error:", error);
      
      // Force logout on client side even if server request fails
      set({ 
        authUser: null,
        lastAuthCheck: 0
      });
      get().disconnectSocket();
    }
  },

  updateProfile: async (data) => {
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("Error in update profile:", error);
      const errorMessage = error.response?.data?.message || "Profile update failed. Please try again.";
      toast.error(errorMessage);
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      withCredentials: true, // this ensures cookies are sent with the connection
      timeout: 10000, // Add timeout for socket connection
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
    });

    socket.connect();
    set({ socket });

    // listen for online users event
    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });

    // Handle socket connection errors
    socket.on("connect_error", (error) => {
      console.log("Socket connection error:", error);
    });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket?.connected) {
      socket.disconnect();
      set({ socket: null });
    }
  },
}));