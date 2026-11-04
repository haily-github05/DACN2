// Trang: Danh mục nguyên liệu — tìm toàn bộ bảng ingredients và chọn thêm vào kho.
import React,{useState} from "react";
import {Pressable,ScrollView,StyleSheet,Text,View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {useRouter} from "expo-router";
import {ArrowLeft,Plus} from "lucide-react-native";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import SearchField from "../components/SearchField";
import IngredientCatalogResults from "../components/IngredientCatalogResults";
export default function IngredientCategoriesScreen() {
 const router=useRouter();
 const [search,setSearch]=useState("");
 return <SafeAreaView style={s.page} edges={["left","right"]}>
  <AppHeader/>
  <View style={s.heading}><Pressable style={s.back} accessibilityLabel="Quay lại" onPress={()=>router.canGoBack()?router.back():router.replace("/pantry")}><ArrowLeft size={22} color="#A23A00"/></Pressable><Text style={s.title}>Danh mục nguyên liệu</Text></View>
  <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
   <SearchField value={search} onChangeText={setSearch} placeholder="Tìm tên nguyên liệu hoặc danh mục…"/>
   <IngredientCatalogResults query={search} showAll/>
   <Pressable style={s.button} onPress={()=>router.push("/add-ingredient")}><Plus size={17} color="white"/><Text style={s.buttonText}>Thêm nguyên liệu thủ công</Text></Pressable>
  </ScrollView>
  <BottomNav/>
 </SafeAreaView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:"#FFF8F6"},heading:{flexDirection:"row",alignItems:"center",gap:12,padding:18},back:{padding:9,borderRadius:12,backgroundColor:"#FEF1EB"},title:{flex:1,fontSize:21,fontWeight:"700",color:"#201A17"},content:{paddingHorizontal:18,paddingBottom:20},button:{padding:15,backgroundColor:"#A23A00",borderRadius:12,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8},buttonText:{fontSize:14,fontWeight:"600",color:"white"}});
