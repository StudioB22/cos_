import { AppError } from '../http/app-error.js';

const htmlEscapes: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const normalizeEmail = (value: string): string => value.trim().toLowerCase();
export const normalizePseudo = (value: string): string => value.trim();
export const normalizeRoomName = (value: string): string => value.trim().toLowerCase();

export const sanitizeMessage = (value: string): string => {
  const sanitized = value
    .trim()
    .replace(/[&<>"']/g, (character) => htmlEscapes[character] ?? character);

  if (!sanitized) {
    throw new AppError('INVALID_MESSAGE', 'Message cannot be empty.', 400);
  }

  if (sanitized.length > 240) {
    throw new AppError('MESSAGE_TOO_LONG', 'Message exceeds the 240 character limit.', 400);
  }

  return sanitized;
};
