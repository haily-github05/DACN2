# Smart Kitchen AI – Bếp thông minh

Ứng dụng quản lý nguyên liệu, hạn sử dụng, công thức, thực đơn và danh sách mua sắm. Dự án gồm Mobile (Expo), API (Node.js + Express), database MySQL và dịch vụ AI nhận diện ảnh (Python, tùy chọn). Admin Web là phần tùy chọn.

## Chạy ứng dụng mỗi lần làm việc

### Chuẩn bị một lần

- Cài Node.js LTS, npm, Python 3 và MySQL.
- Cài dependencies trong từng thư mục (chỉ cần chạy lại sau khi cập nhật dependencies):

```bash
cd backend && npm install
cd ../mobile && npm install
cd ../admin-web && npm install
```

- Cấu hình `backend/.env` với thông tin MySQL (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`) và các API key cần dùng. Không chia sẻ file `.env`.
- Cấu hình `mobile/.env` để app truy cập backend. Trên điện thoại, thay IP máy tính cho `localhost`:

```env
EXPO_PUBLIC_API_URL=http://IP_MAY_TINH:3000
EXPO_PUBLIC_AI_URL=http://IP_MAY_TINH:8000
```

Lấy IP Wi-Fi trên Mac bằng `ipconfig getifaddr en0`. Chỉ cần `EXPO_PUBLIC_AI_URL` nếu dùng chức năng nhận diện ảnh.

### Mỗi lần chạy Mobile

Đảm bảo MySQL đang chạy, sau đó mở hai terminal tại thư mục dự án:

**Terminal 1 – API backend:**

```bash
cd backend
npm start
```

API mặc định chạy ở `http://localhost:3000`. Kiểm tra tại `http://localhost:3000/api/health`.

**Terminal 2 – ứng dụng Expo:**

```bash
cd mobile
npx expo start
```

Quét QR bằng Expo Go trên iPhone (cùng Wi-Fi với máy tính) hoặc nhấn `w` trong terminal để mở web. Nếu mạng nội bộ không kết nối được, thử `npx expo start --tunnel`.

Để dùng quét/nhận diện nguyên liệu, hãy khởi động thêm dịch vụ AI như phần bên dưới. Các chức năng khác không cần dịch vụ này.

### Mỗi lần chạy dịch vụ AI nhận diện (tùy chọn)

Model đã train phải có tại `backend/model/best.pt`. Cài thư viện Python một lần:

```bash
cd backend
python3 -m pip install fastapi uvicorn ultralytics python-multipart pillow
```

Mở terminal riêng và chạy:

```bash
cd backend
python3 -m uvicorn src.ai_service.app:app --host 0.0.0.0 --port 8000
```

Giữ terminal này mở trong khi dùng chức năng quét. Kiểm tra dịch vụ tại `http://localhost:8000/health`; tài liệu thử API ở `http://localhost:8000/docs`. Khi đổi `mobile/.env`, khởi động lại Expo để nạp cấu hình mới.

### Chạy Admin Web (tùy chọn)

Backend phải đang chạy. Mở terminal khác:

```bash
cd admin-web
npm run dev
```

Mở địa chỉ `Local` mà Vite in ra (thường là `http://localhost:5173`).

## Cài đặt database lần đầu

Tạo database MySQL và điền thông tin kết nối vào `backend/.env`. Với database đã có, chạy migration một lần sau khi cập nhật code/schema:

```bash
cd backend
npm run migrate
node scripts/migrate-admin-preferences.js
```

Migration cập nhật cấu trúc database hiện có, không tạo toàn bộ database từ đầu. Sao lưu database trước khi chạy migration.

## Web trên trình duyệt

Expo hỗ trợ chạy web bằng `npx expo start --web` trong thư mục `mobile`. Nếu báo thiếu gói web:

```bash
cd mobile
npx expo install react-native-web react-dom @expo/metro-runtime
npx expo start --web
```

Một số tính năng dựa vào camera, thông báo hoặc module native có thể khác trên web so với iPhone.

## Gỡ lỗi nhanh

- **App không gọi được backend:** xác nhận API và MySQL đang chạy; kiểm tra `EXPO_PUBLIC_API_URL`, IP máy tính và cùng mạng Wi-Fi. Không dùng `localhost` trên điện thoại.
- **Không gọi được AI:** chạy dịch vụ Python riêng, kiểm tra `EXPO_PUBLIC_AI_URL` và mở `http://IP_MAY_TINH:8000/health` trên điện thoại.
- **Thiếu thư viện sau khi cập nhật code:** chạy lại `npm install` trong đúng thư mục (`backend`, `mobile` hoặc `admin-web`).
- **Cổng đang được dùng:** dừng tiến trình cũ bằng `Ctrl + C` hoặc chọn cổng khác nếu công cụ đề nghị.

Để dừng một dịch vụ, quay lại terminal tương ứng và nhấn `Ctrl + C`.

**Repository:** https://github.com/haily-github05/DACN2
