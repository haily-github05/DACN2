
import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';

import { useRouter } from 'expo-router';

import {
  ChefHat,
  Bell,
  CircleHelp,
  ArrowLeft,
} from 'lucide-react-native';

type AppHeaderProps = {
  showBack?: boolean;
  showNotification?: boolean;
  showHelp?: boolean;
  unreadCount?: number;
  onNotificationPress?: () => void;
  onHelpPress?: () => void;
};

export default function AppHeader({
  showBack = false,
  showNotification = false,
  showHelp = true,
  unreadCount = 0,
  onNotificationPress,
  onHelpPress,
}: AppHeaderProps) {

  const router = useRouter();

  const handleNotification = () => {
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      Alert.alert(
        'Thông báo',
        'Màn hình thông báo sẽ được xây dựng tiếp theo.'
      );
    }
  };

  const handleHelp = () => {
    if (onHelpPress) {
      onHelpPress();
    } else {
      Alert.alert(
        'Trợ giúp',
        'Trung tâm trợ giúp Smart Kitchen AI.'
      );
    }
  };

  return (
    <View style={styles.header}>

      {/* LEFT - LOGO */}
      <View style={styles.left}>

        {showBack && (
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <ArrowLeft size={21} color="#A23A00" />
          </Pressable>
        )}

        <View style={styles.logo}>
          <ChefHat
            size={22}
            color="#A23A00"
            strokeWidth={2.2}
          />
        </View>

        <Text
          style={styles.brand}
          numberOfLines={1}
        >
          SMART KITCHEN AI
        </Text>
      </View>

      {/* RIGHT - NOTIFICATION + HELP */}
      <View style={styles.right}>

        {showNotification && (
          <Pressable
            style={styles.iconButton}
            onPress={handleNotification}
            accessibilityLabel="Thông báo"
          >
            <Bell size={21} color="#A23A00" />

            {unreadCount > 0 && (
              <View style={styles.notificationDot} />
            )}
          </Pressable>
        )}

        {showHelp && (
          <Pressable
            style={styles.iconButton}
            onPress={handleHelp}
            accessibilityLabel="Trợ giúp"
          >
            <CircleHelp
              size={22}
              color="#A23A00"
            />
          </Pressable>
        )}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({

  header: {
    height: 56,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EED9CF',

    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  left: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  logo: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#FFF0E7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  brand: {
    fontSize: 15,
    fontWeight: '800',
    color: '#A23A00',
    flexShrink: 1,
  },

  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },

  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#FFF8F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  notificationDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E44836',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },

  backButton: {
    width: 30,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },

});
