import DateField from "../components/DateField";
import {isoDay,parseCalendarDate} from "../lib/calendar";
import RequireLogin from "../components/RequireLogin";
// Trang: Kết quả nhận diện — chỉnh sửa, xác nhận và lưu nguyên liệu vào kho.
import {normalizeDetections} from "../lib/scanApi";
import { kitchenRequest } from "../lib/kitchenApi";
import React, { useRef, useState } from "react";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import {
  View,
  Text,
  Image,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  ArrowLeft,
  Sparkles,
  Pencil,
  Plus,
  Check,
  Trash2,
} from "lucide-react-native";

const C = {
  orange: "#A23A00",
  cream: "#FFF8F6",
  peach: "#FEF1EB",
  white: "#FFFFFF",
  dark: "#201A17",
  muted: "#735A51",
  border: "#EED9CF",
  green: "#39845A",
};

type Ingredient = {
  id: string;
  emoji: string;
  name: string;
  quantity: string;
  unit: string;
  confidence: number | null;
  category:string;
  location:string;
  purchaseDate:string;
  expiryDate:string;
  note:string;
};

const categories=['Rau củ','Thịt cá','Sữa & trứng','Ngũ cốc','Khác'];
const locations=['Ngăn mát','Ngăn đông','Bên ngoài'];
function storageDefaults(){const now=new Date();return {category:'Khác',location:'Ngăn mát',purchaseDate:isoDay(now.getFullYear(),now.getMonth(),now.getDate()),expiryDate:'',note:''};}
// Chuyển JSON model thành danh sách có thể chỉnh sửa; confidence model là 0..1.
function parseDetections(raw:string|string[]|undefined):Ingredient[]{
 try{const parsed=JSON.parse((Array.isArray(raw)?raw[0]:raw)||'[]');return normalizeDetections(parsed).map((item,index)=>({...storageDefaults(),id:`${index}-${item.name}`,emoji:'🥗',name:item.name,quantity:String(item.count),unit:'cái',confidence:item.confidence===null?null:Math.round(item.confidence*100)}));}catch{return [];}
}

function ScanResultScreen() {
  const router = useRouter();
  const params=useLocalSearchParams<{detections?:string|string[];photo?:string|string[]}>();
  const photoUri=Array.isArray(params.photo)?params.photo[0]:params.photo;

  const [ingredients, setIngredients] =
    useState<Ingredient[]>(()=>parseDetections(params.detections));

  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(true);
  const saveLock=useRef(false);
  const savedOnce=useRef(false);
  const requestId=useRef("");
  const [saved,setSaved]=useState(false);

  const updateIngredient = (
    id: string,
    field: "name" | "quantity" | "unit" | "category" | "location" | "purchaseDate" | "expiryDate" | "note",
    value: string,
  ) => {
    setIngredients((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const addIngredient = () => {
    setIngredients((current) => [
      ...current,
      {
        ...storageDefaults(),
        id: Date.now().toString(),
        emoji: "🥗",
        name: "",
        quantity: "1",
        unit: "g",
        confidence: null,
      },
    ]);
    setEditing(true);
  };

  const removeIngredient = (id: string) => {
    setIngredients((current) => current.filter((item) => item.id !== id));
  };

  const confirmSave = async () => {
    if (saveLock.current||savedOnce.current) return;
    if (ingredients.length === 0) {
      Alert.alert(
        "Chưa có nguyên liệu",
        "Vui lòng thêm ít nhất một nguyên liệu.",
      );
      return;
    }

    const invalid = ingredients.some(
      (item) =>
        !item.name.trim() ||
        !item.unit.trim() ||
        !item.quantity.trim() ||
        !Number.isFinite(Number(item.quantity.replace(',','.'))) ||
        Number(item.quantity.replace(',','.')) <= 0,
    );

    if (invalid) {
      Alert.alert(
        "Thông tin chưa hợp lệ",
        "Vui lòng nhập tên, số lượng lớn hơn 0 và đơn vị cho tất cả nguyên liệu.",
      );
      return;
    }

    const invalidStorage=ingredients.find(item=>{
      const purchased=parseCalendarDate(item.purchaseDate),expiry=parseCalendarDate(item.expiryDate);
      return !purchased||!expiry||expiry.iso<purchased.iso||!locations.includes(item.location)||!item.category.trim();
    });
    if(invalidStorage){Alert.alert('Thông tin bảo quản chưa đủ',`Hãy chọn ngày mua, hạn sử dụng hợp lệ và nơi bảo quản cho ${invalidStorage.name}. Hạn sử dụng không được trước ngày mua.`);return;}
    if(!requestId.current)requestId.current=`scan-${Date.now()}-${Math.random().toString(36).slice(2,14)}`;
    saveLock.current=true;
    setSaving(true);
    try {
      const items=ingredients.map(({name,quantity,unit,category,location,purchaseDate,expiryDate,note})=>({name:name.trim(),quantity:Number(quantity.replace(',','.')),unit:unit.trim(),category,location,purchaseDate:parseCalendarDate(purchaseDate)!.iso,expiryDate:parseCalendarDate(expiryDate)!.iso,note}));
      const result=await kitchenRequest<{count:number;items:{id:string;purchaseDate:string;expiryDate:string;location:string}[]}>("pantry/batch", "POST", {requestId:requestId.current,items});
      if(!result.items||result.count!==items.length||result.items.some((row,index)=>row.purchaseDate!==items[index].purchaseDate||row.expiryDate!==items[index].expiryDate||row.location!==items[index].location))throw new Error('Chưa xác nhận được ngày đã lưu. Hãy kiểm tra kho và khởi động lại backend nếu đang chạy bản cũ.');
      savedOnce.current=true;setSaved(true);
      Alert.alert("Đã lưu vào kho", "Đã lưu nguyên liệu cùng ngày mua, hạn sử dụng và nơi bảo quản.", [{ text: "Về kho", onPress: () => router.replace("/pantry") }]);
      setIngredients([]);
    } catch (error) { Alert.alert("Không thể lưu", error instanceof Error ? error.message : "Vui lòng thử lại"); }
    finally { saveLock.current=false;setSaving(false); }
  };



  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <AppHeader showNotification />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* TIÊU ĐỀ */}
        <View style={styles.heading}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color={C.orange} />
          </Pressable>

          <Text style={styles.title}>Kết quả nhận diện</Text>
        </View>

        <Text style={styles.subtitle}>
          Kiểm tra và chỉnh sửa trước khi thêm vào kho
        </Text>

        {/* THÔNG BÁO AI */}
        <View style={styles.aiCard}>
          <View style={styles.aiHeading}>
            <Sparkles size={19} color={C.orange} />

            <Text style={styles.aiTitle}>
              AI đã tìm thấy {ingredients.length} nguyên liệu
            </Text>
          </View>

          <Text style={styles.aiDescription}>
            Bạn có thể sửa tên, đơn vị hoặc số lượng để đảm bảo dữ liệu trong
            kho chính xác.
          </Text>
        </View>

        {photoUri&&<Image source={{uri:photoUri}} style={{width:'100%',height:180,borderRadius:12,marginTop:14}} resizeMode="contain" accessibilityLabel="Ảnh thực phẩm đã quét"/>}
        {!ingredients.length&&<Text style={styles.subtitle}>Chưa có nguyên liệu nhận diện được. Bạn có thể thêm thủ công hoặc quét lại ảnh.</Text>}
        {/* DANH SÁCH NGUYÊN LIỆU */}
        <View style={styles.ingredientList}>
          {ingredients.map((item) => (
            <View key={item.id} pointerEvents={saving||saved?"none":"auto"}><View style={styles.ingredientCard}>
              <View style={styles.emojiBox}>
                <Text style={styles.emoji}>{item.emoji}</Text>
              </View>

              <View style={styles.ingredientInfo}>
                {editing ? (
                  <>
                    <TextInput
                      style={styles.nameInput}
                      value={item.name}
                      placeholder="Tên nguyên liệu"
                      placeholderTextColor="#A18B81"
                      onChangeText={(value) =>
                        updateIngredient(item.id, "name", value)
                      }
                    />

                    <View style={styles.editRow}>
                      <TextInput
                        style={styles.quantityInput}
                        value={item.quantity}
                        keyboardType="decimal-pad"
                        onChangeText={(value) =>
                          updateIngredient(item.id, "quantity", value)
                        }
                      />

                      <TextInput
                        style={styles.unitInput}
                        value={item.unit}
                        placeholder="Đơn vị"
                        onChangeText={(value) =>
                          updateIngredient(item.id, "unit", value)
                        }
                      />
                    </View>

                    {item.confidence !== null && (
                      <Text style={styles.confidence}>
                        Tin cậy {item.confidence}%
                      </Text>
                    )}
                  </>
                ) : (
                  <>
                    <Text style={styles.ingredientName}>{item.name}</Text>

                    <Text style={styles.ingredientDetails}>
                      {item.quantity} {item.unit}
                      {item.confidence !== null
                        ? `   ·   Tin cậy ${item.confidence}%`
                        : "   ·   Thêm thủ công"}
                    </Text>
                  </>
                )}
              </View>

              {editing && (
                <Pressable
                  onPress={() => removeIngredient(item.id)}
                  style={styles.deleteButton}
                >
                  <Trash2 size={18} color="#C34B38" />
                </Pressable>
              )}
            </View>
            <View style={styles.storageForm}>
              <Text style={styles.fieldLabel}>Danh mục</Text>
              <View style={styles.optionRow}>{categories.map(value=><Pressable key={value} accessibilityRole="radio" accessibilityState={{checked:item.category===value}} style={[styles.option,item.category===value&&styles.optionSelected]} onPress={()=>updateIngredient(item.id,'category',value)}><Text style={styles.optionText}>{value}</Text></Pressable>)}</View>
              <Text style={styles.fieldLabel}>Nơi bảo quản</Text>
              <View style={styles.optionRow}>{locations.map(value=><Pressable key={value} accessibilityRole="radio" accessibilityState={{checked:item.location===value}} style={[styles.option,item.location===value&&styles.optionSelected]} onPress={()=>updateIngredient(item.id,'location',value)}><Text style={styles.optionText}>{value}</Text></Pressable>)}</View>
              <DateField label="Ngày mua" title={`Ngày mua · ${item.name}`} value={item.purchaseDate} disabled={saving} onChangeText={value=>updateIngredient(item.id,'purchaseDate',value)}/>
              <DateField label="Hạn sử dụng" title={`Hạn sử dụng · ${item.name}`} value={item.expiryDate} minDate={parseCalendarDate(item.purchaseDate)?.iso} disabled={saving} onChangeText={value=>updateIngredient(item.id,'expiryDate',value)}/>
              <Text style={styles.fieldLabel}>Ghi chú (không bắt buộc)</Text>
              <TextInput accessibilityLabel={`Ghi chú cho ${item.name}`} style={styles.noteInput} multiline maxLength={2000} value={item.note} placeholder="Ví dụ: đã mở bao bì…" onChangeText={value=>updateIngredient(item.id,'note',value)}/>
              <Text style={styles.storageHint}>Chọn hạn dùng theo nhãn hoặc tình trạng thực phẩm. Ngày hết hạn không được suy ra từ ảnh.</Text>
            </View></View>
          ))}
        </View>

        {/* CHỈNH SỬA / THÊM */}
        <View style={styles.actionRow}>
          <Pressable
            style={styles.editButton}
            onPress={() => setEditing((value) => !value)}
          >
            {editing ? (
              <Check size={17} color={C.orange} />
            ) : (
              <Pencil size={17} color={C.orange} />
            )}

            <Text style={styles.actionText}>
              {editing ? "Hoàn tất sửa" : "Sửa số lượng"}
            </Text>
          </Pressable>

          <Pressable style={styles.addButton} onPress={addIngredient}>
            <Plus size={18} color={C.orange} />
            <Text style={styles.actionText}>Thêm dòng</Text>
          </Pressable>
        </View>

        {/* XÁC NHẬN */}
        <Pressable style={[styles.confirmButton,saving&&{opacity:.6}]} disabled={saving||saved} onPress={confirmSave}>
          <Check size={21} color={C.white} />
          <Text style={styles.confirmText}>{saved?"Đã lưu vào kho":saving?"Đang lưu…":"Xác nhận và lưu vào kho"}</Text>
        </Pressable>
      </ScrollView>

      {/* BOTTOM NAV */}
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  storageForm:{padding:15,borderWidth:1,borderColor:C.border,borderRadius:13,backgroundColor:C.white,gap:12,marginTop:6},
  fieldLabel:{fontSize:12,fontWeight:'700',color:C.dark},
  optionRow:{flexDirection:'row',flexWrap:'wrap',gap:8},
  option:{minHeight:40,paddingHorizontal:11,paddingVertical:10,borderWidth:1,borderColor:C.border,borderRadius:9},
  optionSelected:{backgroundColor:C.peach,borderColor:C.orange},
  optionText:{fontSize:11,color:C.orange},
  noteInput:{minHeight:65,borderWidth:1,borderColor:C.border,borderRadius:10,padding:12,color:C.dark,textAlignVertical:'top'},
  storageHint:{fontSize:10,lineHeight:17,color:C.muted},
  safe: {
    flex: 1,
    backgroundColor: C.cream,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 25,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  backButton: {
    width: 25,
    height: 36,
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: C.dark,
  },
  subtitle: {
    fontSize: 12,
    color: C.muted,
    marginTop: 13,
  },
  aiCard: {
    marginTop: 32,
    padding: 18,
    backgroundColor: C.peach,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.border,
  },
  aiHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: C.orange,
  },
  aiDescription: {
    marginTop: 14,
    fontSize: 12,
    color: C.muted,
    lineHeight: 20,
  },
  ingredientList: {
    marginTop: 24,
    gap: 12,
  },
  ingredientCard: {
    minHeight: 86,
    padding: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  emojiBox: {
    width: 54,
    height: 54,
    backgroundColor: C.peach,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 28,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 15,
    fontWeight: "800",
    color: C.dark,
  },
  ingredientDetails: {
    marginTop: 8,
    fontSize: 12,
    color: C.muted,
  },
  nameInput: {
    borderBottomWidth: 1,
    borderColor: C.border,
    paddingVertical: 4,
    fontSize: 14,
    color: C.dark,
    fontWeight: "700",
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 7,
  },
  quantityInput: {
    width: 72,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    color: C.dark,
    fontSize: 12,
  },
  unitInput: {
    width: 68,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    color: C.dark,
    fontSize: 12,
  },
  confidence: {
    color: C.green,
    fontSize: 11,
    marginTop: 6,
  },
  deleteButton: {
    padding: 5,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 22,
  },
  editButton: {
    flex: 1,
    height: 46,
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addButton: {
    flex: 1,
    height: 46,
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionText: {
    fontSize: 12,
    color: C.orange,
    fontWeight: "800",
  },
  confirmButton: {
    marginTop: 23,
    height: 54,
    borderRadius: 13,
    backgroundColor: C.orange,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  confirmText: {
    color: C.white,
    fontSize: 14,
    fontWeight: "800",
  },
});

// Người dùng khách cần đăng nhập trước khi truy cập chức năng cá nhân.
export default function ProtectedPage() { return <RequireLogin><ScanResultScreen/></RequireLogin>; }
