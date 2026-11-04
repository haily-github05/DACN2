// Thành phần: Ô nhập ngày kèm lịch chọn tháng/ngày dùng cho nguyên liệu.
import React,{useMemo,useState} from "react";
import {Keyboard,Modal,Pressable,ScrollView,StyleProp,StyleSheet,Text,TextInput,TextStyle,useWindowDimensions,View,ViewStyle} from "react-native";
import {CalendarDays,ChevronLeft,ChevronRight,X} from "lucide-react-native";
import {calendarCells,isoDay,isSelectableDate,parseCalendarDate} from "../lib/calendar";
type Props={value:string;onChangeText:(value:string)=>void;label?:string;title:string;minDate?:string;maxDate?:string;disabled?:boolean;style?:StyleProp<ViewStyle>;inputStyle?:StyleProp<TextStyle>};
export default function DateField({value,onChangeText,label,title,minDate,maxDate,disabled=false,style,inputStyle}:Props) {
 const [visible,setVisible]=useState(false);
 const [month,setMonth]=useState({year:2026,month:0});
 const [selection,setSelection]=useState("");
 const {height}=useWindowDimensions();
 const cells=useMemo(()=>calendarCells(month.year,month.month),[month]);
 const open=()=>{
  if(disabled) return;
  Keyboard.dismiss();
  const now=new Date();
  let initial=parseCalendarDate(value)?.iso||isoDay(now.getFullYear(),now.getMonth(),now.getDate());
  const min=parseCalendarDate(minDate)?.iso,max=parseCalendarDate(maxDate)?.iso;
  if(min&&initial<min) initial=min;
  if(max&&initial>max) initial=max;
  const date=parseCalendarDate(initial)!;
  setMonth({year:date.year,month:date.month});setSelection(initial);setVisible(true);
 };
 const move=(offset:number)=>{
  const date=new Date(Date.UTC(month.year,month.month+offset,1));
  if(date.getUTCFullYear()<100||date.getUTCFullYear()>9999) return;
  setMonth({year:date.getUTCFullYear(),month:date.getUTCMonth()});
 };
 const today=()=>{
  const now=new Date(),date=isoDay(now.getFullYear(),now.getMonth(),now.getDate());
  if(!isSelectableDate(date,minDate,maxDate)) return;
  setSelection(date);setMonth({year:now.getFullYear(),month:now.getMonth()});
 };
 return <View>
  {!!label&&<Text style={s.label}>{label}</Text>}
  <View style={[s.field,style]}>
   <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel={"Mở lịch chọn "+title.toLowerCase()} onPress={open} style={s.calendarButton}><CalendarDays size={20} color="#A23A00"/></Pressable>
   <TextInput editable={!disabled} style={[s.input,inputStyle]} value={value} onChangeText={onChangeText} placeholder="YYYY-MM-DD" placeholderTextColor="#A18B81" keyboardType="numbers-and-punctuation" maxLength={10} accessibilityLabel={title}/>
  </View>
  <Modal visible={visible} transparent animationType="fade" onRequestClose={()=>setVisible(false)}>
   <View style={s.overlay}>
    <Pressable style={StyleSheet.absoluteFill} onPress={()=>setVisible(false)} accessibilityLabel="Đóng lịch"/>
    <View style={[s.dialog,{maxHeight:Math.max(220,height-70)}]} accessibilityViewIsModal>
     <ScrollView contentContainerStyle={s.dialogContent} keyboardShouldPersistTaps="handled">
      <View style={s.top}><View style={s.flex}><Text style={s.title}>{title}</Text><Text style={s.sub}>Chọn ngày trên lịch rồi nhấn xác nhận</Text></View><Pressable style={s.icon} onPress={()=>setVisible(false)} accessibilityLabel="Đóng lịch"><X size={21} color="#735A51"/></Pressable></View>
      <View style={s.monthBar}><Pressable style={s.icon} onPress={()=>move(-1)} accessibilityLabel="Tháng trước"><ChevronLeft color="#A23A00" size={22}/></Pressable><Text style={s.month}>Tháng {month.month+1}, {month.year}</Text><Pressable style={s.icon} onPress={()=>move(1)} accessibilityLabel="Tháng sau"><ChevronRight color="#A23A00" size={22}/></Pressable></View>
      <View style={s.grid}>{["T2","T3","T4","T5","T6","T7","CN"].map(day=><View key={day} style={s.cell}><Text style={s.weekday}>{day}</Text></View>)}</View>
      <View style={s.grid}>{cells.map((date,index)=>{
       if(!date) return <View key={"blank"+index} style={s.cell}/>;
       const available=isSelectableDate(date,minDate,maxDate),selected=date===selection;
       return <Pressable key={date} disabled={!available} onPress={()=>setSelection(date)} accessibilityRole="button" accessibilityLabel={date} accessibilityState={{selected,disabled:!available}} style={s.cell}><View style={[s.dayCircle,selected&&s.selected]}><Text style={[s.day,selected&&s.selectedText,!available&&s.unavailable]}>{Number(date.slice(-2))}</Text></View></Pressable>;
      })}</View>
      {!!parseCalendarDate(minDate)&&<Text style={s.sub}>Từ ngày: {parseCalendarDate(minDate)?.iso}</Text>}
      <View style={s.footer}><Pressable style={s.today} onPress={today}><Text style={s.link}>Hôm nay</Text></Pressable><Pressable style={s.confirm} disabled={!selection||!isSelectableDate(selection,minDate,maxDate)} onPress={()=>{onChangeText(selection);setVisible(false);}}><Text style={s.confirmText}>Chọn ngày</Text></Pressable></View>
     </ScrollView>
    </View>
   </View>
  </Modal>
 </View>;
}
const s=StyleSheet.create({
 label:{fontSize:13,fontWeight:"700",color:"#201A17",marginBottom:8},field:{minHeight:48,flexDirection:"row",alignItems:"center",gap:7,paddingHorizontal:10,borderWidth:1,borderColor:"#EED9CF",borderRadius:12,backgroundColor:"white"},calendarButton:{minHeight:44,minWidth:34,alignItems:"center",justifyContent:"center"},input:{flex:1,minWidth:0,paddingVertical:12,fontSize:14,color:"#201A17"},overlay:{flex:1,alignItems:"center",justifyContent:"center",padding:20,backgroundColor:"rgba(32,26,23,0.4)"},dialog:{width:"100%",maxWidth:400,borderRadius:22,backgroundColor:"#FFF8F6",overflow:"hidden"},dialogContent:{padding:18,gap:13},top:{flexDirection:"row",alignItems:"center",gap:8},flex:{flex:1},title:{fontSize:19,fontWeight:"700",color:"#201A17"},sub:{fontSize:11,lineHeight:18,color:"#735A51",marginTop:4},icon:{padding:9},monthBar:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",backgroundColor:"white",borderRadius:12},month:{fontSize:15,fontWeight:"700",color:"#A23A00"},grid:{flexDirection:"row",flexWrap:"wrap"},cell:{width:"14.285714%",alignItems:"center",justifyContent:"center",minHeight:40},weekday:{fontSize:11,fontWeight:"700",color:"#735A51"},dayCircle:{width:36,height:36,borderRadius:18,alignItems:"center",justifyContent:"center"},day:{fontSize:14,color:"#201A17"},selected:{backgroundColor:"#A23A00"},selectedText:{color:"white",fontWeight:"700"},unavailable:{color:"#D2C2BA"},footer:{flexDirection:"row",alignItems:"center",gap:12,paddingTop:7},today:{padding:10},link:{fontSize:13,fontWeight:"600",color:"#A23A00"},confirm:{flex:1,padding:13,borderRadius:12,backgroundColor:"#A23A00",alignItems:"center"},confirmText:{fontSize:14,fontWeight:"700",color:"white"},
});
