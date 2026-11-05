// Thành phần: Yêu cầu đăng nhập trước khi mở chức năng và dữ liệu cá nhân.
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LockKeyhole } from 'lucide-react-native';
import { getAuthUser } from '../lib/auth';
import AppHeader from './AppHeader';
import BottomNav from './BottomNav';
export default function RequireLogin({children}:{children:React.ReactNode}) {
 const router=useRouter();
 const [signedIn,setSignedIn]=useState<boolean|null>(null);
 useFocusEffect(useCallback(()=>{
  let active=true;
  getAuthUser().then(user=>{if(active)setSignedIn(!!user);});
  return()=>{active=false;};
 },[]));
 if(signedIn===null)return <View style={s.loading}><ActivityIndicator color="#A23A00"/></View>;
 if(signedIn)return <>{children}</>;
 return <View style={s.page}><AppHeader/><View style={s.body}>
  <View style={s.icon}><LockKeyhole size={34} color="#A23A00"/></View>
  <Text style={s.title}>Vui lòng đăng nhập</Text>
  <Text style={s.description}>Vui lòng đăng nhập để hiển thị và sử dụng chức năng này.</Text>
  <Pressable style={s.primary} onPress={()=>router.push('/login')}><Text style={s.white}>Đăng nhập ngay</Text></Pressable>
  <Pressable style={s.secondary} onPress={()=>router.replace('/explore')}><Text style={s.orange}>Tiếp tục khám phá món ăn</Text></Pressable>
 </View><BottomNav/></View>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#FFF8F6'},loading:{flex:1,alignItems:'center',justifyContent:'center'},body:{flex:1,alignItems:'center',justifyContent:'center',padding:28,gap:18},icon:{padding:22,borderRadius:30,backgroundColor:'#FEF1EB'},title:{fontSize:23,fontWeight:'800',color:'#201A17'},description:{fontSize:14,lineHeight:23,textAlign:'center',color:'#735A51'},primary:{backgroundColor:'#A23A00',paddingVertical:15,paddingHorizontal:30,borderRadius:13},white:{color:'white',fontWeight:'700'},secondary:{padding:12},orange:{color:'#A23A00',fontWeight:'600'}});
