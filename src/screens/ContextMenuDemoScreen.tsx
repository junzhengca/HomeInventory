import React from 'react';
import { StyleSheet, View, Text, SafeAreaView, ScrollView } from 'react-native';
import { ContextMenu } from '../components/organisms/ContextMenu/ContextMenu';
import { useTheme } from '../theme/ThemeProvider';

export const ContextMenuDemoScreen: React.FC = () => {
    const theme = useTheme();

    const menuItems = [
        { id: 'reply', label: 'Reply', icon: 'reply', onPress: () => console.log('Reply') },
        { id: 'forward', label: 'Forward', icon: 'share', onPress: () => console.log('Forward') },
        { id: 'copy', label: 'Copy', icon: 'content-copy', onPress: () => console.log('Copy') },
        { id: 'delete', label: 'Delete for you', icon: 'delete-outline', onPress: () => console.log('Delete'), isDestructive: true },
        { id: 'unsend', label: 'Unsend', icon: 'undo', onPress: () => console.log('Unsend'), isDestructive: true },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={[styles.title, { color: theme.colors.text }]}>Context Menu Demo</Text>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                    Long press the items below to reveal the context menu.
                </Text>

                <View style={styles.demoArea}>
                    <ContextMenu items={menuItems}>
                        <View style={[styles.messageBubble, { backgroundColor: theme.colors.primary }]}>
                            <Text style={styles.messageText}>Foo</Text>
                        </View>
                    </ContextMenu>

                    <View style={{ height: 40 }} />

                    <ContextMenu items={menuItems.slice(0, 3)}>
                        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Simple Menu Card</Text>
                            <Text style={{ color: theme.colors.textSecondary }}>No emojis here, just a simple menu.</Text>
                        </View>
                    </ContextMenu>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 40,
    },
    demoArea: {
        width: '100%',
        alignItems: 'flex-end',
        paddingRight: 20,
    },
    messageBubble: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        maxWidth: '80%',
    },
    messageText: {
        color: '#fff',
        fontSize: 16,
    },
    card: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        width: 250,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
});
