import { Alert } from 'react-native';
import type { ItemFormData, ItemFormErrors } from '../hooks/useItemForm';

/**
 * Validation utility functions for forms.
 * Centralizes validation logic that was previously embedded in UI components.
 */

/**
 * Validates item form data and returns errors object.
 * Returns null if validation passes.
 */
export const validateItemForm = (
  data: ItemFormData,
  t?: (key: string) => string
): ItemFormErrors | null => {
  const errors: ItemFormErrors = {};

  if (!data.name.trim()) {
    errors.name = t ? t('editItem.errors.enterName') : 'Name is required';
  }
  if (!data.categoryId) {
    errors.categoryId = t
      ? t('editItem.errors.selectCategory')
      : 'Category is required';
  }
  if (!data.locationId) {
    errors.locationId = t
      ? t('editItem.errors.selectLocation')
      : 'Location is required';
  }

  return Object.keys(errors).length > 0 ? errors : null;
};

/**
 * Validates item form and shows alert with first error if validation fails.
 * Returns true if validation passes.
 */
export const validateAndShowItemErrors = (
  data: ItemFormData,
  t: (key: string) => string
): boolean => {
  const errors = validateItemForm(data, t);

  if (errors) {
    const firstError = Object.values(errors)[0];
    if (firstError) {
      Alert.alert(t('editItem.errors.title'), firstError);
    }
    return false;
  }

  return true;
};

/**
 * Generic email validation.
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Password strength validation.
 * Returns object with isValid boolean and optional message.
 */
export const validatePassword = (
  password: string
): { isValid: boolean; message?: string } => {
  if (password.length < 8) {
    return {
      isValid: false,
      message: 'Password must be at least 8 characters',
    };
  }

  // Check for at least one letter and one number
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasLetter || !hasNumber) {
    return {
      isValid: false,
      message: 'Password must contain both letters and numbers',
    };
  }

  return { isValid: true };
};

/**
 * Category form validation.
 */
export interface CategoryFormData {
  name: string;
  label: string;
}

export interface CategoryFormErrors {
  name?: string;
  label?: string;
}

export const validateCategoryForm = (
  data: CategoryFormData,
  t?: (key: string) => string
): CategoryFormErrors | null => {
  const errors: CategoryFormErrors = {};

  if (!data.name.trim()) {
    errors.name = t
      ? t('categoryManager.errors.enterName')
      : 'Name is required';
  }
  if (!data.label.trim()) {
    errors.label = t
      ? t('categoryManager.errors.enterName')
      : 'Label is required';
  }

  return Object.keys(errors).length > 0 ? errors : null;
};
