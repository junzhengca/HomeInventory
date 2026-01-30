import { Tabs } from 'expo-router';
import { NativeTabs, Label, Icon, VectorIcon } from 'expo-router/unstable-native-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useTheme } from '../../src/theme/ThemeProvider';
import { useSettings } from '../../src/store/hooks';

import { useTranslation } from 'react-i18next';

export default function TabLayout() {
    const theme = useTheme();
    const { settings } = useSettings();
    const isDark = settings?.darkMode;
    const { t } = useTranslation();

    return (
        <NativeTabs
            minimizeBehavior="onScrollDown"
            tintColor={theme.colors.primary}
            backgroundColor="transparent"
            blurEffect={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
            shadowColor="transparent"
        >
            <NativeTabs.Trigger name="index">
                <Label>{t('navigation.home')}</Label>
                <Icon src={<VectorIcon family={Ionicons} name="home" />} />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="notes">
                <Label>{t('navigation.notes')}</Label>
                <Icon src={<VectorIcon family={MaterialCommunityIcons} name="notebook-edit" />} />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="share">
                <Label>{t('navigation.share')}</Label>
                <Icon src={<VectorIcon family={Ionicons} name="share" />} />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="settings">
                <Label>{t('navigation.settings')}</Label>
                <Icon src={<VectorIcon family={Ionicons} name="settings" />} />
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
