# NAVIGATION ARCHITECTURE

**Generated:** 2025-01-25T04:55:00Z
**Commit:** ed4c850
**Branch:** main

## OVERVIEW

2-level navigation: RootStack (native stack for modals) → MainTabs (bottom tabs) → 4 tab stacks.

## STRUCTURE

```
navigation/
├── types.ts             # Navigation types (RootStackParamList, TabParamList)
├── RootStack.tsx         # Root native stack navigator (modals + screens)
├── TabNavigator.tsx       # Bottom tab navigator (4 tabs)
├── HomeStack.tsx         # Home tab stack
├── NotesStack.tsx         # Notes tab stack
├── ShareStack.tsx         # Share tab stack
└── SettingsStack.tsx       # Settings tab stack
```

## WHERE TO LOOK

| Task                | Location                            | Notes                                                         |
| ------------------- | ----------------------------------- | ------------------------------------------------------------- |
| Navigation config   | `RootStack.tsx`, `TabNavigator.tsx` | 2-level nesting pattern                                       |
| Screen registration | `RootStack.tsx`                     | MainTabs + ItemDetails, ExportData, ExportDataDetail, Profile |
| Type definitions    | `types.ts`                          | RootStackParamList, HomeTabParamList, etc.                    |

## CONVENTIONS

- **RootStack**: Native stack for modal screens and detail navigation
- **MainTabs**: Bottom tab navigator with 4 tabs (Home, Notes, Share, Settings)
- **Tab stacks**: Each tab has its own stack for navigation within that tab
- **Screen naming**: `{Tab}Screen.tsx` pattern (HomeScreen.tsx, NotesScreen.tsx, etc.)

## ANTI-PATTERNS (THIS PROJECT)

- **NEVER** nest navigators more than 2 levels (RootStack → MainTabs → TabStack)
- **ALWAYS** define types in `types.ts` for type-safe navigation
