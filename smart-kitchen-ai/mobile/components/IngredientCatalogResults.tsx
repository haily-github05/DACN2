// Thành phần: Tìm từ bảng ingredients, phân biệt với nguyên liệu trong kho cá nhân.
import React,{useCallback,useMemo,useState} from "react";
import {ActivityIndicator,Pressable,StyleProp,StyleSheet,Text,View,ViewStyle} from "react-native";
import {useFocusEffect,useRouter} from "expo-router";
import {Check,Leaf,Plus,Package} from "lucide-react-native";
import {CatalogIngredient,getIngredientCatalog} from "../lib/ingredients";
import {matchesSearch} from "../lib/search";
import FoodImage from "./FoodImage";
type Props={query:string;showAll?:boolean;style?:StyleProp<ViewStyle>};
function CatalogContent({query,showAll=false,onRetry,style}:Props & {onRetry:()=>void}) {
 const router=useRouter();
 const [items,setItems]=useState<CatalogIngredient[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const activeQuery=Boolean(query.trim());
 useFocusEffect(useCallback(()=>{
  let active=true;
  if(!activeQuery&&!showAll) return;
  setLoading(true);setError("");
  getIngredientCatalog().then(rows=>{if(active)setItems(rows);}).catch(err=>{if(active)setError(err.message);}).finally(()=>{if(active)setLoading(false);});
  return ()=>{active=false;};
 },[showAll,activeQuery]));
 const matched=useMemo(()=>items.filter(item=>matchesSearch(query,item.name,item.category)),[items,query]);
 if(!activeQuery&&!showAll) return null;
 return <View style={[s.section,style]}>
  <View style={s.sectionHeader}>
    <View style={s.titleRow}><Leaf size={19} color="#A23A00"/><Text style={s.heading}>Danh mục nguyên liệu</Text></View>
    {!loading&&!error&&<View style={s.countBadge}><Text style={s.countText}>{matched.length}</Text></View>}
  </View>
  <Text style={s.subtitle}>{showAll ? "Chọn nguyên liệu để thêm vào kho của bạn." : "Nguyên liệu phù hợp với từ khóa tìm kiếm."}</Text>
  {loading?<ActivityIndicator style={s.loading} color="#A23A00"/>:error?<Pressable onPress={onRetry} style={s.message}><Text style={s.hint}>{error} · Chạm để thử lại</Text></Pressable>:!matched.length?<View style={s.message}><Text style={s.hint}>Chưa có nguyên liệu khớp từ khóa. Hãy thử tên khác.</Text></View>:matched.map(item=><View key={item.id} style={s.card}>
   <View style={s.details}>
    <FoodImage uri={item.image} style={s.image} resizeMode="cover"/>
    <View style={s.flex}>
     <Text style={s.name}>{item.name}</Text>
     <Text style={s.meta}>{item.category} · Đơn vị: {item.unit}</Text>
     <View style={[s.stateBadge,!item.inPantry&&s.absentBadge]}>
      {item.inPantry&&<Check size={11} color="#A23A00"/>}
      <Text style={s.stateText}>{item.inPantry?"Đã có trong kho":"Chưa có trong kho"}</Text>
     </View>
    </View>
   </View>
   <View style={s.actions}>
    <Pressable accessibilityLabel={"Thêm "+item.name+" vào kho"} style={s.primaryButton} onPress={()=>router.push({pathname:"/add-ingredient",params:{ingredientId:item.id,name:item.name,category:item.category,unit:item.unit}})}><Plus size={16} color="white"/><Text style={s.primaryText}>Thêm vào kho</Text></Pressable>
    {item.inPantry&&<Pressable style={s.secondaryButton} onPress={()=>router.push({pathname:"/pantry",params:{search:item.name}})}><Package size={15} color="#A23A00"/><Text style={s.link}>Xem kho</Text></Pressable>}
   </View>
  </View>)}
 </View>;
}
export default function IngredientCatalogResults(props:Props) {
 const [revision,setRevision]=useState(0);
 return <CatalogContent key={revision} {...props} onRetry={()=>setRevision(n=>n+1)}/>;
}
const s=StyleSheet.create({
 section:{gap:10,marginVertical:8},
 sectionHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:10},
 titleRow:{flex:1,flexDirection:"row",alignItems:"center",gap:8},
 heading:{flexShrink:1,fontSize:17,fontWeight:"700",color:"#201A17"},
 countBadge:{minWidth:28,paddingVertical:4,paddingHorizontal:8,borderRadius:10,backgroundColor:"#FEF1EB",alignItems:"center"},
 countText:{fontSize:12,fontWeight:"700",color:"#A23A00"},
 subtitle:{fontSize:12,lineHeight:18,color:"#735A51",marginBottom:2},
 card:{padding:14,backgroundColor:"white",borderWidth:1,borderColor:"#EED9CF",borderRadius:16,gap:13},
 details:{flexDirection:"row",alignItems:"center",gap:12},
 image:{width:72,height:72,borderRadius:12},
 flex:{flex:1,minWidth:0},
 name:{fontSize:16,lineHeight:22,fontWeight:"700",color:"#201A17"},
 meta:{fontSize:11,lineHeight:17,color:"#735A51",marginTop:4},
 stateBadge:{alignSelf:"flex-start",flexDirection:"row",alignItems:"center",gap:4,backgroundColor:"#FEF1EB",borderRadius:7,paddingHorizontal:7,paddingVertical:4,marginTop:7},
 absentBadge:{backgroundColor:"#FFF8F6"},
 stateText:{fontSize:10,fontWeight:"500",color:"#A23A00"},
 actions:{flexDirection:"row",alignItems:"stretch",gap:9,borderTopWidth:1,borderColor:"#F5E8E1",paddingTop:12},
 primaryButton:{flex:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:5,paddingHorizontal:10,minHeight:40,borderRadius:10,backgroundColor:"#A23A00"},
 primaryText:{fontSize:12,fontWeight:"600",color:"white",flexShrink:1,textAlign:"center"},
 secondaryButton:{flex:1,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:5,paddingHorizontal:10,minHeight:40,borderRadius:10,borderWidth:1,borderColor:"#EED9CF",backgroundColor:"white"},
 link:{fontSize:12,fontWeight:"600",color:"#A23A00",flexShrink:1},
 hint:{fontSize:12,lineHeight:18,color:"#735A51"},
 message:{padding:14,backgroundColor:"white",borderRadius:12,borderWidth:1,borderColor:"#EED9CF"},
 loading:{paddingVertical:16},
});
