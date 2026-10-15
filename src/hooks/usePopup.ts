import { useState } from 'react';

export interface PopupState {
  show: boolean;
  type: 'success' | 'error' | 'confirm' | 'info';
  title: string;
  message: string;
  onConfirm?: () => void;
  duration?: number;
}

export function usePopup() {
  const [popup, setPopup] = useState<PopupState>({
    show: false, type: 'success', title: '', message: ''
  });

  const showSuccess = (title: string, message: string, duration?: number) =>
    setPopup({ show: true, type: 'success', title, message, duration });

  const showError = (title: string, message: string, duration?: number) =>
    setPopup({ show: true, type: 'error', title, message, duration });

  const showInfo = (title: string, message: string, duration?: number) =>
    setPopup({ show: true, type: 'info', title, message, duration });

  const showConfirm = (title: string, message: string, onConfirm: () => void) =>
    setPopup({ show: true, type: 'confirm', title, message, onConfirm: () => { onConfirm(); setPopup(p => ({ ...p, show: false })); } });

  const close = () => setPopup(p => ({ ...p, show: false }));

  return { popup, showSuccess, showError, showInfo, showConfirm, close };
}
