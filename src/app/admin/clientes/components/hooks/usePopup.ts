import { useState } from 'react';

export interface PopupState {
  show: boolean;
  type: 'success' | 'error' | 'confirm';
  title: string;
  message: string;
  onConfirm?: () => void;
}

export function usePopup() {
  const [popup, setPopup] = useState<PopupState>({
    show: false, type: 'success', title: '', message: ''
  });

  const showSuccess = (title: string, message: string) =>
    setPopup({ show: true, type: 'success', title, message });

  const showError = (title: string, message: string) =>
    setPopup({ show: true, type: 'error', title, message });

  const showConfirm = (title: string, message: string, onConfirm: () => void) =>
    setPopup({ show: true, type: 'confirm', title, message, onConfirm: () => { onConfirm(); setPopup(p => ({ ...p, show: false })); } });

  const close = () => setPopup(p => ({ ...p, show: false }));

  return { popup, showSuccess, showError, showConfirm, close };
}