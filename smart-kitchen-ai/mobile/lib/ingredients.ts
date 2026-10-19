import AsyncStorage from '@react-native-async-storage/async-storage';
export const INGREDIENTS_KEY = 'smart-kitchen-manual-ingredients-v1';
export type Ingredient = {id:string;name:string;category:string;quantity:number;unit:string;location:string;purchaseDate:string;expiryDate:string;note:string;createdAt:string;image?:string};
export const SEEDS: Ingredient[] = [
{id:'1',name:'Thịt bò Fuji phi lê',category:'Thịt',quantity:400,unit:'Gram',location:'Ngăn mát tủ lạnh',purchaseDate:'2026-10-22',expiryDate:'2026-10-26',note:'Đóng gói hút chân không · Thịt tươi',createdAt:'2026-10-22T00:00:00.000Z',image:'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=900'},
{id:'2',name:'Súp lơ baby hữu cơ',category:'Rau củ',quantity:300,unit:'Gram',location:'Ngăn mát tủ lạnh',purchaseDate:'2026-10-22',expiryDate:'2026-10-26',note:'Rau củ tươi Đà Lạt',createdAt:'2026-10-22T00:00:00.000Z',image:'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=900'},
{id:'3',name:'Sữa chua men sống Probi',category:'Sữa',quantity:260,unit:'Ml',location:'Ngăn mát tủ lạnh',purchaseDate:'2026-10-22',expiryDate:'2026-11-07',note:'Sữa chua lên men',createdAt:'2026-10-22T00:00:00.000Z',image:'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=900'},
];
function isIngredient(x:unknown):x is Ingredient {return !!x && typeof x==='object' && typeof (x as Ingredient).id==='string' && typeof (x as Ingredient).name==='string';}
export async function getIngredients():Promise<Ingredient[]>{
 const raw=await AsyncStorage.getItem(INGREDIENTS_KEY);
 if(raw===null){await AsyncStorage.setItem(INGREDIENTS_KEY,JSON.stringify(SEEDS));return [...SEEDS];}
 const parsed:unknown=JSON.parse(raw);
 if(!Array.isArray(parsed))throw new Error('Dữ liệu kho không hợp lệ');
 return parsed.filter(isIngredient);
}
export async function findIngredient(id:string){return (await getIngredients()).find(x=>x.id===id)??null;}
export async function updateIngredient(item:Ingredient){const all=await getIngredients();const i=all.findIndex(x=>x.id===item.id);if(i<0)throw new Error('Nguyên liệu không còn tồn tại');all[i]=item;await AsyncStorage.setItem(INGREDIENTS_KEY,JSON.stringify(all));}
export async function deleteIngredient(id:string){const all=await getIngredients();await AsyncStorage.setItem(INGREDIENTS_KEY,JSON.stringify(all.filter(x=>x.id!==id)));}
export function daysUntil(iso:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))return null;const today=new Date();const now=Date.UTC(today.getFullYear(),today.getMonth(),today.getDate());const [y,m,d]=iso.split('-').map(Number);return Math.ceil((Date.UTC(y,m-1,d)-now)/86400000);}
export function dateIsValid(s:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const [y,m,d]=s.split('-').map(Number);const dt=new Date(Date.UTC(y,m-1,d));return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d;}
