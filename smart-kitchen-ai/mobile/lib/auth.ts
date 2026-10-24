
import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_KEY = "authUser";
let sessionUser: AuthUser | null = null;

export type AuthUser = {
  user_id: number;
  full_name: string;
  phone: string | null;
  email?: string | null;
};

export async function saveAuthUser(
  user: AuthUser,
  remember = true
): Promise<void> {
  const userId = Number(user.user_id);

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new Error("user_id không hợp lệ");
  }

  sessionUser = {
    ...user,
    user_id: userId,
  };

  if (remember) {
    await AsyncStorage.setItem(
      AUTH_KEY,
      JSON.stringify(sessionUser)
    );
  } else {
    await AsyncStorage.removeItem(AUTH_KEY);
  }
}

export async function getAuthUser(): Promise<AuthUser | null> {
    if (sessionUser) return sessionUser;
    
  try {
    const saved = await AsyncStorage.getItem(AUTH_KEY);

    if (!saved) return null;

    const user = JSON.parse(saved) as AuthUser;

    if (
      !Number.isSafeInteger(Number(user.user_id)) ||
      Number(user.user_id) <= 0
    ) {
      return null;
    }
    sessionUser = user;

    return user;
  } catch {
    return null;
  }
}

export async function getCurrentUserId(): Promise<number> {
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Bạn chưa đăng nhập");
  }

  return Number(user.user_id);
}


export async function logoutUser(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_KEY);
  sessionUser = null;
}
