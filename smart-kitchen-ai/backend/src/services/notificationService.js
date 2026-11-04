// Backend: Thông báo trong ứng dụng từ kho, lịch ăn, mua sắm và tương tác thật.
const db=require("../config/db");
const {getRecommendations}=require("./recipeRecommendationService");
async function getNotifications(userId) {
 const [[pantry],[meals],[reactions],[purchases]]=await Promise.all([
  db.query(`SELECT p.pantry_item_id AS id,i.name,p.quantity,p.unit,
    DATE_FORMAT(p.expiry_date,'%Y-%m-%d') AS expiry_date,
    DATE_FORMAT(DATE_SUB(p.expiry_date,INTERVAL 3 DAY),'%Y-%m-%d') AS event_date,
    DATEDIFF(p.expiry_date,CURDATE()) AS days_left
    FROM pantry_items p JOIN ingredients i ON i.ingredient_id=p.ingredient_id
    WHERE p.user_id=? AND p.quantity>0 AND p.expiry_date<=DATE_ADD(CURDATE(),INTERVAL 3 DAY)
    ORDER BY p.expiry_date,p.pantry_item_id`,[userId]),
  db.query(`SELECT m.plan_item_id,m.meal_type,DATE_FORMAT(m.meal_date,'%Y-%m-%d') AS meal_date,
    r.recipe_id,r.name,m.servings FROM meal_plan_items m
    JOIN meal_plans p ON p.meal_plan_id=m.meal_plan_id JOIN recipes r ON r.recipe_id=m.recipe_id
    WHERE p.user_id=? AND m.meal_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(),INTERVAL 1 DAY)
    AND m.status='PLANNED' AND r.is_active=1 ORDER BY m.meal_date,m.plan_item_id`,[userId]),
  db.query(`SELECT p.post_id,p.title,p.image_url,COUNT(*) AS likes FROM community_posts p
    JOIN community_reactions r ON r.post_id=p.post_id
    WHERE p.user_id=? AND r.kind='like' AND r.user_id<>p.user_id
    GROUP BY p.post_id,p.title,p.image_url ORDER BY p.post_id DESC`,[userId]),
  db.query(`SELECT l.shopping_list_id,s.shopping_item_id,i.name FROM shopping_lists l
    JOIN shopping_list_items s ON s.shopping_list_id=l.shopping_list_id
    JOIN ingredients i ON i.ingredient_id=s.ingredient_id
    WHERE l.user_id=? AND l.status='ACTIVE' AND s.is_purchased=1
    ORDER BY l.shopping_list_id,s.shopping_item_id`,[userId]),
 ]);
 const allowed=meals.length ? await getRecommendations(userId,meals) : [];
 const result=pantry.map(item=>({
  id:`pantry:${item.id}:${item.expiry_date}:${item.days_left<0?'expired':'soon'}`,
  category:'pantry',title:item.days_left<0 ? `${item.name} đã hết hạn` : `${item.name} sắp hết hạn`,
  body:`${Number(item.quantity)} ${item.unit} · ${item.days_left<0 ? 'Hết hạn ngày '+item.expiry_date : item.days_left===0 ? 'Hết hạn hôm nay' : 'Còn '+item.days_left+' ngày'}`,
  occurredAt:`${item.days_left<0 ? item.expiry_date : item.event_date}T00:00:00`,
  route:'/ingredient-detail',params:{id:String(item.id)},action:'Kiểm tra nguyên liệu',
  urgent:item.days_left>=0 && item.days_left<=1,expired:item.days_left<0,
  secondaryRoute:item.days_left>=0 ? '/recipes' : null,secondaryParams:{search:item.name},secondaryAction:'Gợi ý món',
 }));
 const labels={BREAKFAST:'Bữa sáng',LUNCH:'Bữa trưa',DINNER:'Bữa tối'};
 const times={BREAKFAST:'07:00',LUNCH:'12:00',DINNER:'18:30'};
 for(const meal of allowed) {
  const type=String(meal.meal_type).toUpperCase(),time=times[type]||'12:00';
  result.push({id:`meal:${meal.plan_item_id}:${meal.meal_date}`,category:'meal',title:`${labels[type]||'Bữa ăn'}: ${meal.name}`,body:`${meal.meal_date} · ${time} · ${meal.servings} người`,occurredAt:`${meal.meal_date}T${time}:00`,route:'/recipe-detail',params:{id:String(meal.recipe_id),name:meal.name},action:'Xem công thức'});
 }
 for(const post of reactions) result.push({id:`social:${post.post_id}:${post.likes}`,category:'social',title:'Công thức của bạn được yêu thích',body:`${post.likes} người đã thích bài “${post.title}”.`,image:post.image_url,occurredAt:null,route:'/post-detail',params:{id:String(post.post_id)},action:'Xem bài viết'});
 const grouped=new Map();
 for(const item of purchases) {if(!grouped.has(item.shopping_list_id)) grouped.set(item.shopping_list_id,[]);grouped.get(item.shopping_list_id).push(item);}
 for(const [listId,items] of grouped) result.push({id:`shopping:${listId}:${items.map(i=>i.shopping_item_id).join('-')}`,category:'shopping',title:'Nguyên liệu đã mua đang chờ nhập kho',body:`${items.length} mục đã mua: ${items.map(i=>i.name).slice(0,3).join(', ')}${items.length>3?'…':''}.`,occurredAt:null,route:'/shopping-list',params:{},action:'Kiểm tra danh sách'});
 return result;
}
module.exports={getNotifications};
