# Kết nối MySQL cho Mobile

Backend đọc cấu hình `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` từ `backend/.env`. Dùng database hiện có với các bảng users, ingredients, pantry_items, recipes, recipe_ingredients, recipe_steps, meal_plans, meal_plan_items, shopping_lists, shopping_list_items và cooking_history.

```sh
cd backend
npm install
npm run migrate
npm start
```

Migration có thể chạy lại: bổ sung `pantry_items.note` nếu chưa có và tạo bảng bài viết, tương tác, món yêu thích. Không xóa dữ liệu hiện có.

Trong `mobile/.env`, đặt `EXPO_PUBLIC_API_URL=http://<IP-máy-chạy-backend>:3000` rồi khởi động lại Expo. Điện thoại cần truy cập được IP này; không dùng localhost trên điện thoại. Khi chạy Expo Go qua mạng LAN, ứng dụng cũng có thể tự lấy IP từ Metro nếu không cấu hình biến này.

Các màn hình đã nối:

- Kho, thêm/sửa/xóa/chi tiết nguyên liệu và lưu danh sách nguyên liệu đã xác nhận từ kết quả quét.
- Thực phẩm sắp hết hạn, danh mục trong kho và nhắc hạn sử dụng lấy từ kho thật.
- Khám phá, danh sách và chi tiết công thức lấy từ recipes, recipe_ingredients, recipe_steps. Kiểm tra nguyên liệu theo đúng đơn vị và loại trừ thực phẩm hết hạn.
- Món yêu thích lưu tại recipe_favorites.
- Thực đơn lấy công thức từ SQL, lưu các bữa theo ngày và tải lại khi mở màn hình.
- Danh sách mua sắm thêm/xóa/đánh dấu đã mua; chuyển đồ đã mua vào kho bằng một transaction. Đồ chuyển từ mua sắm hoặc kết quả quét chưa có hạn sử dụng; người dùng cập nhật tại kho.
- Cộng đồng: đăng/xem bài viết, thích và lưu bài; ảnh dùng URL HTTP(S).
- Hoàn thành nấu ăn lưu cooking_history; không tự trừ nguyên liệu.

Các chức năng AI nhận diện ảnh và trợ lý vẫn dùng logic mẫu. Dữ liệu cộng đồng mới bắt đầu trống; không tự tạo bài viết mẫu. Cột `recipes.calories` lưu kcal ước tính trên mỗi khẩu phần. Chi tiết món tính tổng kcal bằng calo mỗi khẩu phần nhân số người ăn; thực đơn cộng kcal cho một người. Món chưa có calo (`NULL`) hiển thị dấu “—”. Dữ liệu AsyncStorage cũ không tự nhập vào SQL. Admin Web không thuộc luồng Mobile này.

API `/api/kitchen/:userId/*` dùng cùng cơ chế định danh userId như các API có sẵn. Backend hiện chưa có xác thực bằng token; userId trên URL chưa phải một ranh giới phân quyền cho triển khai công khai.

Kiểm tra:

```sh
cd backend
npm test
npm run test:smoke
cd ../mobile
npm run typecheck
npm run lint
```

Smoke test cần MySQL và ít nhất một tài khoản. Chỉ đọc dữ liệu và gửi các yêu cầu đầu vào sai; không tạo nguyên liệu hay thay đổi thực đơn của người dùng.

## Lọc gợi ý theo thiết lập cá nhân

Không cần thêm bảng hoặc cột: service `src/services/recipeRecommendationService.js` đọc `users.allergies`, `users.disliked_ingredients` và nguyên liệu từ `recipe_ingredients`/`ingredients`. Hỗ trợ các lựa chọn hiện có trong màn hình khẩu vị, có hoặc không có emoji, dạng mảng JSON và chuỗi cũ.

- Loại khỏi gợi ý món có nguyên liệu khai báo khớp dị ứng, kể cả nguyên liệu tùy chọn.
- Nếu tài khoản có dị ứng, loại công thức chưa có nguyên liệu khai báo.
- Xếp món có nguyên liệu không thích sau các món khác. Khi tạo thực đơn, ưu tiên nhóm không chứa nguyên liệu không thích nếu có lựa chọn.
- Trang chủ, Khám phá, danh sách món và thực đơn dùng cùng bộ lọc. Thực đơn đã lưu có món bị loại sau khi đổi dị ứng sẽ được ẩn khỏi phản hồi API, không xóa dữ liệu SQL. Backend kiểm tra lại các món khi lưu thực đơn.
- Các màn hình tải lại khi quay về để nhận thiết lập mới.

Đây là đối chiếu tên nguyên liệu và nhóm bí danh trong code; không khẳng định an toàn dị ứng. Công thức có một số nguyên liệu khai báo vẫn có thể thiếu thành phần gia vị, nước sốt hoặc thông tin tiếp xúc chéo. Cần duy trì dữ liệu công thức đầy đủ và mở rộng các bí danh khi thêm nguyên liệu mới. Tùy chọn “Tỏi sống” được đối chiếu với mọi nguyên liệu tỏi vì dữ liệu hiện chưa ghi trạng thái chế biến.

## Luồng nấu ăn

Chọn khẩu phần tại chi tiết công thức → Bắt đầu nấu ăn → trang hướng dẫn riêng với nguyên liệu theo khẩu phần và các bước có thể đánh dấu → hoàn thành đủ bước → xác nhận lưu lịch sử. Món chưa có bước chế biến không thể bắt đầu. Trang xác nhận hiển thị số người ăn và tổng calo, báo kết quả lưu hoặc cho thử lại khi lỗi. Lưu lịch sử không tự trừ kho. Tiến độ bước nấu hiện chỉ giữ trong phiên màn hình, chưa khôi phục khi đóng ứng dụng.

## Trang đăng bài cộng đồng

Trang soạn bài có ảnh bìa chọn từ thư viện, loại bài công thức/mẹo, mô tả, hashtag, thời gian, khẩu phần, độ khó, dinh dưỡng tự nhập, nguyên liệu và các bước nấu. Lưu nháp lưu trên thiết bị theo từng tài khoản; nội dung công thức được định dạng vào `community_posts.description` để tương thích cấu trúc hiện có. Bài viết có thể chọn Công khai hoặc Chỉ mình tôi, chưa tự tạo bản ghi recipes hoặc chuyển vào thực đơn.

Ảnh bìa tải qua `POST /api/kitchen/:userId/posts/image`, lưu tại `backend/uploads/posts`; tối đa 5 MB, JPEG/PNG/WebP. Nút kiểm tra nội dung chỉ kiểm tra các trường cần điền, chưa kết nối AI sinh công thức hoặc tính dinh dưỡng tự động.


## Chế độ hiển thị bài viết

Chạy `npm run migrate` để bổ sung `community_posts.visibility` (PUBLIC/PRIVATE); bài cũ mặc định PUBLIC. Bài cá nhân chỉ được trả về cho chủ bài đã xác thực, kể cả khi truy cập trực tiếp ID bài hoặc ảnh nội bộ. Bộ đếm Đã chia sẻ chỉ tính bài PUBLIC. Chủ bài vẫn thấy bài PRIVATE của mình trong danh sách cộng đồng, với biểu tượng khóa.

Đăng nhập/đăng ký cấp token 30 ngày cho API bài viết và tải ảnh. Các phiên cũ cần đăng xuất rồi đăng nhập lại sau khi cập nhật. Khóa ký lấy từ AUTH_SECRET hoặc được tạo trong backend/.session-secret (đã bỏ qua bằng .gitignore); giữ file này để phiên không bị mất sau khi khởi động lại. Các API cũ ngoài bài viết vẫn giữ cơ chế định danh trước đây.

## Trang Hoạt động của tôi

Bấm các ô Món đã nấu / Đã lưu / Đã chia sẻ trên trang Cá nhân hoặc các menu Lịch sử nấu ăn, Bộ sưu tập đã lưu để mở `/my-activity`. API `GET /api/kitchen/:userId/activity` yêu cầu phiên đăng nhập đúng chủ tài khoản.

Đã nấu nhóm theo món, có số lượt nấu và ngày nấu gần nhất. Đã lưu bao gồm công thức yêu thích và bài viết đã lưu còn quyền xem, hỗ trợ bỏ lưu. Bài của tôi có hai bộ lọc Công khai và Chỉ mình tôi. Các danh sách tải lại khi quay về màn hình và hỗ trợ kéo để làm mới. Số Đã lưu trên hồ sơ tính cả công thức và bài viết; Đã chia sẻ chỉ tính bài công khai.

## Trung tâm thông báo

API `GET /api/kitchen/:userId/notifications` yêu cầu phiên đăng nhập, tổng hợp thực phẩm còn số lượng và hết hạn trong 3 ngày hoặc đã hết hạn, bữa ăn đã lên lịch hôm nay/ngày mai, lượt thích thật từ người khác và đồ đã mua chưa nhập kho. Lịch ăn được đối chiếu thiết lập dị ứng. Không tạo đơn hàng, bình luận hay gợi ý AI giả.

Trang Thông báo có bộ lọc danh mục/chưa đọc, cảnh báo ưu tiên trong 1 ngày, đánh dấu đã đọc, đọc tất cả và kéo làm mới. Các nút mở chi tiết nguyên liệu, công thức, bài viết hoặc danh sách mua sắm. Chấm chưa đọc trên header dùng cùng nguồn dữ liệu, không còn số mẫu. Trạng thái đọc lưu qua AsyncStorage theo tài khoản trên từng thiết bị, chưa đồng bộ giữa các thiết bị; thông báo hiện chỉ trong ứng dụng, chưa có push notification nền. Các nguồn không lưu thời điểm tương tác hiển thị “Mới cập nhật” thay vì thời gian giả.

## Tìm kiếm trên Mobile

Các ô tìm kiếm dùng chung `mobile/components/SearchField.tsx` và quy tắc `mobile/lib/search.ts`: hỗ trợ tiếng Việt có/không dấu, không phân biệt hoa thường, chuẩn hóa khoảng trắng và tìm nhiều từ khóa trên dữ liệu đang hiển thị. Trang chủ chuyển từ khóa sang Công thức; danh sách Công thức cập nhật đúng khi nhận từ khóa mới. Công thức/Khám phá tìm theo tên, mô tả và nguyên liệu; Cộng đồng tìm theo tiêu đề, tác giả, nội dung và hashtag. Kho có thêm lựa chọn Tất cả vị trí; tìm kiếm kết hợp với bộ lọc. Hoạt động cá nhân hỗ trợ tên món/bài, tác giả và ghi chú lịch sử nấu.

Kiểm tra quy tắc tìm kiếm bằng `node --test mobile/tests/search.test.cjs` từ thư mục gốc dự án.

### Phân biệt danh mục nguyên liệu và kho

API `GET /api/kitchen/:userId/ingredients` trả toàn bộ danh mục `ingredients`, kèm trạng thái có trong kho đúng tài khoản. Tìm từ Trang chủ/Công thức, Khám phá hoặc Kho hiển thị thêm kết quả danh mục, kể cả khi nguyên liệu chưa nhập kho hoặc chưa có công thức liên quan. Trang Danh mục nguyên liệu cũng dùng nguồn này. Bấm Thêm vào kho sẽ điền tên, nhóm, đơn vị và giữ ingredient_id gốc khi lưu; người dùng nhập số lượng và hạn sử dụng trước khi xác nhận. Không tự tạo số lượng trong kho từ danh mục.

## Ảnh nguyên liệu thủ công

Trang Thêm nguyên liệu hỗ trợ chọn ảnh từ thư viện hoặc chụp mới, xem trước và bỏ ảnh. Ảnh tùy chọn được tải bằng POST /api/kitchen/:userId/pantry/image (phiên đăng nhập, tối đa 5 MB, JPEG/PNG/WebP), lưu tại uploads/pantry và liên kết qua pantry_items.image_url. Không chọn ảnh thì dùng ảnh danh mục nếu có. Các ngày nhập nhận YYYY-MM-DD hoặc DD/MM/YYYY rồi chuẩn hóa trước khi gửi API. Lỗi lưu được hiển thị theo phản hồi thực tế.

Kiểm tra hồi quy đầy đủ với node scripts/verify-pantry-flow.js trong backend: tạo dữ liệu thử có tên riêng, tải ảnh, lưu, đọc xác nhận rồi dọn đúng dữ liệu/ảnh thử. Script check-pantry-save.js kiểm tra SQL và rollback trước khi commit.
