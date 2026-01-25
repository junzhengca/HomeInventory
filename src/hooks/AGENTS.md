# HOOKS & UTILITIES

**Generated:** 2025-01-25T04:55:00Z
**Commit:** ed4c850
**Branch:** main

## OVERVIEW

11 utilities + 4 custom hooks for keyboard, forms, toasts, and validation.

## STRUCTURE

```
utils/                 # Shared utilities
├── Logger.ts           # Centralized logging (11 categories, configurable)
├── formatters.ts       # Data formatting (price, date, location, currency)
├── validation.ts       # Form validation (item, category, email, password)
├── styledComponents.ts  # StyledProps type for theme injection
├── layout.ts           # Bottom padding calculations
├── colors.ts           # Color utilities (getLightColor)
├── idGenerator.ts      # ID generation (items, todos, categories)
├── jwtUtils.ts         # JWT decode/expire check
├── categoryUtils.ts     # Category filtering
└── locationUtils.ts     # Location utilities

hooks/                # Custom React hooks
├── useKeyboardVisibility.ts  # Keyboard state tracking
├── useItemForm.ts          # Form state management
└── useToast.ts             # Toast notifications
```

## WHERE TO LOOK

| Task         | Location                         | Notes                                                      |
| ------------ | -------------------------------- | ---------------------------------------------------------- |
| Logging      | `utils/Logger.ts`                | Category-specific loggers (api, sync, auth, storage, etc.) |
| Formatters   | `utils/formatters.ts`            | formatPrice, formatDate, formatLocation, formatCurrency    |
| Validation   | `utils/validation.ts`            | validateItemForm, validateCategoryForm, isValidEmail       |
| Theme access | `utils/styledComponents.ts`      | StyledProps type used in 28+ components                    |
| Keyboard     | `hooks/useKeyboardVisibility.ts` | Used in bottom sheets (Create, Edit, CategoryManager)      |

## CONVENTIONS

- **Logging**: Use category-specific loggers (`apiLogger.info`, `syncLogger.error`) - NEVER `console.log()`
- **Formatters**: Pure functions for display formatting (no side effects)
- **Validation**: Return `{ valid: boolean, errors: string[] }` pattern
- **Theme**: Inject via `({ theme }: StyledProps) => theme.colors.surface`

## ANTI-PATTERNS (THIS PROJECT)

- **NEVER** use `console.log()` - use Logger from `utils/Logger.ts`
- **ALWAYS** use `StyledProps` from `utils/styledComponents.ts` for theme injection
