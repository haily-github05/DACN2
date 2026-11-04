// Thành phần: Avatar người dùng từ hồ sơ, dùng chữ viết tắt khi thiếu hoặc lỗi ảnh.
import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { avatarSource } from '../lib/profileApi';
export default function UserAvatar({ uri, initials, name, size = 46 }: { uri?: string | null; initials: string; name: string; size?: number }) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const resolved = avatarSource(uri?.trim());
  return <View accessibilityLabel={`Ảnh đại diện của ${name}`} style={{ width:size, height:size, borderRadius:size/2, overflow:'hidden', backgroundColor:'#FEF1EB', borderWidth:1, borderColor:'#EED9CF', alignItems:'center', justifyContent:'center' }}>
    {resolved && resolved !== failedUri ? <Image source={{ uri:resolved }} style={{ width:'100%', height:'100%' }} resizeMode="cover" onError={() => setFailedUri(resolved)}/> : <Text style={{ fontSize:14, fontWeight:'800', color:'#A23A00' }}>{initials || '?'}</Text>}
  </View>;
}
