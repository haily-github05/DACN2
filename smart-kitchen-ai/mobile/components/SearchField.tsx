// Thành phần: Ô tìm kiếm dùng chung — nhập, xóa từ khóa và gửi tìm kiếm bằng bàn phím/nút.
import React from "react";
import { Keyboard, Pressable, StyleProp, StyleSheet, TextInput, TextStyle, View, ViewStyle } from "react-native";
import { ArrowRight, Search, X } from "lucide-react-native";
type Props = {
  value:string;onChangeText:(value:string)=>void;placeholder:string;
  onSubmit?:()=>void;style?:StyleProp<ViewStyle>;inputStyle?:StyleProp<TextStyle>;
};
export default function SearchField({value,onChangeText,placeholder,onSubmit,style,inputStyle}:Props) {
  const submit=()=>{Keyboard.dismiss();onSubmit?.();};
  return <View style={[s.container,style]}>
    <Pressable onPress={submit} accessibilityRole="button" accessibilityLabel="Tìm kiếm" hitSlop={8}><Search size={18} color="#A23A00"/></Pressable>
    <TextInput style={[s.input,inputStyle]} value={value} onChangeText={onChangeText} placeholder={placeholder}
      placeholderTextColor="#A18B81" accessibilityLabel={placeholder} autoCorrect={false} autoCapitalize="none"
      returnKeyType="search" onSubmitEditing={submit}/>
    {value.length>0&&<Pressable accessibilityRole="button" accessibilityLabel="Xóa từ khóa tìm kiếm" onPress={()=>onChangeText("")} hitSlop={8}><X size={17} color="#735A51"/></Pressable>}
    {!!onSubmit&&<Pressable accessibilityRole="button" accessibilityLabel="Xem kết quả tìm kiếm" onPress={submit} hitSlop={8} style={s.submit}><ArrowRight size={19} color="#A23A00"/></Pressable>}
  </View>;
}
const s=StyleSheet.create({
 container:{flexDirection:"row",alignItems:"center",gap:10,paddingHorizontal:14,minHeight:48,backgroundColor:"white",borderWidth:1,borderColor:"#EED9CF",borderRadius:12},
 input:{flex:1,minWidth:0,paddingVertical:12,color:"#201A17",fontSize:14},
 submit:{paddingLeft:4},
});
