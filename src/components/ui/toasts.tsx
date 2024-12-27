"use client";

import { create } from "zustand";

interface Toast {
  id: string;
  message: string;
  type?: string;
}

export interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, type?: string) => void;
}

export const useToastStore = create<ToastStore>()((set) => ({
  toasts: [],
  addToast: (message: string, type?: string) => {
    const id = Math.random().toString(36).replace("0.", "");
    set((state) => {
      const toast: Toast = { id, message, type };
      return {
        toasts: [...state.toasts, toast],
      };
    });
    setTimeout(() => {
      set((state) => {
        const toasts = state.toasts.filter((toast) => toast.id !== id);
        return { toasts };
      });
    }, 2500);
  },
}));

export const Toasts = () => {
  const toasts = useToastStore().toasts;
  return (
    <div className="fixed top-0 left-0 right-0 h-0 flex justify-center">
      <div className="flex flex-col md:items-center gap-2 p-2 relative top-12">
        {toasts.map((toast) => (
          <Toast key={toast.id} message={toast.message} />
        ))}
      </div>
    </div>
  );
};

interface ToastProps {
  message: string;
}
const Toast = ({ message }: ToastProps) => {
  return (
    <div className="text-inverse bg-secondary py-2 px-4 flex items-center rounded gap-2 animate-fade-in-down min-w-72">
      <div className="flex-grow text-center">{message}</div>
    </div>
  );
};
