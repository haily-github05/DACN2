# Bếp Thông Minh — Backend

API Express kết nối MySQL cho Mobile và Admin Web. Dịch vụ nhận diện ảnh dùng FastAPI và YOLO, chạy riêng.

Các lệnh dưới đây chạy tại thư mục `backend`.

## 1. Cấu hình MySQL

Tạo `.env` theo database hiện có:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=your_database
PORT=3000
```

## 2. Chạy API

```sh
npm install
npm run migrate
node scripts/migrate-admin-preferences.js
npm start
```

Migration bổ sung cấu trúc trên database hiện có, không tạo toàn bộ database từ đầu. Sao lưu trước khi cập nhật cấu trúc.

Migration cũng tạo bảng `ai_activity_logs` cho lượt nhận diện, gợi ý công thức, lập thực đơn, chat và lỗi phát sinh. Backend tự tạo khóa telemetry nội bộ trong `.ai-telemetry-secret`; dịch vụ Python dùng khóa này để báo lượt nhận diện, không cần đưa khóa xuống mobile.

Migration tạo `ai_content_reviews` và trạng thái ẩn bình luận để phục vụ tab **Kiểm duyệt AI** trong trang Quản lý bài đăng cộng đồng. Đặt `GEMINI_API_KEY` như hướng dẫn bên dưới để tự phân tích bài đăng, bình luận và công thức cộng đồng mới. Sau migration, Admin có thể bấm **Phân tích nội dung mới** để đưa các bài đăng công khai đang chờ duyệt và bình luận công khai cũ vào hàng đợi. Risk Score và AI Confidence là kết quả mô hình; Trust Score là điểm dẫn xuất từ tuổi tài khoản, bài đã duyệt và vi phạm trước đó. Admin luôn quyết định xử lý cuối cùng.

Kiểm tra: `http://localhost:3000/api/health`.

Admin Web yêu cầu tài khoản có `users.role = 'ADMIN'` và đang hoạt động. Đăng nhập bằng email hoặc số điện thoại cùng mật khẩu tài khoản.

## 3. Chạy dịch vụ AI

Đặt model đã train tại `model/best.pt`, sau đó:

```sh
python3 -m pip install fastapi uvicorn ultralytics python-multipart pillow
python3 -m uvicorn src.ai_service.app:app --host 0.0.0.0 --port 8000
```

Giữ terminal AI chạy riêng với API Node.js. Để khởi động lại, nhấn **Ctrl + C** rồi chạy lại lệnh `python3 -m uvicorn ...` ở trên.

- Kiểm tra AI: `http://localhost:8000/health`.
- Thử nhận diện: mở `http://localhost:8000/docs` → **POST /predict → Try it out** → chọn ảnh → **Execute**.
- Tên tiếng Việt được ánh xạ trong `src/ai_service/ingredient_labels_vi.json`. Khởi động lại AI sau khi sửa file; không cần train lại chỉ để đổi tên hiển thị.

## 4. Kết nối Mobile

Trong `mobile/.env`, thay `IP_MAY_TINH` bằng IP hiện tại của máy chạy backend:

```env
EXPO_PUBLIC_API_URL=http://IP_MAY_TINH:3000
EXPO_PUBLIC_AI_URL=http://IP_MAY_TINH:8000
```

Điện thoại và máy tính cần truy cập được cùng mạng. Không dùng `localhost` trên điện thoại. Trên Mac, xem IP Wi-Fi bằng `ipconfig getifaddr en0`.

Khởi động lại Expo sau khi sửa `.env`. Khi đổi mạng, kiểm tra lại IP. Nếu không kết nối được AI, thử mở `http://IP_MAY_TINH:8000/health` trên điện thoại.

## 5. Kiểm tra

```sh
npm test
npm run test:smoke
```

Smoke test cần MySQL và ít nhất một tài khoản hiện có.

## Chat với Gemini

Thêm cấu hình vào `backend/.env` (API key chỉ lưu ở backend):

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-flash-latest
```

Dừng backend bằng **Ctrl + C**, chạy lại `npm start`, rồi đăng nhập trên app và mở trợ lý AI. Chat gọi `/api/chat` trên API Node.js cổng 3000, không dùng dịch vụ nhận diện cổng 8000. Nếu cần model dự phòng, đặt thêm `GEMINI_FALLBACK_MODEL` bằng tên model được project của bạn hỗ trợ.

### Lập thực đơn bằng Gemini

Chat ở trang chủ và lập thực đơn đều sử dụng Gemini với `GEMINI_API_KEY`
và `GEMINI_MODEL`. Có thể đặt `GEMINI_MEAL_PLAN_MODEL` riêng cho thực đơn.

Nút **Tạo thực đơn AI** gọi `POST /api/kitchen/:userId/plans/generate`
với `{ "dates": ["2026-11-12"], "people": 4 }` (tối đa 7 ngày,
1–20 người, cần Bearer token). Gemini nhận công thức đã lọc dị ứng (tối đa
200 món), khẩu vị và nguyên liệu còn hạn. Backend kiểm tra ngày, ID và
món trùng; mobile lưu thực đơn bằng API hiện có và kiểm tra lại dị ứng khi lưu.

Khi model chính lỗi dịch vụ hoặc mất kết nối, hệ thống chuyển sang
`GEMINI_MEAL_PLAN_FALLBACK_MODEL`, hoặc `GEMINI_FALLBACK_MODEL` nếu có;
mặc định là `gemini-3.5-flash-lite`. Tối đa 3 lần gọi trong 75 giây.
Nếu Gemini vẫn quá tải, ứng dụng báo lỗi và giữ thực đơn đã lưu.
Thêm/đổi từng món sử dụng bộ chọn theo luật hiện có.

Khởi động lại backend sau khi thay đổi cấu hình.
