import RequireLogin from "../components/RequireLogin";
// Trang: Trung tâm thông báo — kho gần hết hạn, lịch nấu, tương tác và mua sắm.
import React, {useMemo,useState} from "react";
import {ActivityIndicator,Alert,FlatList,Pressable,ScrollView,StyleSheet,Text,View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {Href,useRouter} from "expo-router";
import {ArrowLeft,Bell,CheckCheck,ChevronRight,ChefHat,Clock3,Heart,Package,ShoppingCart,SlidersHorizontal,TriangleAlert} from "lucide-react-native";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import FoodImage from "../components/FoodImage";
import {useNotifications} from "../hooks/useNotifications";
import {AppNotification,NotificationCategory,markNotificationsRead,refreshNotifications} from "../lib/notificationsStore";

const C={orange:"#A23A00",cream:"#FFF8F6",peach:"#FEF1EB",border:"#EED9CF",dark:"#201A17",muted:"#735A51",red:"#C24D32"};
const filters:{key:"all"|NotificationCategory;label:string}[]=[
 {key:"all",label:"Tất cả"},{key:"pantry",label:"Hết hạn"},{key:"meal",label:"Lịch nấu"},{key:"social",label:"Cộng đồng"},{key:"shopping",label:"Mua sắm"},
];
const labels={pantry:"CẢNH BÁO KHO THỰC PHẨM",meal:"KẾ HOẠCH BỮA ĂN",social:"CỘNG ĐỒNG BẾP NHÀ",shopping:"DANH SÁCH MUA SẮM"};
const icons={pantry:Package,meal:ChefHat,social:Heart,shopping:ShoppingCart};
type Row={type:"section";id:string;title:string;unread:number}|{type:"notification";id:string;item:AppNotification};
function dayGroup(item:AppNotification) {
 const date=new Date(item.occurredAt||item.detectedAt),now=new Date();
 const distance=Math.round((Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())-Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()))/86400000);
 return distance<0 ? "Sắp tới" : distance===0 ? "Hôm nay" : distance===1 ? "Hôm qua" : "Trước đó";
}
function timeLabel(item:AppNotification) {
 const date=new Date(item.occurredAt||item.detectedAt);
 return Number.isNaN(date.getTime()) ? "" : item.category==="social"||item.category==="shopping"
  ? "Mới cập nhật" : date.toLocaleDateString("vi-VN");
}
function NotificationsScreen() {
 const router=useRouter();
 const state=useNotifications();
 const [filter,setFilter]=useState<"all"|NotificationCategory>("all");
 const [onlyUnread,setOnlyUnread]=useState(false);
 const [saving,setSaving]=useState(false);
 const urgent=state.items.filter(item=>item.urgent&&!item.expired);
 const rows=useMemo(()=>{
  const items=state.items.filter(item=>(filter==="all"||item.category===filter)&&(!onlyUnread||!item.read))
   .sort((a,b)=>new Date(b.occurredAt||b.detectedAt).getTime()-new Date(a.occurredAt||a.detectedAt).getTime());
  const result:Row[]=[];
  for(const title of ["Sắp tới","Hôm nay","Hôm qua","Trước đó"]) {
   const group=items.filter(item=>dayGroup(item)===title);
   if(group.length) {result.push({type:"section",id:title,title,unread:group.filter(item=>!item.read).length});result.push(...group.map(item=>({type:"notification" as const,id:item.id,item})));}
  }
  return result;
 },[state.items,filter,onlyUnread]);
 const readAll=async()=>{
  if(saving||!state.unread) return;
  setSaving(true);
  try{await markNotificationsRead(state.items.map(item=>item.id));}
  catch{Alert.alert("Chưa lưu được trạng thái","Vui lòng thử lại khi thiết bị có thể lưu dữ liệu.");}
  finally{setSaving(false);}
 };
 const open=(item:AppNotification,secondary=false)=>{
  void markNotificationsRead([item.id]).catch(()=>Alert.alert("Không thể lưu trạng thái đã đọc","Vui lòng thử lại."));
  const pathname=secondary ? item.secondaryRoute : item.route;
  if(pathname) router.push({pathname,params:secondary ? item.secondaryParams : item.params} as Href);
 };
 const options=()=>Alert.alert("Hiển thị thông báo","Chọn nội dung bạn muốn xem.",[
  {text:"Tất cả",onPress:()=>{setOnlyUnread(false);setFilter("all");}},
  {text:"Chỉ chưa đọc",onPress:()=>setOnlyUnread(true)},
  {text:"Đóng",style:"cancel"},
 ]);
 return <SafeAreaView style={s.page} edges={["left","right"]}>
  <AppHeader onNotificationPress={()=>void refreshNotifications()}/>
  <View style={s.heading}>
   <Pressable style={s.iconButton} accessibilityLabel="Quay lại" onPress={()=>router.canGoBack()?router.back():router.replace("/home")}><ArrowLeft size={22} color={C.dark}/></Pressable>
   <Text style={s.title}>Thông báo</Text>
   {state.unread>0&&<View style={s.newBadge}><Text style={s.newText}>{state.unread} mới</Text></View>}
   <View style={s.spacer}/>
   <Pressable disabled={saving||!state.unread} style={s.iconButton} accessibilityLabel="Đánh dấu tất cả đã đọc" onPress={()=>void readAll()}><CheckCheck size={22} color={state.unread ? C.orange : "#B5A69E"}/></Pressable>
   <Pressable style={s.iconButton} accessibilityLabel="Lọc thông báo" onPress={options}><SlidersHorizontal size={20} color={C.muted}/></Pressable>
  </View>
  <View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
   {filters.map(entry=><Pressable key={entry.key} onPress={()=>setFilter(entry.key)} style={[s.chip,filter===entry.key&&s.activeChip]}><Text style={[s.chipText,filter===entry.key&&s.activeText]}>{entry.label}{entry.key==="all" ? " ("+state.items.length+")" : ""}</Text></Pressable>)}
   <Pressable onPress={()=>setOnlyUnread(value=>!value)} style={[s.chip,onlyUnread&&s.activeChip]}><Text style={[s.chipText,onlyUnread&&s.activeText]}>Chưa đọc</Text></Pressable>
  </ScrollView></View>
  {state.error ? <View style={s.error}><Text style={s.body}>{state.error}</Text><Pressable style={s.primary} onPress={()=>void refreshNotifications()}><Text style={s.primaryText}>Thử lại</Text></Pressable></View> :
  <FlatList<Row>
   data={rows} keyExtractor={row=>row.id} contentContainerStyle={s.content}
   refreshing={state.loading} onRefresh={()=>void refreshNotifications()}
   ListHeaderComponent={<>
    {urgent.length>0&&(filter==="all"||filter==="pantry")&&<View style={s.urgent}>
     <View style={s.row}><View style={s.urgentIcon}><TriangleAlert size={22} color={C.orange}/></View><View style={s.flex}><Text style={s.urgentTag}>CẦN CHÚ Ý · HẠN DÙNG TRONG 1 NGÀY</Text><Text style={s.cardTitle}>Có {urgent.length} thực phẩm gần hết hạn</Text><Text style={s.body}>{urgent.slice(0,3).map(item=>item.title.replace(" sắp hết hạn","")).join(", ")}{urgent.length>3?"…":""}</Text></View></View>
     <View style={s.row}><Pressable style={[s.primary,s.flex]} onPress={()=>open(urgent[0],true)}><ChefHat size={16} color="white"/><Text style={s.primaryText}>Tìm món phù hợp</Text></Pressable><Pressable style={[s.secondary,s.flex]} onPress={()=>router.push("/expiring-food")}><Text style={s.link}>Kiểm tra kho</Text></Pressable></View>
    </View>}
    {!state.loading&&state.items.length>0&&<Text style={s.helper}>Chạm vào thông báo để xem chi tiết và đánh dấu đã đọc.</Text>}
   </>}
   ListEmptyComponent={state.loading ? <ActivityIndicator style={{margin:35}} color={C.orange}/> : <View style={s.empty}><Bell size={38} color={C.orange}/><Text style={s.cardTitle}>{onlyUnread ? "Bạn đã đọc hết thông báo" : "Chưa có thông báo"}</Text><Text style={[s.body,{textAlign:"center"}]}>Thông báo sẽ xuất hiện khi kho, thực đơn hoặc bài viết của bạn có cập nhật phù hợp.</Text></View>}
   renderItem={({item:row})=>{
    if(row.type==="section") return <View style={s.section}><Text style={s.sectionTitle}>{row.title}</Text><Text style={s.small}>{row.unread ? row.unread+" chưa đọc" : "Đã đọc"}</Text></View>;
    const item=row.item,Icon=icons[item.category];
    return <View style={[s.card,!item.read&&s.unreadCard,item.expired&&s.expiredCard]}>
     <View style={s.rowTop}><View style={[s.categoryIcon,item.category==="social"&&s.socialIcon]}><Icon size={22} color={item.category==="social" ? "#BE493A" : C.orange}/>{!item.read&&<View style={s.dot}/>}</View>
      <View style={s.flex}>
       <View style={s.between}><Text style={s.category}>{labels[item.category]}</Text><Text style={s.small}>{timeLabel(item)}</Text></View>
       <Pressable onPress={()=>open(item)}><Text style={s.cardTitle}>{item.title}</Text><Text style={s.body}>{item.body}</Text></Pressable>
       {item.category==="meal"&&<View style={s.info}><Clock3 size={13} color={C.orange}/><Text style={s.infoText}>Lịch ăn đã lưu của bạn</Text></View>}
       <View style={s.actions}><Pressable style={s.action} onPress={()=>open(item)}><Text style={s.link}>{item.action}</Text><ChevronRight size={14} color={C.orange}/></Pressable>
        {!!item.secondaryRoute&&!item.expired&&<Pressable style={s.action} onPress={()=>open(item,true)}><Text style={s.link}>Gợi ý món</Text></Pressable>}
        {!item.read&&<Pressable accessibilityLabel="Đánh dấu đã đọc" style={s.iconButton} onPress={()=>void markNotificationsRead([item.id]).catch(()=>Alert.alert("Không thể lưu","Vui lòng thử lại."))}><CheckCheck size={17} color={C.orange}/></Pressable>}
       </View>
      </View>
      {!!item.image&&<FoodImage uri={item.image} style={s.thumb} resizeMode="cover"/>}
     </View>
    </View>;
   }}
  />}
  <BottomNav/>
 </SafeAreaView>;
}
const s=StyleSheet.create({
 page:{flex:1,backgroundColor:C.cream},heading:{flexDirection:"row",alignItems:"center",gap:7,paddingHorizontal:12,paddingVertical:12},iconButton:{padding:8},title:{fontSize:22,fontWeight:"700",color:C.dark},spacer:{flex:1},newBadge:{backgroundColor:C.orange,paddingHorizontal:8,paddingVertical:3,borderRadius:12},newText:{fontSize:11,fontWeight:"700",color:"white"},filters:{paddingHorizontal:18,paddingBottom:16,gap:8},chip:{paddingHorizontal:14,paddingVertical:9,borderRadius:22,borderWidth:1,borderColor:C.border,backgroundColor:"white"},activeChip:{backgroundColor:C.orange,borderColor:C.orange},chipText:{fontSize:12,fontWeight:"600",color:C.muted},activeText:{color:"white"},content:{paddingHorizontal:18,paddingBottom:24,gap:12},urgent:{padding:16,gap:16,borderRadius:16,borderWidth:1,borderColor:"#EDBBA6",backgroundColor:C.peach,marginBottom:2},row:{flexDirection:"row",alignItems:"center",gap:10},rowTop:{flexDirection:"row",alignItems:"flex-start",gap:10},flex:{flex:1},urgentIcon:{padding:12,borderRadius:13,backgroundColor:"#FFE1D2"},urgentTag:{fontSize:10,fontWeight:"700",color:C.orange,marginBottom:6},cardTitle:{fontSize:15,fontWeight:"700",lineHeight:22,color:C.dark},body:{fontSize:12,color:C.muted,lineHeight:19,marginTop:4},primary:{minHeight:44,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:7,paddingHorizontal:10,borderRadius:9,backgroundColor:C.orange},primaryText:{fontSize:12,fontWeight:"700",color:"white",flexShrink:1},secondary:{minHeight:44,alignItems:"center",justifyContent:"center",paddingHorizontal:8,borderRadius:9,borderWidth:1,borderColor:C.border,backgroundColor:"white"},link:{fontSize:12,fontWeight:"600",color:C.orange},helper:{fontSize:11,color:C.muted,lineHeight:18,marginBottom:4},section:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingVertical:5},sectionTitle:{fontSize:15,fontWeight:"700",color:C.dark},small:{fontSize:10,color:C.muted},card:{padding:14,borderRadius:14,borderWidth:1,borderColor:C.border,backgroundColor:"white"},unreadCard:{borderColor:"#DBB29F"},expiredCard:{borderColor:"#E5AAA0"},categoryIcon:{padding:9,borderRadius:11,backgroundColor:C.peach},socialIcon:{backgroundColor:"#FFF0EC"},dot:{position:"absolute",right:-2,top:-2,width:7,height:7,borderRadius:4,backgroundColor:C.orange},between:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:5},category:{fontSize:9,fontWeight:"700",color:C.orange,flexShrink:1},info:{flexDirection:"row",alignItems:"center",gap:5,backgroundColor:C.cream,padding:6,borderRadius:6,marginTop:9,alignSelf:"flex-start"},infoText:{fontSize:10,color:C.orange},actions:{flexDirection:"row",alignItems:"center",gap:12,flexWrap:"wrap",marginTop:9},action:{flexDirection:"row",alignItems:"center",gap:3,paddingVertical:6},thumb:{width:44,height:44,borderRadius:9},empty:{alignItems:"center",gap:14,padding:28},error:{flex:1,padding:24,gap:16,justifyContent:"center"},
});

// Người dùng khách cần đăng nhập trước khi truy cập chức năng cá nhân.
export default function ProtectedPage() { return <RequireLogin><NotificationsScreen/></RequireLogin>; }
