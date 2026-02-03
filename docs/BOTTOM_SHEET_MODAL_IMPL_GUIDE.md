# Bottom Sheet Modal Implementation Guide

This guide documents the standard patterns for implementing Bottom Sheet Modals in the HomeInventory application. Adhering to these guidelines ensures UI consistency, proper keyboard handling, and correct behavior across devices.

## 1. Core Configuration

All bottom sheets should use the `BottomSheetModal` component from `@gorhom/bottom-sheet` with the following standard props:

```tsx
<BottomSheetModal
  ref={bottomSheetRef}
  enableDynamicSizing={true}           // Auto-height based on content
  handleComponent={null}               // No drag handle (clean look)
  enablePanDownToClose={true}
  android_keyboardInputMode="adjustResize" // Critical for Android keyboard handling
  backdropComponent={renderBackdrop}
  backgroundStyle={{ backgroundColor: theme.colors.surface }}
  footerComponent={renderFooter}       // Fixed bottom action bar
  onDismiss={() => Keyboard.dismiss()}
>
```

## 2. Layout Structure

### Main Wrapper
Use `BottomSheetView` (not `ScrollView` unless content is very long) to wrap your content. This correctly communicates content size to the modal.

### Content Padding
**CRITICAL**: You must add `paddingBottom` to your main content container to account for the fixed footer height. Otherwise, the last form fields will be hidden behind the button.

```tsx
// Calculate approximate footer height: padding + button height + safe area
const footerHeight = 82 + (isKeyboardVisible ? 0 : insets.bottom);

<BottomSheetView style={{ paddingBottom: footerHeight }}>
    <BottomSheetHeader ... />
    <FormContainer>
        {/* Inputs */}
    </FormContainer>
</BottomSheetView>
```

## 3. Fixed Footer Pattern

Use a fixed footer for primary actions (e.g., "Done", "Save").

### Styling
The footer must handle safe area insets dynamically. When the keyboard is open, the bottom safe area padding should be **removed** so the button sits flush with the keyboard.

```tsx
const FooterContainer = styled.View<{
  bottomInset: number;
  showSafeArea: boolean;
}>`
  background-color: ${({ theme }) => theme.colors.surface};
  // ... shadow and fixed padding ...
  
  // Conditional bottom padding
  padding-bottom: ${({ bottomInset, showSafeArea, theme }) =>
    showSafeArea ? bottomInset + theme.spacing.md : theme.spacing.md}px;
`;
```

### Implementation
Use the `useKeyboardVisibility` hook to control the padding.

```tsx
const { isKeyboardVisible } = useKeyboardVisibility();

const renderFooter = useCallback(() => (
    <FooterContainer 
        bottomInset={insets.bottom} 
        showSafeArea={!isKeyboardVisible} // Remove safe area when keyboard is up
    >
        <Button label="Done" fullWidth ... />
    </FooterContainer>
), [insets.bottom, isKeyboardVisible]);
```

## 4. Input Handling (IME & Clearing)

### Uncontrolled Inputs
To support Chinese/Japanese input methods (IME), use `UncontrolledInput` with `defaultValue`. Standard controlled inputs (`value` prop) will interrupt composition.

### Programmatic Clearing
Since visual state is uncontrolled, you must use `refs` to clear inputs after successful submission.

```tsx
const nameInputRef = useRef<TextInput>(null);

const handleSubmit = async () => {
    await createItem();
    
    // 1. Reset state
    setName('');
    
    // 2. Clear visual input
    nameInputRef.current?.clear();
    
    handleClose();
};
```

### Spacing
Keep form spacing tight. Use `gap: theme.spacing.sm` (approx 8px) or `md` between related fields. Avoid large gaps (`lg`) inside standard forms.

```tsx
const FormContainer = styled.View`
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm}px; // Tight spacing
  padding-horizontal: ${({ theme }) => theme.spacing.md}px;
`;
```

## 5. Shared Components

Always use the existing atomic components to ensure visual consistency:

*   **Header**: `<BottomSheetHeader title="..." subtitle="..." onClose={...} />`
*   **Button**: `<Button variant="primary" fullWidth ... />`
*   **Inputs**: `<UncontrolledInput ... />` wrapped in `<FormSection label="...">`

## Summary Checklist

- [ ] `enableDynamicSizing={true}` & `handleComponent={null}`?
- [ ] Content wrapped in `BottomSheetView`?
- [ ] Content has `paddingBottom` to prevent footer overlap?
- [ ] Footer uses `FooterContainer` as `footerComponent`?
- [ ] Footer removes safe area padding when `isKeyboardVisible` is true?
- [ ] Inputs use `defaultValue` + `ref.clear()` pattern?
- [ ] Input spacing is `sm` or `md` (not large)?
