# COMPONENT ARCHITECTURE

**Generated:** 2025-01-25T04:55:00Z
**Commit:** ed4c850
**Branch:** main

## OVERVIEW

41 UI components across 3 subdirs: ui/ (reusable), form/ (form fields), bottom sheets (IME-safe).

## STRUCTURE

```
components/
├── ui/                 # Reusable components (6 files, index.ts exports)
│   ├── UncontrolledInput.tsx
│   ├── Button.tsx
│   ├── Card.tsx
│   └── ...
├── form/               # Form field components (3 files)
│   ├── CategoryField.tsx
│   └── ...
├── CreateItemBottomSheet.tsx  # Item creation form (567 lines)
├── EditItemBottomSheet.tsx    # Item edit form (539 lines, ~80% duplicate)
├── TodoCard.tsx              # Todo card with inline editing (509 lines)
└── ... (41 total files)
```

## WHERE TO LOOK

| Task              | Location           | Notes                                                            |
| ----------------- | ------------------ | ---------------------------------------------------------------- |
| Reusable UI       | `ui/`              | Button, Card, UncontrolledInput with index.ts exports            |
| Form fields       | `form/`            | CategoryField with grid layout, 3-column responsive              |
| Bottom sheets     | `*BottomSheet.tsx` | IME-safe uncontrolled inputs, refs + defaultValue pattern        |
| Styled components | Root components    | Theme injection via `StyledProps` from utils/styledComponents.ts |

## CONVENTIONS

- **Uncontrolled inputs**: Bottom sheets use `defaultValue` + refs for IME composition support
- **Ref pattern**: Store current value in ref (`onChangeText`), sync to state on blur/submit
- **Reset with key**: Increment `key` prop to reset form state on close
- **Styled exports**: index.ts exports both component and type (e.g., `export { Button }`, `export type { ButtonProps }`)
- **Theme injection**: All styled components use `({ theme }: StyledProps) => theme.colors.surface`

## ANTI-PATTERNS (THIS PROJECT)

- **NEVER** use controlled inputs (`value` prop) in bottom sheet modals - breaks IME composition
- **ALWAYS** use `BottomSheetTextInput` from @gorhom/bottom-sheet in bottom sheets
- **NEVER** duplicate styled component definitions - extract to shared files
- **Avoid** ~80% code duplication between CreateItemBottomSheet and EditItemBottomSheet
