# Bếp Thông Minh — Admin Web

React + TypeScript + Vite. Trang Tổng quan lấy dữ liệu từ MySQL qua backend Express; trình duyệt không chứa thông tin đăng nhập database.

## Chạy ứng dụng

```sh
# Terminal 1, tại thư mục gốc monorepo
cd backend
npm install
npm start

# Terminal 2, tại thư mục gốc monorepo
cd admin-web
npm install
npm run dev
```

Vite chuyển tiếp `/api` và `/uploads` đến `http://127.0.0.1:3000`. Nếu backend dùng địa chỉ khác, sao chép `.env.example` thành `.env.local`, cấu hình `VITE_API_URL` rồi khởi động lại Vite. Khi triển khai, cấu hình reverse proxy tương ứng hoặc đặt `VITE_API_URL` lúc build; chỉ đưa biến công khai vào frontend.

## Đăng nhập và phân quyền

Đăng nhập bằng số điện thoại và mật khẩu hiện có trong bảng `users`. Backend xác thực token rồi đọc cột `users.role` trên từng yêu cầu. Chỉ `ADMIN` được truy cập các API quản trị hiện tại. `USER` dùng ứng dụng; `MODERATOR` dành cho luồng kiểm duyệt riêng trong tương lai, hiện chưa có quyền truy cập các API Tổng quan/tìm kiếm quản trị.

Chạy `npm run migrate` trong backend để thêm cột role (mặc định USER). Tài khoản đăng ký mới luôn được gán USER ở backend, không nhận vai trò do client gửi lên. Cấp quyền qua MySQL bằng tài khoản quản lý database:

```sql
UPDATE users SET role = 'ADMIN' WHERE user_id = 3;
-- Đổi về người dùng thông thường:
-- UPDATE users SET role = 'USER' WHERE user_id = 3;
```

Đổi role có hiệu lực ở yêu cầu API tiếp theo, không cần tạo token mới. Khởi động lại backend sau khi cập nhật code lần đầu. Cấu hình ADMIN_USER_IDS cũ không còn được dùng. Script `node scripts/migrate-user-roles.js --import-legacy-admins` chỉ phục vụ chuyển đổi có chủ đích từ cấu hình cũ; không chạy lại sau khi đã đổi quyền trong MySQL.

Phiên frontend được giữ trong sessionStorage của tab; đăng xuất xoá phiên trên trình duyệt. Token hiện dùng cơ chế có sẵn của backend, chưa có API thu hồi token phía server.

## Dữ liệu Tổng quan

- Tổng người dùng, công thức hoạt động, danh mục nguyên liệu, bài viết + bình luận, lượt hoàn thành nấu. Ghi chú bên dưới là số phát sinh trong 7/30/90 ngày, không phải phần trăm tăng trưởng.
- Biểu đồ người dùng mới và lượt hoàn thành nấu theo ngày. Ngày không có bản ghi hiển thị 0. Khoảng ngày dùng lịch của MySQL.
- Top 5 nhóm công thức đang hoạt động dựa trên `cuisine_type`, dự phòng bằng `region`; giá trị trống được nhóm vào Chưa phân loại. Tỷ lệ tính trên toàn bộ công thức hoạt động, không phải độ phổ biến.
- Tối đa 100 công thức mới nhất, tìm kiếm/lọc/phân trang trong danh sách đã tải, xem chi tiết ở chế độ chỉ đọc.
- 10 hoạt động mới nhất lấy từ đăng ký tài khoản, thêm công thức, bài đăng công khai và lịch sử nấu. Đây không phải audit log hoặc dữ liệu realtime; bấm Làm mới để tải lại.
- Báo cáo CSV xuất từ số liệu đang hiển thị.
- Chưa có nguồn thống kê AI trong database: trạng thái AI là Chưa cấu hình, không hiển thị độ chính xác hoặc lượt quét giả.

Khi tải lỗi, ứng dụng hiện thông báo và nút thử lại, không thay thế bằng dữ liệu mẫu. Không thay đổi schema MySQL, bài viết hoặc dữ liệu mobile.

## Cấu trúc

- `src/App.tsx`: khung ứng dụng, phiên đăng nhập và tải dữ liệu.
- `src/components/Sidebar.tsx`: thanh bên dùng chung.
- `src/pages/TongQuan.tsx`: trang Tổng quan.
- `src/lib/adminApi.ts`: HTTP client, kiểu dữ liệu và quản lý phiên.
- `src/components/AdminLogin.tsx`: đăng nhập.
- `src/components/Modal.tsx`: hộp thoại dùng chung.

Các mục menu khác đang chờ xây dựng, chưa có CRUD riêng.

## Kiểm tra

```sh
npm run lint
npm run typecheck
npm run build
```

Backend có kiểm thử quyền admin, dữ liệu Tổng quan, khoảng ngày và xử lý lỗi trong `backend/tests/adminOverview.test.js`; chạy bằng `npm test` trong backend.

## Tìm kiếm quản trị

Ô trên thanh đầu trang tìm toàn bộ bảng `recipes`, `ingredients`, `users` qua API `/api/admin/search`, yêu cầu quyền admin. Nhập từ khoá và nhấn Enter hoặc biểu tượng kính lúp. Kết quả chia nhóm, lọc theo loại và phân trang (20 bản ghi mỗi nhóm/trang), bấm bản ghi để xem thông tin. Tìm theo tên, mô tả/danh mục công thức, tên/danh mục nguyên liệu, tên/số điện thoại/email người dùng và mã bản ghi. Hỗ trợ tiếng Việt có/không dấu, nhiều từ khoá; ký tự `%`, `_` được tìm như ký tự thường. Tối đa 100 ký tự. Trong hộp kết quả, tìm tự động sau 300ms và huỷ yêu cầu cũ khi đổi từ khoá. Không trả mật khẩu hoặc token người dùng.

Ô lọc ở bảng công thức chỉ lọc danh sách đã tải, độc lập với tìm kiếm toàn hệ thống.

## Duyệt bài và chuông thông báo

Menu **Bài đăng cộng đồng & Bình luận** hiện có trang `src/pages/BaiDangCongDong.tsx`: lọc Chờ duyệt/Đã duyệt/Từ chối, phân trang, xem đầy đủ bài và ảnh đính kèm, duyệt hoặc từ chối với lý do. Các API này chỉ dành cho ADMIN. Chỉ bài công khai vào hàng chờ; bài cá nhân không hiển thị cho admin ở luồng này. Bài chưa duyệt/từ chối chỉ chủ bài xem được trên mobile.

Chuông lấy thông báo thật từ các bài công khai đang PENDING. Số trên chuông là số bài chưa đọc của admin đang đăng nhập; trạng thái đọc được lưu trong bảng `admin_post_reads`. Bấm thông báo đánh dấu đã đọc rồi mở bài; Đọc tất cả không duyệt bài. Thông báo biến mất khi bài được duyệt, từ chối hoặc xoá. Hộp chuông hiển thị tối đa 20 bài (ưu tiên chưa đọc); có thể mở danh sách để xem thêm. Chuông làm mới mỗi 30 giây khi tab hiển thị, khi quay lại cửa sổ, khi mở chuông và sau khi duyệt; chưa dùng push notification.

Migration: `npm run migrate` trong backend, hoặc `node scripts/migrate-post-moderation.js`. Các bài cũ đã xuất bản giữ trạng thái APPROVED để không đột ngột biến mất; không tự gán người duyệt cho các bài cũ. Mọi bài mới luôn được server lưu PENDING, bỏ qua trạng thái duyệt do client gửi lên. Không có chức năng sửa/gửi duyệt lại bài bị từ chối ở phiên bản này.

Kiểm tra luồng HTTP/MySQL thật với `node scripts/verify-post-moderation.js` trong backend: cần có tài khoản ADMIN và USER, dùng transaction rồi rollback mọi dữ liệu thử.

### Giao diện quản lý bài đăng

Trang cộng đồng dùng ba thẻ thống kê thật (Tổng bài đăng, Chờ duyệt, Bị từ chối), tìm kiếm phía server theo bài/tác giả/hashtag, lọc trạng thái và chuyên mục, bảng gọn có ảnh, tác giả và phân trang 10 bài. Chọn các hàng để xuất CSV hoặc xuất các bài ở trang hiện tại (mở bằng Excel). Tạo bài mới trên admin dùng tài khoản admin hiện tại, vẫn gửi vào hàng chờ duyệt, chưa có tải ảnh trong form tạo nhanh này. Không hiển thị số báo cáo vi phạm, liên kết IoT hoặc tài khoản mạng xã hội giả.

### Thao tác nhanh và lọc ngày

Mỗi dòng bài đăng có Xem; Duyệt khi đang PENDING; Ẩn khi đã APPROVED; Hiện lại khi HIDDEN; Xóa có hộp xác nhận. Ẩn không xóa dữ liệu và bài không còn công khai. Hiện lại chỉ áp dụng cho bài đã ẩn, không thể dùng để bỏ qua duyệt bài đang chờ/từ chối. Xóa xoá bản ghi bài cùng bình luận, lượt thích/lưu và trạng thái đọc liên quan qua khoá ngoại. Ảnh tải lên không được dọn khỏi ổ đĩa trong luồng này.

Bộ lọc ngày đăng: tất cả thời gian, 7/30/90 ngày qua, bao gồm ngày hiện tại theo lịch MySQL. Kết hợp được với từ khoá, chuyên mục và trạng thái (ALL/PENDING/APPROVED/REJECTED/HIDDEN). Các thẻ thống kê vẫn là tổng toàn bộ bài công khai; bộ lọc áp dụng cho bảng và số kết quả/phân trang. Chạy `npm run migrate` hoặc `node scripts/migrate-post-moderation.js` trong backend để bổ sung HIDDEN.

Danh mục khi tạo bài dùng danh sách chọn thay cho ô gợi ý datalist, gồm 14 nhóm dùng chung với mobile và các danh mục cũ đã tồn tại. Bài chờ/từ chối không xuất hiện trên bảng tin cộng đồng của cả chủ bài; chủ bài xem trạng thái trong Bài của tôi và nhận thông báo trong app kèm lý do khi bị từ chối.

## Quản lý người dùng

Menu Quản lý người dùng mở `src/pages/QuanLyNguoiDung.tsx`: thống kê tổng tài khoản/bị khóa, tìm theo tên/email/số điện thoại/mã, lọc vai trò và trạng thái, phân trang 10 tài khoản, xuất CSV cho các tài khoản đã chọn hoặc trang hiện tại. Chọn một hàng để mở chi tiết, thông tin liên hệ, số bài đăng/lượt nấu/mục trong kho/bình luận, vai trò và trạng thái tài khoản.

Admin có thể tạo tài khoản bằng tên, số điện thoại, email tùy chọn, mật khẩu ban đầu và vai trò; đổi vai trò; khóa/mở khóa từng tài khoản hoặc nhóm đã chọn. Các thao tác quản trị có xác nhận. Không được tự khóa/hạ quyền; backend khóa các bản ghi quản trị trong transaction và giữ ít nhất một admin hoạt động. Thao tác hàng loạt chạy tuần tự; lỗi một mục sẽ dừng và thông báo phần đã hoàn thành.

Khóa tài khoản chặn đăng nhập mới, token cũ trên API và tài nguyên ảnh bài riêng. `last_login_at` chỉ được ghi từ khi triển khai chức năng, tài khoản chưa đăng nhập lại hiển thị Chưa có thời gian. Không có dữ liệu gói VIP, thiết bị IoT, điểm AI hoặc xác minh email nên giao diện không giả lập các chỉ số/tính năng đó.

Chạy `node scripts/migrate-user-management.js` hoặc `npm run migrate` trong backend để thêm `users.is_active` (mặc định 1), `locked_reason` và `last_login_at`. Khởi động lại backend sau khi cập nhật. Script `node scripts/verify-user-management.js` kiểm tra HTTP + MySQL thật bằng tài khoản tạm, dùng savepoint/transaction và rollback sau khi kiểm tra.

## Quản lý nguyên liệu

Menu Quản lý nguyên liệu & AI Vision mở `src/pages/QuanLyNguyenLieu.tsx`, dùng API `/api/admin/ingredients` và bảng `ingredients` thật. Có bốn thẻ thống kê (nguyên liệu, nhóm phân loại, đơn vị, tỷ lệ đã khai báo kiểu bảo quản); tìm tên/mã có hoặc không dấu; lọc danh mục/đơn vị/bảo quản; phân trang 10/20/50; bảng hoặc thẻ; thêm/sửa, tải ảnh, sửa danh mục/bảo quản hàng loạt; xuất CSV cho trang hiện tại hoặc mục đã chọn. Các tab Danh mục, Đơn vị tính và Kiểu bảo quản tổng hợp dữ liệu thực, chọn một nhóm để quay về danh sách đã lọc.

Ảnh JPEG/PNG/WebP tối đa 5 MB, lưu tại backend/uploads/ingredients; có thể dùng URL HTTP(S). Form sửa đơn vị chỉ thay `default_unit`, không tự chuyển đổi số lượng/đơn vị đã lưu trong công thức, kho hoặc mua sắm.

Xóa có xác nhận. Backend dùng transaction và chặn xóa khi nguyên liệu đang được tham chiếu bởi recipe_ingredients, pantry_items hoặc shopping_list_items; xóa hàng loạt thất bại toàn bộ nếu bất kỳ mục nào còn được dùng. Không tự xóa dữ liệu liên quan hoặc dọn ảnh tải lên của nguyên liệu đã xóa.

Schema hiện chưa có hạn bảo quản theo nhiệt độ, độ nhạy ethylene hay dinh dưỡng, nên không hiển thị các số liệu đó như thông tin đã kiểm định. Chưa có nhập file Excel hoặc quy đổi đơn vị tự động. CSV xuất được mở bằng Excel. Trang này không thay đổi schema MySQL.

Kiểm thử thật: `node scripts/verify-ingredient-management.js` trong backend, dùng transaction và dọn đúng ảnh thử sau kiểm tra.

## Trang tạm rà soát ảnh nguyên liệu

Menu **Rà soát ảnh nguyên liệu (tạm)** mở `src/pages/RaSoatAnhNguyenLieu.tsx`. Ảnh được hiển thị lớn theo tên A–Z, 20/50 mục mỗi trang, có tìm kiếm và lọc danh mục. Bấm ảnh để xem lớn, bấm Thay ảnh để so ảnh cũ/mới và tải JPEG/PNG/WebP ≤5 MB hoặc dùng URL khác. Chỉ khi bấm Lưu ảnh mới cập nhật database.

Trang sử dụng PATCH `/api/admin/ingredients/:ingredientId/image`, chỉ cho phép `image` và `previousImage`; SQL chỉ SET image_url, không ghi tên/danh mục/đơn vị. Ảnh cũ phải khớp lúc đọc để không ghi đè thay đổi mới của người khác. Có hoàn tác lần thay ảnh gần nhất trong phiên trang, ảnh cũ vẫn được giữ trên ổ đĩa. Dấu Ảnh đúng chỉ lưu trong sessionStorage riêng theo admin trong tab trình duyệt, không đánh dấu kiểm định vào database. Công cụ vẫn yêu cầu ADMIN dù là trang tạm.
